import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get unread notifications
    const unreadCount = await (prisma as any).transferNotification.count({
      where: {
        sellerId: user.id,
        isRead: false
      }
    })

    // Get recent notifications (last 20)
    const notifications = await (prisma as any).transferNotification.findMany({
      where: { sellerId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount
    })
  } catch (error) {
    console.error('Fetch notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { notificationId, markAsRead } = body

    if (!notificationId) {
      return NextResponse.json({ error: 'notificationId required' }, { status: 400 })
    }

    // Verify notification belongs to this seller
    const notification = await (prisma as any).transferNotification.findUnique({
      where: { id: notificationId }
    })

    if (!notification || notification.sellerId !== user.id) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Update notification
    const updated = await prisma.transferNotification.update({
      where: { id: notificationId },
      data: {
        isRead: markAsRead,
        readAt: markAsRead ? new Date() : null
      }
    })

    return NextResponse.json({
      success: true,
      notification: updated
    })
  } catch (error) {
    console.error('Update notification error:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}
