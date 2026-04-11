import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateAttachmentUrls } from "@/lib/cloudinary";
import { filterMessageContent, getViolationSummary } from "@/lib/content-filter";
import { 
  sendNewMessageToClient, 
  sendNewMessageToDesigner 
} from "@/lib/email";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "CLIENT" | "DESIGNER";
  message: string;
  attachments?: string[];
  timestamp: string;
  readAt?: string;
}

/**
 * GET - Get all messages for a commission request
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
        messages: true,
        title: true
      }
    });
    
    if (!commission) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 });
    }
    
    // Only client or designer can view messages
    const isClient = commission.requesterId === session.user.id;
    const isDesigner = commission.designerId === session.user.id;
    
    if (!isClient && !isDesigner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Mark messages as read for the viewer
    const messages = (commission.messages || []) as unknown as Message[];
    const myRole = isClient ? "CLIENT" : "DESIGNER";
    
    // Update read status for messages from the other party
    const updatedMessages = messages.map((msg: Message) => {
      if (msg.senderRole !== myRole && !msg.readAt) {
        return { ...msg, readAt: new Date().toISOString() };
      }
      return msg;
    });
    
    // Check if any messages were updated
    const hasUnreadUpdates = messages.some((msg: Message, i: number) => 
      msg.readAt !== updatedMessages[i].readAt
    );
    
    if (hasUnreadUpdates) {
      await prisma.commissionRequest.update({
        where: { id },
        data: { messages: updatedMessages as any }
      });
    }
    
    return NextResponse.json({
      messages: updatedMessages,
      commissionTitle: commission.title
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

/**
 * POST - Send a new message in a commission request
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
    const { message, attachments } = body;
    
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Input length validation
    if (message.length > 5000) {
      return NextResponse.json(
        { error: "Message must be 5,000 characters or less" },
        { status: 400 }
      );
    }

    // Validate attachment URLs
    const attachmentValidation = validateAttachmentUrls(attachments);
    if (!attachmentValidation.valid) {
      return NextResponse.json(
        { error: attachmentValidation.error },
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
    
    // Only client or designer can send messages
    const isClient = commission.requesterId === session.user.id;
    const isDesigner = commission.designerId === session.user.id;
    
    if (!isClient && !isDesigner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Can only message during active commission (not pending, not completed)
    const messageableStatuses = [
      "FORWARDED", "QUOTED", "PAID", "IN_PROGRESS", 
      "DELIVERED", "REVISION", "DISPUTED"
    ];
    
    if (!messageableStatuses.includes(commission.status)) {
      return NextResponse.json(
        { error: "Cannot send messages for this commission status" },
        { status: 400 }
      );
    }

    // Rate limiting: Max 10 messages per user per hour per commission
    const existingMessages = (commission.messages || []) as unknown as Message[];
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentMessagesByUser = existingMessages.filter(
      (msg: Message) => msg.senderId === session.user.id && msg.timestamp > oneHourAgo
    );
    
    if (recentMessagesByUser.length >= 10) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before sending more messages." },
        { status: 429 }
      );
    }

    // CONTENT FILTERING: Detect and redact contact information
    const filterResult = filterMessageContent(message);
    
    // Log violations for admin review
    if (!filterResult.isClean) {
      console.log(`[Content Filter] Violations detected from user ${session.user.id}:`, 
        getViolationSummary(filterResult.violations));
      
      // Store violation summary for admin review (GDPR data minimization)
      // We only store: violation types, counts, and masked detected values
      // NOT the full original message content
      for (const violation of filterResult.violations) {
        try {
          // Mask the detected value (show first 2 and last 2 chars only)
          const masked = violation.original.length > 6
            ? `${violation.original.slice(0, 2)}***${violation.original.slice(-2)}`
            : "***";
          
          await prisma.contentViolation.create({
            data: {
              userId: session.user.id,
              userEmail: session.user.email || null,
              userRole: isClient ? "CLIENT" : "DESIGNER",
              commissionId: id,
              commissionTitle: commission.title,
              violationType: violation.type,
              // Store only that a violation occurred, not the full content
              originalContent: `[${violation.type} violation detected at position ${violation.position}]`,
              detectedValue: masked,
            },
          });
        } catch (logError) {
          console.error("Failed to log content violation:", logError);
        }
      }
    }
    
    const senderRole = isClient ? "CLIENT" : "DESIGNER";
    const senderName = isClient 
      ? (commission.requester.name || "Client")
      : (commission.designer.name || "Designer");
    
    // Use filtered content if violations were found
    const finalMessage = filterResult.filteredContent.trim();
    
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderId: session.user.id,
      senderName,
      senderRole,
      message: finalMessage,
      attachments: attachments || [],
      timestamp: new Date().toISOString()
    };
    
    const updatedMessages = [...existingMessages, newMessage];
    
    await prisma.commissionRequest.update({
      where: { id },
      data: { messages: updatedMessages as any }
    });
    
    // Send email notification to the other party
    try {
      // Use filtered message for email preview to prevent leaking redacted content
      const safePreview = finalMessage.substring(0, 200);
      
      if (isClient && commission.designer.email) {
        await sendNewMessageToDesigner({
          email: commission.designer.email,
          designerName: commission.designer.name || "Designer",
          clientName: senderName,
          commissionTitle: commission.title,
          commissionId: commission.id,
          messagePreview: safePreview
        });
      } else if (isDesigner && commission.requester.email) {
        await sendNewMessageToClient({
          email: commission.requester.email,
          clientName: commission.requester.name || "Client",
          designerName: senderName,
          commissionTitle: commission.title,
          commissionId: commission.id,
          messagePreview: safePreview
        });
      }
    } catch (emailError) {
      console.error("Failed to send message notification:", emailError);
      // Don't fail the request if email fails
    }
    
    // Create in-app notification
    try {
      const recipientId = isClient ? commission.designerId : commission.requesterId;
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: "COMMISSION_MESSAGE",
          title: `New message from ${senderName}`,
          message: finalMessage.substring(0, 100) + (finalMessage.length > 100 ? "..." : ""),
          data: {
            commissionId: commission.id,
            senderId: session.user.id,
            senderRole
          }
        }
      });
    } catch (notifError) {
      // Don't fail if notification creation fails
      console.error("In-app notification failed:", notifError instanceof Error ? notifError.message : "unknown");
    }
    
    // Return response with warning if content was filtered
    return NextResponse.json({
      success: true,
      message: newMessage,
      ...(filterResult.warningMessage && {
        warning: filterResult.warningMessage,
        wasFiltered: true,
      }),
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
