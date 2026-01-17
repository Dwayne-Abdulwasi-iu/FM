import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { isMainAdmin } from '@/lib/admin'
import { checkRateLimit, adminMessageRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'

interface RouteParams {
  params: Promise<{ adminId: string; userId: string }>
}

const MAX_MESSAGE_LENGTH = 10000

/**
 * GET - Get conversation between an admin and a user
 * Main admin can view any admin's conversations, regular admins can only view their own
 * Supports cursor-based pagination for large conversations
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { adminId, userId } = await params
    const isMain = isMainAdmin(session.user.email)

    // Pagination params with validation
    const { searchParams } = new URL(request.url)
    const limitParam = parseInt(searchParams.get('limit') || '50')
    const limit = Math.min(Number.isNaN(limitParam) ? 50 : limitParam, 100) // Max 100, default 50
    const before = searchParams.get('before')
    const after = searchParams.get('after')

    // Validate date cursors if provided
    if (before && isNaN(new Date(before).getTime())) {
      return NextResponse.json({ error: 'Invalid before cursor' }, { status: 400 })
    }
    if (after && isNaN(new Date(after).getTime())) {
      return NextResponse.json({ error: 'Invalid after cursor' }, { status: 400 })
    }

    // Only main admin can view other admins' messages
    if (!isMain && adminId !== session.user.id) {
      return NextResponse.json({ error: 'You can only view your own conversations' }, { status: 403 })
    }

    // Verify both users exist
    const [targetAdmin, targetUser] = await Promise.all([
      prisma.user.findFirst({
        where: { id: adminId, role: 'ADMIN' },
        select: { id: true, name: true, email: true, image: true }
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true, 
          name: true, 
          email: true, 
          image: true, 
          role: true,
          isVerified: true,
          designerTier: true,
        }
      })
    ])

    if (!targetAdmin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Build query with cursor pagination
    const whereClause = {
      OR: [
        { senderId: adminId, receiverId: userId },
        { senderId: userId, receiverId: adminId },
      ],
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    }

    // Get messages with pagination
    const [messages, totalCount] = await Promise.all([
      prisma.directMessage.findMany({
        where: whereClause,
        orderBy: { createdAt: before ? 'desc' : 'asc' }, // Reverse order when loading older
        take: limit + 1, // Fetch one extra to detect if there are more
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
      // Only count on initial load (no cursor)
      !before && !after ? prisma.directMessage.count({
        where: {
          OR: [
            { senderId: adminId, receiverId: userId },
            { senderId: userId, receiverId: adminId },
          ]
        }
      }) : Promise.resolve(null),
    ])

    // Check if there are more messages
    const hasMore = messages.length > limit
    const paginatedMessages = hasMore ? messages.slice(0, limit) : messages

    // If loading older messages (before cursor), reverse back to chronological order
    if (before) {
      paginatedMessages.reverse()
    }

    // Mark user's messages as read (if viewing own conversation or main admin)
    if (adminId === session.user.id || isMain) {
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
    }

    // Get cursors for pagination
    const oldestMessage = paginatedMessages[0]
    const newestMessage = paginatedMessages[paginatedMessages.length - 1]

    return NextResponse.json({
      admin: targetAdmin,
      user: targetUser,
      messages: paginatedMessages,
      pagination: {
        limit,
        totalCount,
        hasOlder: before ? hasMore : (oldestMessage ? true : false), // Simplified - assume more older if any exist
        hasNewer: after ? hasMore : false,
        oldestCursor: oldestMessage?.createdAt || null,
        newestCursor: newestMessage?.createdAt || null,
      },
      isViewingOwnConversation: adminId === session.user.id,
      canSendOnBehalf: isMain && adminId !== session.user.id,
      canEdit: isMain || adminId === session.user.id,
    })
  } catch (error) {
    console.error('Error fetching conversation:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST - Send a message on behalf of an admin (main admin only) or as own
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { adminId, userId } = await params
    const isMain = isMainAdmin(session.user.email)

    // Only main admin can send on behalf of other admins
    if (!isMain && adminId !== session.user.id) {
      return NextResponse.json({ error: 'You can only send messages from your own account' }, { status: 403 })
    }

    const body = await request.json()
    const { content } = body

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.` }, { status: 400 })
    }

    // Rate limit: 50 messages per hour per admin (after validation to not waste limit on bad requests)
    const rateLimit = await checkRateLimit(
      adminMessageRateLimitKey(session.user.id),
      RATE_LIMITS.ADMIN_MESSAGE.limit,
      RATE_LIMITS.ADMIN_MESSAGE.windowMs
    )
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before sending more messages.' },
        { status: 429 }
      )
    }

    // Verify both users exist
    const [targetAdmin, targetUser] = await Promise.all([
      prisma.user.findFirst({
        where: { id: adminId, role: 'ADMIN' },
        select: { id: true, name: true }
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, emailNotifications: true }
      })
    ])

    if (!targetAdmin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isSendingOnBehalf = adminId !== session.user.id

    // Create the message - senderId is the target admin (for sending on behalf)
    const message = await prisma.directMessage.create({
      data: {
        senderId: adminId, // Use the target admin ID (could be main admin sending on behalf)
        receiverId: userId,
        content: content.trim(),
        // Audit trail: record who actually sent if on behalf
        ...(isSendingOnBehalf ? { sentOnBehalfBy: session.user.id } : {}),
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
        title: `New message from ${targetAdmin.name || 'Admin'}`,
        message: content.length > 100 ? content.substring(0, 100) + '...' : content,
        data: { 
          messageId: message.id,
          // Track if sent on behalf
          ...(isSendingOnBehalf ? { sentOnBehalfBy: session.user.id } : {})
        },
      }
    })

    return NextResponse.json({
      success: true,
      message,
      sentOnBehalf: isSendingOnBehalf,
    })
  } catch (error) {
    console.error('Error sending message:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
