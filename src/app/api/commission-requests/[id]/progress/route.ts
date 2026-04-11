import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from '@prisma/client'
import { validateAttachmentUrls } from "@/lib/cloudinary";
import { sendProgressUpdateToClient } from "@/lib/email";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ProgressUpdate {
  id: string;
  message: string;
  photos: string[];
  timestamp: string;
  designerName: string;
}

/**
 * GET - Get all progress updates for a commission request
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id } = await params;
    
    const commission = await prisma.commissionRequest.findUnique({
      where: { id },
      select: {
        id: true,
        requesterId: true,
        designerId: true,
        progressUpdates: true,
        title: true,
        status: true
      }
    });
    
    if (!commission) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 });
    }
    
    // Only client or designer can view progress updates
    const isClient = commission.requesterId === session.user.id;
    const isDesigner = commission.designerId === session.user.id;
    
    if (!isClient && !isDesigner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    return NextResponse.json({
      progressUpdates: commission.progressUpdates || [],
      commissionTitle: commission.title,
      status: commission.status
    });
  } catch (error) {
    console.error("Error fetching progress updates:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress updates" },
      { status: 500 }
    );
  }
}

/**
 * POST - Designer posts a new progress update
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await request.json();
    const { message, photos } = body;
    
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Validate photo URLs
    const photoValidation = validateAttachmentUrls(photos);
    if (!photoValidation.valid) {
      return NextResponse.json(
        { error: photoValidation.error },
        { status: 400 }
      );
    }
    
    const commission = await prisma.commissionRequest.findUnique({
      where: { id },
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        },
        designer: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    if (!commission) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 });
    }
    
    // Only designer can post progress updates
    if (commission.designerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the designer can post progress updates" },
        { status: 403 }
      );
    }
    
    // Can only update progress during active work
    const updatableStatuses = ["IN_PROGRESS", "REVISION"];
    
    if (!updatableStatuses.includes(commission.status)) {
      return NextResponse.json(
        { error: "Can only post progress updates when work is in progress" },
        { status: 400 }
      );
    }

    // Rate limiting: Max 5 progress updates per day
    const existingUpdates = (commission.progressUpdates || []) as unknown as ProgressUpdate[];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentUpdates = existingUpdates.filter(
      (update: ProgressUpdate) => update.timestamp > oneDayAgo
    );
    
    if (recentUpdates.length >= 5) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 5 progress updates per day." },
        { status: 429 }
      );
    }
    
    const newUpdate: ProgressUpdate = {
      id: `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: message.trim(),
      photos: photos || [],
      timestamp: new Date().toISOString(),
      designerName: commission.designer.name || "Designer"
    };
    
    const updatedProgressUpdates = [...existingUpdates, newUpdate];
    
    await prisma.commissionRequest.update({
      where: { id },
      data: { progressUpdates: updatedProgressUpdates as unknown as Prisma.InputJsonValue[] }
    });
    
    // Send email notification to client
    try {
      if (commission.requester.email) {
        await sendProgressUpdateToClient({
          email: commission.requester.email,
          clientName: commission.requester.name || "Client",
          designerName: commission.designer.name || "Designer",
          commissionTitle: commission.title,
          commissionId: commission.id,
          updateMessage: message.trim(),
          hasPhotos: (photos && photos.length > 0) || false
        });
      }
    } catch (emailError) {
      console.error("Failed to send progress update notification:", emailError);
    }
    
    // Create in-app notification
    await prisma.notification.create({
      data: {
        userId: commission.requesterId,
        type: "COMMISSION_PROGRESS",
        title: `Progress update: ${commission.title}`,
        message: message.substring(0, 100) + (message.length > 100 ? "..." : ""),
        data: {
          commissionId: commission.id,
          updateId: newUpdate.id,
          hasPhotos: (photos && photos.length > 0) || false
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      progressUpdate: newUpdate
    });
  } catch (error) {
    console.error("Error posting progress update:", error);
    return NextResponse.json(
      { error: "Failed to post progress update" },
      { status: 500 }
    );
  }
}
