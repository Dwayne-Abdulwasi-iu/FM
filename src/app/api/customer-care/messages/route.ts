import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }
  const { sessionId, message } = await request.json()

    if (!sessionId || !message?.trim()) {
      return NextResponse.json(
        { message: 'Session ID and message are required' },
        { status: 400 }
      )
    }

    // Verify the chat session belongs to the user (unless admin)
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { user: true }
    })

    if (!chatSession) {
      return NextResponse.json(
        { message: 'Chat session not found' },
        { status: 404 }
      )
    }

    if (session.user.role !== 'ADMIN' && chatSession.userId !== session.user.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Create the message
    // Get user's designerTier for badge display
    const senderUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { designerTier: true }
    })
    
    const chatMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        senderId: session.user.id,
        senderName: session.user.name || 'User',
        senderRole: session.user.role === 'ADMIN' ? 'ADMIN' : 'USER',
        message: message.trim(),
        isRead: false
      }
    })

    // Update session timestamp
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json({
      id: chatMessage.id,
      message: chatMessage.message,
      senderId: chatMessage.senderId,
      senderName: chatMessage.senderName,
      senderRole: chatMessage.senderRole,
      senderDesignerTier: senderUser?.designerTier || null,
      isAdmin: chatMessage.senderRole === 'ADMIN',
      timestamp: chatMessage.createdAt,
      createdAt: chatMessage.createdAt,
      isRead: chatMessage.isRead
    })

  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { message: 'Failed to send message' },
      { status: 500 }
    )
  }
}

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
    const sessionId = searchParams.get('sessionId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!sessionId) {
      return NextResponse.json(
        { message: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Verify access to the chat session
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId }
    })

    if (!chatSession) {
      return NextResponse.json(
        { message: 'Chat session not found' },
        { status: 404 }
      )
    }

    if (session.user.role !== 'ADMIN' && chatSession.userId !== session.user.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      )
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        sessionId
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: limit,
      skip: offset,
      include: {
        sender: {
          select: {
            designerTier: true
          }
        }
      }
    })

    type ChatMessageShape = { id: string; message: string; senderId: string; senderName: string; senderRole: string; createdAt: string | Date; isRead: boolean; sender?: { designerTier: string | null } }
    const formattedMessages = (messages as ChatMessageShape[]).map((msg) => ({
      id: msg.id,
      message: msg.message,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderRole: msg.senderRole,
      senderDesignerTier: msg.sender?.designerTier || null,
      isAdmin: msg.senderRole === 'ADMIN',
      timestamp: msg.createdAt,
      createdAt: msg.createdAt,
      isRead: msg.isRead
    }))

    return NextResponse.json({
      messages: formattedMessages
    })

  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { message: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}