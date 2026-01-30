import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { approveRepostRequest, rejectRepostRequest } from '@/lib/boutique/warehouse'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'

    const requests = await prisma.boutiqueRepostRequest.findMany({
      where: {
        status: status as any,
      },
      include: {
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
    })

    return NextResponse.json({ success: true, requests })
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
      return NextResponse.json({ success: true, message: 'Repost approved' })
    } else if (action === 'REJECT') {
      await rejectRepostRequest(requestId, session.user.id, adminNotes)
      return NextResponse.json({ success: true, message: 'Repost rejected' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error processing repost:', error)
    const message = error instanceof Error ? error.message : 'Failed to process request'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
