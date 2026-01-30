import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDesignsInEscrow } from '@/lib/ownership-escrow'

/**
 * GET /api/ownership/escrow
 * Get all designs the buyer has in escrow (within 7-day inspection period)
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

    // Get all designs in escrow for this buyer
    const designsInEscrow = await getDesignsInEscrow(session.user.id)

    return NextResponse.json({
      count: designsInEscrow.length,
      designs: designsInEscrow,
      message: designsInEscrow.length > 0 
        ? `You have ${designsInEscrow.length} design(s) in the 7-day inspection period`
        : 'No designs currently in escrow'
    })
  } catch (error) {
    console.error('Get escrow designs error:', error)

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { message: 'Database error - please try again later' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: 'Failed to fetch escrow designs' },
      { status: 500 }
    )
  }
}
