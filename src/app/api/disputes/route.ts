import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

const MAX_LIMIT = 50

/**
 * GET /api/disputes
 * Get user's disputes or all disputes (admin)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'You must be signed in to view disputes' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const isAdmin = session.user.role === 'ADMIN'
    
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), MAX_LIMIT)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    // Build where clause
    interface DisputeWhere {
      OR?: Array<{ complainantId: string } | { respondentId: string }>
      status?: string
      type?: string
    }

    const where: DisputeWhere = isAdmin 
      ? {} 
      : {
          OR: [
            { complainantId: userId },
            { respondentId: userId }
          ]
        }

    if (status) where.status = status
    if (type) where.type = type

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: { messages: true }
          }
        }
      }),
      prisma.dispute.count({ where })
    ])

    return NextResponse.json({
      disputes,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Get disputes error:', error)
    return NextResponse.json(
      { message: 'Failed to get disputes' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/disputes
 * Create a new dispute
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'You must be signed in to file a dispute' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Rate limit: 5 disputes per day
    const rateLimitKey = `dispute:${userId}`
    const rateLimit = await checkRateLimit(rateLimitKey, 5, 24 * 60 * 60 * 1000)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: 'Too many disputes filed. Please try again tomorrow.' },
        { status: 429 }
      )
    }

    const {
      respondentId,
      orderId,
      designId,
      commissionId,
      type,
      title,
      description,
      evidence,
      refundRequested
    } = await request.json()

    // Validate required fields
    if (!respondentId || typeof respondentId !== 'string') {
      return NextResponse.json(
        { message: 'Respondent is required' },
        { status: 400 }
      )
    }

    if (respondentId === userId) {
      return NextResponse.json(
        { message: 'You cannot file a dispute against yourself' },
        { status: 400 }
      )
    }

    const validTypes = ['REFUND_REQUEST', 'QUALITY_ISSUE', 'NON_DELIVERY', 'COPYRIGHT', 'OTHER']
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { message: 'Invalid dispute type' },
        { status: 400 }
      )
    }

    if (!title || typeof title !== 'string' || title.length < 10) {
      return NextResponse.json(
        { message: 'Title must be at least 10 characters' },
        { status: 400 }
      )
    }

    if (!description || typeof description !== 'string' || description.length < 50) {
      return NextResponse.json(
        { message: 'Description must be at least 50 characters' },
        { status: 400 }
      )
    }

    // Verify respondent exists
    const respondent = await prisma.user.findUnique({
      where: { id: respondentId },
      select: { id: true }
    })

    if (!respondent) {
      return NextResponse.json(
        { message: 'Respondent not found' },
        { status: 404 }
      )
    }

    // Create the dispute
    const dispute = await prisma.dispute.create({
      data: {
        complainantId: userId,
        respondentId,
        orderId: orderId || null,
        designId: designId || null,
        commissionId: commissionId || null,
        type,
        title: title.trim(),
        description: description.trim(),
        evidence: evidence || [],
        refundRequested: refundRequested || null,
        priority: type === 'COPYRIGHT' ? 'HIGH' : 'MEDIUM'
      }
    })

    // Create initial message
    await prisma.disputeMessage.create({
      data: {
        disputeId: dispute.id,
        senderId: userId,
        senderRole: 'COMPLAINANT',
        message: description.trim()
      }
    })

    return NextResponse.json(
      { 
        message: 'Dispute filed successfully. Our team will review it within 24-48 hours.',
        dispute 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Create dispute error:', error)
    return NextResponse.json(
      { message: 'Failed to create dispute' },
      { status: 500 }
    )
  }
}
