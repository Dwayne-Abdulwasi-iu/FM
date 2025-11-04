import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/customer-care/unread
// Admin-only: returns total unread count and per-session unread counts
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Count unread messages sent by users grouped by session
    const bySession = await prisma.chatMessage.groupBy({
      by: ['sessionId'],
      where: {
        senderRole: 'USER',
        isRead: false,
      },
      _count: { _all: true },
    })

    const totalUnread = bySession.reduce((sum, row) => sum + (row._count?._all || 0), 0)

    return NextResponse.json({
      totalUnread,
      sessions: bySession.map((r) => ({ sessionId: r.sessionId, unread: r._count?._all || 0 })),
    })
  } catch (err) {
    console.error('Unread chat count error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
