import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prismaErrorResponse } from '@/lib/prismaError'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = request.nextUrl.searchParams.get('status') || 'all'

    // Build where clause for status filter
    const where = {
      sellerId: session.user.id,
      ...(status !== 'all' && { status }),
    }

    const appeals = await prisma.disputeAppeal.findMany({
      where,
      select: {
        id: true,
        originalDisputeNumber: true,
        status: true,
        reason: true,
        notes: true,
        submittedAt: true,
        reviewedAt: true,
        adminResponse: true,
      },
      orderBy: { submittedAt: 'desc' },
      take: 100, // Limit results to 100
    })

    return NextResponse.json({
      appeals: appeals,
      total: appeals.length,
    })
  } catch (error) {
    console.error('Error fetching appeals:', error)
    const prismaResp = prismaErrorResponse(
      error,
      'Failed to fetch appeals'
    )
    if (prismaResp) return prismaResp

    return NextResponse.json(
      { error: 'Failed to fetch appeals', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { originalDisputeNumber, reason, notes } = body

    if (!originalDisputeNumber || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: originalDisputeNumber, reason' },
        { status: 400 }
      )
    }

    // Check if appeal already exists for this dispute
    const existingAppeal = await prisma.disputeAppeal.findFirst({
      where: {
        originalDisputeNumber,
        sellerId: session.user.id,
        status: { not: 'DENIED' },
      },
    })

    if (existingAppeal) {
      return NextResponse.json(
        { error: 'An active appeal already exists for this dispute' },
        { status: 409 }
      )
    }

    const appeal = await prisma.disputeAppeal.create({
      data: {
        originalDisputeNumber,
        reason,
        notes: notes || null,
        sellerId: session.user.id,
        status: 'SUBMITTED',
      },
      select: {
        id: true,
        originalDisputeNumber: true,
        status: true,
        reason: true,
        notes: true,
        submittedAt: true,
      },
    })

    return NextResponse.json(appeal, { status: 201 })
  } catch (error) {
    console.error('Error creating appeal:', error)
    const prismaResp = prismaErrorResponse(
      error,
      'Failed to create appeal'
    )
    if (prismaResp) return prismaResp

    return NextResponse.json(
      { error: 'Failed to create appeal' },
      { status: 500 }
    )
  }
}
