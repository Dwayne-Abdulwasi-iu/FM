import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { isMainAdmin } from '@/lib/admin'

/**
 * GET - Get overview of all admins and their messaging activity
 * Main admin only - regular admins just see their own stats
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isMain = isMainAdmin(session.user.email)

    if (isMain) {
      // Main admin sees all admins - fetch all data in bulk to avoid N+1 queries
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        }
      })

      const adminIds = admins.map(a => a.id)

      // Bulk fetch all stats in parallel (4 queries total instead of 4*N)
      const [
        conversationsByAdmin,
        messageCountsByAdmin,
        unreadRepliesByAdmin,
        lastMessagesByAdmin,
      ] = await Promise.all([
        // 1. Conversation counts per admin (unique non-admin recipients)
        prisma.directMessage.groupBy({
          by: ['senderId', 'receiverId'],
          where: {
            senderId: { in: adminIds },
            receiver: { role: { not: 'ADMIN' } },
          },
        }),

        // 2. Total messages sent per admin
        prisma.directMessage.groupBy({
          by: ['senderId'],
          where: {
            senderId: { in: adminIds },
          },
          _count: { id: true },
        }),

        // 3. Unread replies per admin
        prisma.directMessage.groupBy({
          by: ['receiverId'],
          where: {
            receiverId: { in: adminIds },
            sender: { role: { not: 'ADMIN' } },
            readAt: null,
          },
          _count: { id: true },
        }),

        // 4. Last message per admin (get recent messages for all admins, then pick latest per admin)
        prisma.directMessage.findMany({
          where: {
            senderId: { in: adminIds },
          },
          orderBy: { createdAt: 'desc' },
          select: { senderId: true, createdAt: true, content: true },
          distinct: ['senderId'],
        }),
      ])

      // Build lookup maps for O(1) access
      const conversationCountMap = new Map<string, number>()
      conversationsByAdmin.forEach(c => {
        const current = conversationCountMap.get(c.senderId) || 0
        conversationCountMap.set(c.senderId, current + 1)
      })

      const messageCountMap = new Map<string, number>()
      messageCountsByAdmin.forEach(m => {
        messageCountMap.set(m.senderId, m._count.id)
      })

      const unreadCountMap = new Map<string, number>()
      unreadRepliesByAdmin.forEach(u => {
        unreadCountMap.set(u.receiverId, u._count.id)
      })

      const lastMessageMap = new Map<string, { createdAt: Date; content: string }>()
      lastMessagesByAdmin.forEach(m => {
        if (!lastMessageMap.has(m.senderId)) {
          lastMessageMap.set(m.senderId, { createdAt: m.createdAt, content: m.content })
        }
      })

      // Build admin stats using the maps
      const adminStats = admins.map(admin => {
        const lastMessage = lastMessageMap.get(admin.id)
        return {
          ...admin,
          isMainAdmin: isMainAdmin(admin.email),
          stats: {
            conversationCount: conversationCountMap.get(admin.id) || 0,
            totalMessagesSent: messageCountMap.get(admin.id) || 0,
            unreadReplies: unreadCountMap.get(admin.id) || 0,
            lastMessageAt: lastMessage?.createdAt || null,
            lastMessagePreview: lastMessage?.content
              ? (lastMessage.content.length > 50
                  ? lastMessage.content.substring(0, 50) + '...'
                  : lastMessage.content)
              : null,
          }
        }
      })

      // Sort by last message (most recent first), then by conversation count
      adminStats.sort((a, b) => {
        if (a.stats.lastMessageAt && b.stats.lastMessageAt) {
          return new Date(b.stats.lastMessageAt).getTime() - new Date(a.stats.lastMessageAt).getTime()
        }
        if (a.stats.lastMessageAt) return -1
        if (b.stats.lastMessageAt) return 1
        return b.stats.conversationCount - a.stats.conversationCount
      })

      return NextResponse.json({
        isMainAdmin: true,
        admins: adminStats,
        currentAdminId: session.user.id,
      })
    } else {
      // Regular admin - just return their own stats
      const conversations = await prisma.directMessage.groupBy({
        by: ['receiverId'],
        where: {
          senderId: session.user.id,
          receiver: { role: { not: 'ADMIN' } },
        },
        _count: { id: true },
      })

      const totalMessages = await prisma.directMessage.count({
        where: { senderId: session.user.id }
      })

      const unreadReplies = await prisma.directMessage.count({
        where: {
          receiverId: session.user.id,
          sender: { role: { not: 'ADMIN' } },
          readAt: null,
        }
      })

      return NextResponse.json({
        isMainAdmin: false,
        admins: [{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          isMainAdmin: false,
          stats: {
            conversationCount: conversations.length,
            totalMessagesSent: totalMessages,
            unreadReplies,
          }
        }],
        currentAdminId: session.user.id,
      })
    }
  } catch (error) {
    console.error('Error fetching admin message overview:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
