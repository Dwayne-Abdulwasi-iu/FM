import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/disputes/[disputeId]
 * Get dispute details with messages
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ disputeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'You must be signed in to view dispute' },
        { status: 401 }
      )
    }

    const params = await context.params
    const disputeId = params.disputeId
    const userId = session.user.id
    const isAdmin = session.user.role === 'ADMIN'

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!dispute) {
      return NextResponse.json(
        { message: 'Dispute not found' },
        { status: 404 }
      )
    }

    // Check access rights
    if (!isAdmin && dispute.complainantId !== userId && dispute.respondentId !== userId) {
      return NextResponse.json(
        { message: 'You do not have access to this dispute' },
        { status: 403 }
      )
    }

    // Fetch related user and order information
    const [complainant, respondent, order] = await Promise.all([
      prisma.user.findUnique({ where: { id: dispute.complainantId }, select: { name: true, email: true } }),
      prisma.user.findUnique({ where: { id: dispute.respondentId }, select: { name: true, email: true } }),
      dispute.orderId ? prisma.order.findUnique({ where: { id: dispute.orderId } }) : null,
    ])

    return NextResponse.json({ 
      dispute: {
        ...dispute,
        complainant,
        respondent,
        order
      }
    })

  } catch (error) {
    console.error('Get dispute error:', error)
    return NextResponse.json(
      { message: 'Failed to get dispute' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/disputes/[disputeId]
 * Add a message to the dispute
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ disputeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const params = await context.params
    const disputeId = params.disputeId
    const userId = session.user.id
    const isAdmin = session.user.role === 'ADMIN'

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId }
    })

    if (!dispute) {
      return NextResponse.json(
        { message: 'Dispute not found' },
        { status: 404 }
      )
    }

    // Check access rights
    if (!isAdmin && dispute.complainantId !== userId && dispute.respondentId !== userId) {
      return NextResponse.json(
        { message: 'You do not have access to this dispute' },
        { status: 403 }
      )
    }

    // Can't add messages to closed disputes
    if (dispute.status === 'CLOSED' || dispute.status === 'RESOLVED') {
      return NextResponse.json(
        { message: 'This dispute has been closed' },
        { status: 400 }
      )
    }

    const { message, attachments } = await request.json()

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { message: 'Message is required' },
        { status: 400 }
      )
    }

    // Determine sender role
    let senderRole = 'COMPLAINANT'
    if (isAdmin) {
      senderRole = 'ADMIN'
    } else if (dispute.respondentId === userId) {
      senderRole = 'RESPONDENT'
    }

    const disputeMessage = await prisma.disputeMessage.create({
      data: {
        disputeId,
        senderId: userId,
        senderRole,
        message: message.trim(),
        attachments: attachments || []
      }
    })

    // Update dispute status if admin responds
    if (isAdmin && dispute.status === 'OPEN') {
      await prisma.dispute.update({
        where: { id: disputeId },
        data: { status: 'UNDER_REVIEW' }
      })
    }

    return NextResponse.json({
      message: 'Message sent',
      disputeMessage
    })

  } catch (error) {
    console.error('Add dispute message error:', error)
    return NextResponse.json(
      { message: 'Failed to send message' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/disputes/[disputeId]
 * Update dispute status (admin only)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ disputeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      )
    }

    const params = await context.params
    const disputeId = params.disputeId
    const adminId = session.user.id

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId }
    })

    if (!dispute) {
      return NextResponse.json(
        { message: 'Dispute not found' },
        { status: 404 }
      )
    }

    const { status, resolution, refundApproved, priority } = await request.json()

    const validStatuses = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED', 'CLOSED']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { message: 'Invalid status' },
        { status: 400 }
      )
    }

    interface UpdateData {
      status?: string
      resolution?: string
      refundApproved?: number
      priority?: string
      resolvedBy?: string
      resolvedAt?: Date
    }

    const updateData: UpdateData = {}
    
    if (status) updateData.status = status
    if (resolution) updateData.resolution = resolution
    if (refundApproved !== undefined) updateData.refundApproved = refundApproved
    if (priority) updateData.priority = priority

    // If resolving, record who and when
    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedBy = adminId
      updateData.resolvedAt = new Date()
    }

    const updatedDispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: updateData
    })

    // Add system message about status change
    if (status) {
      await prisma.disputeMessage.create({
        data: {
          disputeId,
          senderId: adminId,
          senderRole: 'ADMIN',
          message: `Dispute status updated to: ${status}${resolution ? `. Resolution: ${resolution}` : ''}`
        }
      })
    }

    return NextResponse.json({
      message: 'Dispute updated',
      dispute: updatedDispute
    })

  } catch (error) {
    console.error('Update dispute error:', error)
    return NextResponse.json(
      { message: 'Failed to update dispute' },
      { status: 500 }
    )
  }
}
