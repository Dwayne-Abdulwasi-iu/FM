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

    // Check if user has an active chat session
    let chatSession = await prisma.chatSession.findFirst({
      where: {
        userId: session.user.id,
        status: 'ACTIVE'
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    })

    // If no active session, create a new one
    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          userId: session.user.id,
          status: 'ACTIVE'
        },
        include: {
          messages: true
        }
      })
    }

    return NextResponse.json({
      id: chatSession.id,
      status: chatSession.status,
      createdAt: chatSession.createdAt,
      lastMessage: chatSession.messages[0] || null
    })

  } catch (error) {
      void error
      console.error('Chat session error:', error)
    return NextResponse.json(
      { message: 'Failed to create chat session' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'ACTIVE'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const sessions = await prisma.chatSession.findMany({
      where: {
        status: status as string
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        },
        _count: {
          select: {
            messages: true
          }
        }
      }
    })

    const total = await prisma.chatSession.count({
      where: { status: status as string }
    })

    return NextResponse.json({
      sessions,
      total,
      hasMore: offset + limit < total
    })

  } catch (error) {
    console.error('Get chat sessions error:', error)
    return NextResponse.json(
      { message: 'Failed to fetch chat sessions' },
      { status: 500 }
    )
  }
}