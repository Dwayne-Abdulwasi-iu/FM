import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { isMainAdmin } from '@/lib/admin'
import { checkRateLimit, adminMessageRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Maximum message content length (10KB)
const MAX_MESSAGE_LENGTH = 10000

// Get message history between admin(s) and user
// Supports cursor-based pagination for large conversations
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: userId } = await params
    const adminId = session.user.id
    const isMain = isMainAdmin(session.user.email)

    // Pagination params with validation
    const { searchParams } = new URL(request.url)
    const limitParam = parseInt(searchParams.get('limit') || '50')
    const limit = Math.min(Number.isNaN(limitParam) ? 50 : limitParam, 100)
    const before = searchParams.get('before')
    const after = searchParams.get('after')

    // Validate date cursors if provided
    if (before && isNaN(new Date(before).getTime())) {
      return NextResponse.json({ error: 'Invalid before cursor' }, { status: 400 })
    }
    if (after && isNaN(new Date(after).getTime())) {
      return NextResponse.json({ error: 'Invalid after cursor' }, { status: 400 })
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Build base where clause
    const baseWhere = isMain ? {
      // Main admin: see all admin-user messages
      OR: [
        { 
          receiverId: userId,
          sender: { role: 'ADMIN' }
        },
        { 
          senderId: userId,
          receiver: { role: 'ADMIN' }
        }
      ]
    } : {
      // Regular admin: only their own conversation
      OR: [
        { senderId: adminId, receiverId: userId },
        { senderId: userId, receiverId: adminId }
      ]
    }

    // Add cursor conditions
    const whereClause = {
      ...baseWhere,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    }

    // Get messages with pagination
    const [messages, totalCount] = await Promise.all([
      prisma.directMessage.findMany({
        where: whereClause,
        orderBy: { createdAt: before ? 'desc' : 'asc' },
        take: limit + 1,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true,
              image: true,
            }
          }
        }
      }),
      !before && !after ? prisma.directMessage.count({ where: baseWhere }) : Promise.resolve(null),
    ])

    const hasMore = messages.length > limit
    const paginatedMessages = hasMore ? messages.slice(0, limit) : messages

    if (before) {
      paginatedMessages.reverse()
    }

    // Mark messages from user to this admin as read
    await prisma.directMessage.updateMany({
      where: {
        senderId: userId,
        receiverId: adminId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      }
    })

    const oldestMessage = paginatedMessages[0]
    const newestMessage = paginatedMessages[paginatedMessages.length - 1]

    return NextResponse.json({
      user,
      messages: paginatedMessages,
      pagination: {
        limit,
        totalCount,
        hasOlder: before ? hasMore : (oldestMessage ? true : false),
        hasNewer: after ? hasMore : false,
        oldestCursor: oldestMessage?.createdAt || null,
        newestCursor: newestMessage?.createdAt || null,
      },
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Send message to user
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: userId } = await params
    const adminId = session.user.id
    const body = await request.json()
    const { content, designId } = body

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.` }, { status: 400 })
    }

    // Rate limit: 50 messages per hour per admin
    const rateLimit = await checkRateLimit(
      adminMessageRateLimitKey(adminId),
      RATE_LIMITS.ADMIN_MESSAGE.limit,
      RATE_LIMITS.ADMIN_MESSAGE.windowMs
    )
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before sending more messages.' },
        { status: 429 }
      )
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, emailNotifications: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validate designId if provided
    let validatedDesignId: string | null = null
    if (designId) {
      const design = await prisma.design.findUnique({
        where: { id: designId },
        select: { id: true }
      })
      if (!design) {
        return NextResponse.json({ error: 'Design not found' }, { status: 404 })
      }
      validatedDesignId = design.id
    }

    // Create the message
    const message = await prisma.directMessage.create({
      data: {
        senderId: adminId,
        receiverId: userId,
        content: content.trim(),
        designId: validatedDesignId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
            image: true,
          }
        }
      }
    })

    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId: userId,
        type: 'ADMIN_MESSAGE',
        title: 'New message from Admin',
        message: content.length > 100 ? content.substring(0, 100) + '...' : content,
        data: { messageId: message.id },
      }
    })

    // Send email notification if user has email notifications enabled
    if (user.emailNotifications && user.email) {
      const baseUrl = process.env.NEXTAUTH_URL || 'https://fashionmarketplace.example.com'
      const emailHtml = `
        <h2>New Message from Admin</h2>
        <p>Hello ${user.name || 'User'},</p>
        <p>You have received a new message from our admin team.</p>
        
        <h3>Message</h3>
        <p>${content.replace(/\n/g, '<br>')}</p>
        
        <p>
          <a href="${baseUrl}/dashboard/messages" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
            View Message
          </a>
        </p>
        
        <p>You can manage your notification preferences in your account settings.</p>
      `;

      await sendEmail({
        to: user.email,
        subject: 'New Message from Admin',
        html: emailHtml,
      });
    }

    return NextResponse.json({
      success: true,
      message,
    })
  } catch (error) {
    console.error('Error sending message:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update a message (admin only - main admin can edit any admin message, others can only edit own)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: userId } = await params
    const adminId = session.user.id
    const isMain = isMainAdmin(session.user.email)
    const body = await request.json()
    const { messageId, content } = body

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
    }

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.` }, { status: 400 })
    }

    // Find the message - main admin can edit any admin message, others can only edit their own
    const existingMessage = await prisma.directMessage.findFirst({
      where: {
        id: messageId,
        receiverId: userId,
        // Main admin can edit any admin's message, others only their own
        ...(isMain ? {
          sender: { role: 'ADMIN' }
        } : {
          senderId: adminId
        })
      },
      include: { sender: { select: { role: true } } }
    })

    if (!existingMessage) {
      return NextResponse.json({ error: 'Message not found or you cannot edit this message' }, { status: 404 })
    }

    // Verify the message was from an admin (for main admin case)
    if (existingMessage.sender.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Cannot edit user messages' }, { status: 403 })
    }

    // Update the message
    const message = await prisma.directMessage.update({
      where: { id: messageId },
      data: { 
        content: content.trim(),
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
            image: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message,
    })
  } catch (error) {
    console.error('Error updating message:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete a message (admin only - main admin can delete any admin message, others can only delete own)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: userId } = await params
    const adminId = session.user.id
    const isMain = isMainAdmin(session.user.email)
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
    }

    // Find the message - main admin can delete any admin message, others can only delete their own
    const existingMessage = await prisma.directMessage.findFirst({
      where: {
        id: messageId,
        receiverId: userId,
        // Main admin can delete any admin's message, others only their own
        ...(isMain ? {
          sender: { role: 'ADMIN' }
        } : {
          senderId: adminId
        })
      },
      include: { sender: { select: { role: true } } }
    })

    if (!existingMessage) {
      return NextResponse.json({ error: 'Message not found or you cannot delete this message' }, { status: 404 })
    }

    // Verify the message was from an admin (for main admin case)
    if (existingMessage.sender.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Cannot delete user messages' }, { status: 403 })
    }

    // Delete the message
    await prisma.directMessage.delete({
      where: { id: messageId }
    })

    // Also delete associated notification if exists
    // Find notifications that contain the messageId in their data field
    // Then filter and delete the matching one
    const relatedNotifications = await prisma.notification.findMany({
      where: {
        userId: userId,
        type: 'ADMIN_MESSAGE',
      },
      select: { id: true, data: true }
    })

    // Filter to find the exact notification with this messageId
    const notificationToDelete = relatedNotifications.find(n => {
      if (n.data && typeof n.data === 'object' && 'messageId' in n.data) {
        return (n.data as { messageId?: string }).messageId === messageId
      }
      return false
    })

    if (notificationToDelete) {
      await prisma.notification.delete({
        where: { id: notificationToDelete.id }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting message:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
