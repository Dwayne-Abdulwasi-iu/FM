import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { isMainAdmin } from '@/lib/admin'

interface RouteParams {
  params: Promise<{ adminId: string }>
}

/**
 * GET - Get list of users a specific admin has messaged
 * Main admin can view any admin's users, regular admins can only view their own
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { adminId } = await params
    const isMain = isMainAdmin(session.user.email)

    // Only main admin can view other admins' messages
    if (!isMain && adminId !== session.user.id) {
      return NextResponse.json({ error: 'You can only view your own conversations' }, { status: 403 })
    }

    // Verify the target admin exists
    const targetAdmin = await prisma.user.findFirst({
      where: { id: adminId, role: 'ADMIN' },
      select: { id: true, name: true, email: true, image: true }
    })

    if (!targetAdmin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Get unique users this admin has conversed with
    // First, get all messages where admin is sender or receiver
    const sentMessages = await prisma.directMessage.findMany({
      where: {
        senderId: adminId,
        receiver: { role: { not: 'ADMIN' } }, // Only non-admin users
      },
      select: {
        receiverId: true,
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            isVerified: true,
            designerTier: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    const receivedMessages = await prisma.directMessage.findMany({
      where: {
        receiverId: adminId,
        sender: { role: { not: 'ADMIN' } }, // Only non-admin users
      },
      select: {
        senderId: true,
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            isVerified: true,
            designerTier: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    // Combine and deduplicate users
    const userMap = new Map<string, {
      id: string
      name: string | null
      email: string
      image: string | null
      role: string
      isVerified: boolean
      designerTier: string | null
    }>()

    sentMessages.forEach(m => {
      if (!userMap.has(m.receiverId)) {
        userMap.set(m.receiverId, m.receiver)
      }
    })

    receivedMessages.forEach(m => {
      if (!userMap.has(m.senderId)) {
        userMap.set(m.senderId, m.sender)
      }
    })

    const userIds = Array.from(userMap.keys())

    // Bulk fetch all stats in parallel to avoid N+1 queries
    const [
      messageCountsByUser,
      unreadCountsByUser,
      lastMessagesByUser,
    ] = await Promise.all([
      // 1. Total message count per user conversation
      prisma.directMessage.groupBy({
        by: ['senderId', 'receiverId'],
        where: {
          OR: [
            { senderId: adminId, receiverId: { in: userIds } },
            { senderId: { in: userIds }, receiverId: adminId },
          ]
        },
        _count: { id: true },
      }),

      // 2. Unread count per user (messages from user to admin that are unread)
      prisma.directMessage.groupBy({
        by: ['senderId'],
        where: {
          senderId: { in: userIds },
          receiverId: adminId,
          readAt: null,
        },
        _count: { id: true },
      }),

      // 3. Last message per user conversation (most recent in each direction)
      prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: adminId, receiverId: { in: userIds } },
            { senderId: { in: userIds }, receiverId: adminId },
          ]
        },
        orderBy: { createdAt: 'desc' },
        select: {
          senderId: true,
          receiverId: true,
          content: true,
          createdAt: true,
          readAt: true,
        },
      }),
    ])

    // Build lookup maps for O(1) access
    // Total message count per user (sum both directions)
    const totalCountMap = new Map<string, number>()
    messageCountsByUser.forEach(m => {
      // Determine which user this is about (the non-admin one)
      const userId = m.senderId === adminId ? m.receiverId : m.senderId
      const current = totalCountMap.get(userId) || 0
      totalCountMap.set(userId, current + m._count.id)
    })

    // Unread count from each user
    const unreadCountMap = new Map<string, number>()
    unreadCountsByUser.forEach(m => {
      unreadCountMap.set(m.senderId, m._count.id)
    })

    // Last message per user (find most recent across both directions)
    const lastMessageMap = new Map<string, {
      content: string
      createdAt: Date
      senderId: string
      readAt: Date | null
    }>()
    lastMessagesByUser.forEach(m => {
      const userId = m.senderId === adminId ? m.receiverId : m.senderId
      const existing = lastMessageMap.get(userId)
      if (!existing || m.createdAt > existing.createdAt) {
        lastMessageMap.set(userId, m)
      }
    })

    // Build user list with stats using the maps
    const users = Array.from(userMap.values()).map(user => {
      const lastMessage = lastMessageMap.get(user.id)
      return {
        ...user,
        conversationStats: {
          totalMessages: totalCountMap.get(user.id) || 0,
          unreadCount: unreadCountMap.get(user.id) || 0,
          lastMessage: lastMessage ? {
            preview: lastMessage.content.length > 60
              ? lastMessage.content.substring(0, 60) + '...'
              : lastMessage.content,
            createdAt: lastMessage.createdAt,
            isFromUser: lastMessage.senderId === user.id,
            isRead: !!lastMessage.readAt,
          } : null,
        }
      }
    })

    // Sort by last message date (most recent first)
    users.sort((a, b) => {
      if (a.conversationStats.lastMessage && b.conversationStats.lastMessage) {
        return new Date(b.conversationStats.lastMessage.createdAt).getTime() - 
               new Date(a.conversationStats.lastMessage.createdAt).getTime()
      }
      if (a.conversationStats.lastMessage) return -1
      if (b.conversationStats.lastMessage) return 1
      return 0
    })

    return NextResponse.json({
      admin: targetAdmin,
      users,
      isViewingOwnMessages: adminId === session.user.id,
      canSendOnBehalf: isMain && adminId !== session.user.id,
    })
  } catch (error) {
    console.error('Error fetching admin user list:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
