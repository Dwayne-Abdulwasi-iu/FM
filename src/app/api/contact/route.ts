import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { name, email, subject, message, priority } = await request.json()

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Rate limit: 5 messages per hour per email or IP
    const rateLimitKey = session?.user?.id 
      ? `contact:user:${session.user.id}`
      : `contact:email:${email.toLowerCase()}`
    
    const rateLimit = await checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          message: 'Too many messages submitted. Please try again later.',
          retryAfter: rateLimit.resetAt
        },
        { status: 429 }
      )
    }

    // Validate message length to prevent abuse
    if (message.length > 5000) {
      return NextResponse.json(
        { message: 'Message is too long. Maximum 5000 characters allowed.' },
        { status: 400 }
      )
    }

    // Create contact message
    const contactMessage = await prisma.contactMessage.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        subject: subject.trim(),
        message: message.trim(),
        priority: priority || 'medium',
        userId: session?.user?.id || null,
        status: 'OPEN',
      }
    })

    return NextResponse.json(
      { 
        message: 'Message sent successfully',
        id: contactMessage.id 
      },
      { status: 201 }
    )

  } catch (error) {
    void error
    console.error('Contact form error:', error)
    return NextResponse.json(
      { message: 'Failed to send message' },
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
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

  const where: Record<string, string> = {}
  if (status) where.status = status
  if (priority) where.priority = priority

    const messages = await prisma.contactMessage.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
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
        }
      }
    })

    const total = await prisma.contactMessage.count({ where })

    return NextResponse.json({
      messages,
      total,
      hasMore: offset + limit < total
    })

  } catch (error) {
    void error
    console.error('Get contact messages error:', error)
    return NextResponse.json(
      { message: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}