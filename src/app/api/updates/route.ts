import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

/**
 * GET - Get updates/announcements for the current user
 * Returns broadcasts that were sent to the user's segment
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const cursor = searchParams.get('cursor')

    // Get broadcasts where user is a recipient
    const whereClause = {
      userId: session.user.id,
      broadcast: {
        status: 'SENT',
      }
    }

    const includeClause = {
      broadcast: {
        select: {
          id: true,
          subject: true,
          content: true,
          targetType: true,
          sentAt: true,
          admin: {
            select: {
              name: true,
            }
          }
        }
      }
    }

    // Get user-specific broadcasts
    const recipientRecords = await prisma.adminBroadcastRecipient.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' as const },
      take: limit + 1,
      include: includeClause,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    // Determine pagination
    const hasMore = recipientRecords.length > limit
    const records = hasMore ? recipientRecords.slice(0, limit) : recipientRecords
    const nextCursor = hasMore ? records[records.length - 1]?.id : null

    // Count unread
    const unreadCount = await prisma.adminBroadcastRecipient.count({
      where: {
        userId: session.user.id,
        readAt: null,
        broadcast: {
          status: 'SENT',
        }
      }
    })

    // Transform to a cleaner format
    const updates = records.map(record => ({
      id: record.id,
      broadcastId: record.broadcast.id,
      subject: record.broadcast.subject,
      content: record.broadcast.content,
      targetType: record.broadcast.targetType,
      sentAt: record.broadcast.sentAt,
      from: record.broadcast.admin?.name || 'Admin',
      isRead: !!record.readAt,
      readAt: record.readAt,
      createdAt: record.createdAt,
    }))

    return NextResponse.json({
      updates,
      unreadCount,
      pagination: {
        hasMore,
        nextCursor,
      }
    })
  } catch (error) {
    console.error('Error fetching updates:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to fetch updates' }, { status: 500 })
  }
}

/**
 * PATCH - Mark an update as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { updateId, markAllRead } = body

    if (markAllRead) {
      // Get unread recipients grouped by broadcast to increment read counts
      const unreadRecipients = await prisma.adminBroadcastRecipient.findMany({
        where: {
          userId: session.user.id,
          readAt: null,
        },
        select: { id: true, broadcastId: true }
      })

      if (unreadRecipients.length > 0) {
        // Group by broadcast ID to count how many to increment for each
        const broadcastCounts = unreadRecipients.reduce((acc, r) => {
          acc[r.broadcastId] = (acc[r.broadcastId] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        // Execute all updates in a transaction
        await prisma.$transaction([
          // Mark all recipients as read
          prisma.adminBroadcastRecipient.updateMany({
            where: {
              userId: session.user.id,
              readAt: null,
            },
            data: {
              readAt: new Date(),
            }
          }),
          // Update read counts on each broadcast
          ...Object.entries(broadcastCounts).map(([broadcastId, count]) =>
            prisma.adminBroadcast.update({
              where: { id: broadcastId },
              data: { readCount: { increment: count } },
            })
          )
        ])
      }

      return NextResponse.json({ success: true, message: 'All updates marked as read' })
    }

    if (!updateId) {
      return NextResponse.json({ error: 'Update ID is required' }, { status: 400 })
    }

    // Verify ownership and mark as read
    const recipient = await prisma.adminBroadcastRecipient.findFirst({
      where: {
        id: updateId,
        userId: session.user.id,
      }
    })

    if (!recipient) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }

    // Only increment read count if not already read (prevents race condition)
    if (!recipient.readAt) {
      await prisma.$transaction([
        prisma.adminBroadcastRecipient.update({
          where: { id: updateId },
          data: { readAt: new Date() },
        }),
        prisma.adminBroadcast.update({
          where: { id: recipient.broadcastId },
          data: { readCount: { increment: 1 } },
        })
      ])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking update as read:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
