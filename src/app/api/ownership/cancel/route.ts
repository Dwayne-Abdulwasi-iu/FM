import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cancelOwnershipPurchase } from '@/lib/ownership-escrow'

/**
 * POST /api/ownership/cancel
 * Cancel an ownership purchase within the escrow period
 * Only the buyer can cancel, and only within 7 days
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
    const { purchaseId } = body

    if (!purchaseId || typeof purchaseId !== 'string' || purchaseId.trim().length === 0) {
      return NextResponse.json(
        { message: 'Valid purchase ID is required' },
        { status: 400 }
      )
    }

    // Attempt to cancel
    const result = await cancelOwnershipPurchase(purchaseId, session.user.id)

    if (!result.success) {
      return NextResponse.json(
        { message: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        message: result.message,
        refundAmount: result.refundAmount
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Cancel ownership purchase error:', error)

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { message: 'Database error - please try again later' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: 'Failed to cancel purchase' },
      { status: 500 }
    )
  }
}
