import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { approveRepostRequest, rejectRepostRequest } from '@/lib/boutique/warehouse'
import prisma from '@/lib/prisma'

// Simple in-memory cache for PENDING requests (5 second TTL)
const cache: { data: unknown[] | null; timestamp: number; TTL: number } = {
  data: null,
  timestamp: 0,
  TTL: 5000 // 5 seconds
}

function isCacheValid() {
  return cache.data && Date.now() - cache.timestamp < cache.TTL
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Cap at 100
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const skip = (page - 1) * limit

    // Check cache for PENDING requests on page 1
    if (status === 'PENDING' && page === 1 && isCacheValid()) {
      return NextResponse.json(
        { success: true, requests: cache.data, cached: true },
        { headers: { 'Cache-Control': 'private, max-age=5' } }
      )
    }

    // Optimized query with pagination
    const requests = await prisma.boutiqueRepostRequest.findMany({
      where: {
        status: status as string,
      },
      select: {
        id: true,
        productId: true,
        sellerId: true,
        reason: true,
        notes: true,
        originalStock: true,
        requestedStock: true,
        approvedStock: true,
        status: true,
        adminNotes: true,
        reviewedAt: true,
        daysInWarehouse: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            title: true,
            basePrice: true,
            thumbnailUrl: true,
            receivedByAdminAt: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: skip,
    })

    // Update cache for PENDING status
    if (status === 'PENDING' && page === 1) {
      cache.data = requests
      cache.timestamp = Date.now()
    }

    return NextResponse.json(
      { success: true, requests, page, limit },
      { headers: { 'Cache-Control': 'private, max-age=5' } }
    )
  } catch (error) {
    console.error('Error fetching repost requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { requestId, action, adminNotes } = await request.json()

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'requestId and action required' },
        { status: 400 }
      )
    }

    if (action === 'APPROVE') {
      await approveRepostRequest(requestId, session.user.id, adminNotes)
      // Invalidate cache after approval
      cache.data = null
      cache.timestamp = 0
      return NextResponse.json({ success: true, message: 'Repost approved' })
    } else if (action === 'REJECT') {
      await rejectRepostRequest(requestId, session.user.id, adminNotes)
      // Invalidate cache after rejection
      cache.data = null
      cache.timestamp = 0
      return NextResponse.json({ success: true, message: 'Repost rejected' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error processing repost:', error)
    const message = error instanceof Error ? error.message : 'Failed to process request'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
