// Create a variant discrepancy appeal - seller disputes admin decision
// POST - Create appeal

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { decisionId, reason, appealPhotos } = body;

    if (!decisionId) {
      return NextResponse.json(
        { success: false, message: 'Missing decisionId' },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Appeal reason is required' },
        { status: 400 }
      );
    }

    if (reason.length > 1000) {
      return NextResponse.json(
        { success: false, message: 'Appeal reason must be under 1000 characters' },
        { status: 400 }
      );
    }

    // Get the decision to verify seller owns the shipment
    const decision = await prisma.variantDiscrepancyDecision.findUnique({
      where: { id: decisionId },
      include: {
        discrepancy: {
          include: {
            shipment: {
              select: {
                id: true,
                sellerId: true,
                seller: { select: { name: true, email: true } },
              },
            },
            variant: {
              include: {
                product: { select: { id: true, title: true } },
              },
            },
          },
        },
        admin: { select: { name: true, email: true } },
      },
    });

    if (!decision) {
      return NextResponse.json(
        { success: false, message: 'Decision not found' },
        { status: 404 }
      );
    }

    // Verify seller is the one appealing
    if (decision.discrepancy.shipment.sellerId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'You can only appeal your own decisions' },
        { status: 403 }
      );
    }

    // Check if appeal already exists and is pending
    const existingAppeal = await prisma.variantDiscrepancyAppeal.findFirst({
      where: {
        decisionId,
        appealStatus: 'PENDING',
      },
    });

    if (existingAppeal) {
      return NextResponse.json(
        { success: false, message: 'You already have a pending appeal for this decision' },
        { status: 409 }
      );
    }

    // Create the appeal
    const appeal = await prisma.variantDiscrepancyAppeal.create({
      data: {
        decisionId,
        sellerId: session.user.id,
        reason: reason.substring(0, 1000),
        appealPhotos: Array.isArray(appealPhotos) ? appealPhotos : [],
      },
      include: {
        decision: {
          include: {
            admin: { select: { name: true, email: true } },
            discrepancy: {
              include: {
                variant: {
                  include: {
                    product: { select: { title: true } },
                  },
                },
              },
            },
          },
        },
        seller: { select: { id: true, email: true, name: true } },
      },
    });

    // Notify admin of appeal
    try {
      const productTitle = appeal.decision.discrepancy.variant.product.title;
      await sendEmail({
        to: process.env.ADMIN_EMAIL || 'admin@marketplace.com',
        subject: `📢 Seller Appeal: ${productTitle} - Requires Review`,
        text: `Seller ${decision.discrepancy.shipment.seller.name} has appealed decision for "${productTitle}"`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #E0E7FF; border-left: 4px solid #4F46E5; padding: 20px; border-radius: 4px;">
              <p style="margin: 0; color: #312E81; font-weight: bold;">📢 Seller Appeal Submitted</p>
              <p style="color: #312E81; margin: 10px 0 0 0;">
                <strong>${decision.discrepancy.shipment.seller.name}</strong> has appealed the decision for:
              </p>
              <p style="color: #312E81; margin: 10px 0 0 0;">
                <strong>Product:</strong> ${productTitle}
              </p>
              <p style="color: #312E81; margin: 10px 0 0 0;">
                <strong>Original Decision:</strong> ${decision.acceptanceStatus}
              </p>
              <p style="color: #312E81; margin: 10px 0 0 0;">
                <strong>Reason:</strong><br/>
                ${appeal.reason.replace(/\n/g, '<br/>')}
              </p>
              ${appeal.appealPhotos.length > 0 ? `
                <p style="color: #312E81; margin: 10px 0 0 0;">
                  <strong>Attached Photos:</strong> ${appeal.appealPhotos.length} image(s)
                </p>
              ` : ''}
              <p style="color: #312E81; margin: 15px 0 0 0;">
                <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/boutique/appeals" style="color: #4F46E5; text-decoration: none; font-weight: bold;">
                  Review Appeal →
                </a>
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to notify admin of appeal:', emailError);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Appeal submitted. Admin will review within 24 hours.',
        appeal,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating appeal:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create appeal', error: (error as Error).message },
      { status: 500 }
    );
  }
}
