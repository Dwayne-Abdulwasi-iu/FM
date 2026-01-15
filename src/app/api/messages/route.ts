import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const MAX_MESSAGES_PER_PAGE = 50

/**
 * GET /api/messages
 * Get conversations or messages with a specific user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const conversationWith = searchParams.get('with')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), MAX_MESSAGES_PER_PAGE)
    const cursor = searchParams.get('cursor')

    if (conversationWith) {
      // Get messages in a specific conversation
      const messages = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: session.user.id, receiverId: conversationWith },
            { senderId: conversationWith, receiverId: session.user.id }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        ...(cursor && { 
          cursor: { id: cursor },
          skip: 1 
        }),
        include: {
          sender: {
            select: { id: true, name: true, image: true }
          }
        }
      })

      // Mark messages as read
      await prisma.directMessage.updateMany({
        where: {
          senderId: conversationWith,
          receiverId: session.user.id,
          readAt: null
        },
        data: { readAt: new Date() }
      })

      return NextResponse.json({
        messages: messages.reverse(),
        nextCursor: messages.length === limit ? messages[0]?.id : null
      })
    }

    // Get all conversations (grouped by other user)
    const sentMessages = await prisma.directMessage.findMany({
      where: { senderId: session.user.id },
      orderBy: { createdAt: 'desc' },
      distinct: ['receiverId'],
      include: {
        receiver: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    const receivedMessages = await prisma.directMessage.findMany({
      where: { receiverId: session.user.id },
      orderBy: { createdAt: 'desc' },
      distinct: ['senderId'],
      include: {
        sender: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    // Get unread counts per conversation
    const unreadCounts = await prisma.directMessage.groupBy({
      by: ['senderId'],
      where: {
        receiverId: session.user.id,
        readAt: null
      },
      _count: { id: true }
    })

    const unreadMap = new Map(
      unreadCounts.map(u => [u.senderId, u._count.id])
    )

    // Build conversations list
    const conversationsMap = new Map<string, {
      user: { id: string; name: string | null; image: string | null };
      lastMessage: { content: string; createdAt: Date; isFromMe: boolean };
      unreadCount: number;
    }>()

    for (const msg of sentMessages) {
      const key = msg.receiverId
      if (!conversationsMap.has(key)) {
        conversationsMap.set(key, {
          user: msg.receiver,
          lastMessage: { 
            content: msg.content.slice(0, 100), 
            createdAt: msg.createdAt,
            isFromMe: true
          },
          unreadCount: 0
        })
      }
    }

    for (const msg of receivedMessages) {
      const key = msg.senderId
      const existing = conversationsMap.get(key)
      
      if (!existing || msg.createdAt > existing.lastMessage.createdAt) {
        conversationsMap.set(key, {
          user: msg.sender,
          lastMessage: { 
            content: msg.content.slice(0, 100), 
            createdAt: msg.createdAt,
            isFromMe: false
          },
          unreadCount: unreadMap.get(key) || 0
        })
      }
    }

    // Sort by most recent message
    const conversations = Array.from(conversationsMap.values())
      .sort((a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime())

    return NextResponse.json({ conversations })

  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { message: 'Failed to get messages' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/messages
 * Send a new direct message
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { receiverId, content, designId } = body

    if (!receiverId || !content?.trim()) {
      return NextResponse.json(
        { message: 'Receiver and message content are required' },
        { status: 400 }
      )
    }

    if (receiverId === session.user.id) {
      return NextResponse.json(
        { message: 'Cannot send message to yourself' },
        { status: 400 }
      )
    }

    // Check receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, name: true }
    })

    if (!receiver) {
      return NextResponse.json(
        { message: 'Recipient not found' },
        { status: 404 }
      )
    }

    // Create message
    const message = await prisma.directMessage.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content: content.trim().slice(0, 5000),
        designId: designId || null
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    // Create notification for receiver
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'MESSAGE',
        title: 'New Message',
        message: `${session.user.name || 'Someone'} sent you a message`,
        data: JSON.stringify({ 
          senderId: session.user.id,
          messageId: message.id 
        })
      }
    })

    return NextResponse.json({ message }, { status: 201 })

  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { message: 'Failed to send message' },
      { status: 500 }
    )
  }
}
