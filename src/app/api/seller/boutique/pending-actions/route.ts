/**
 * GET /api/seller/boutique/pending-actions
 * Get count of boutique products awaiting seller action for dashboard badge
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPendingActionsCount, getPendingActions } from '@/lib/boutique-notifications'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'

    if (detailed) {
      // Return detailed list of pending actions
      const pendingActions = await getPendingActions(session.user.id)
      return NextResponse.json({
        count: pendingActions.length,
        items: pendingActions,
      })
    } else {
      // Return just the count for badge
      const count = await getPendingActionsCount(session.user.id)
      return NextResponse.json({ count })
    }
  } catch (error) {
    console.error('Error fetching pending actions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending actions' },
      { status: 500 }
    )
  }
}
