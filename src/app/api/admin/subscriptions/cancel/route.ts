import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

/**
 * POST /api/admin/subscriptions/cancel
 * Cancel a user's subscription (admin only)
 * 
 * Body: {
 *   userId: string,
 *   reason?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (admin?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, reason } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, proSubscriptionActive: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Cancel subscription
    await prisma.user.update({
      where: { id: userId },
      data: {
        proSubscriptionActive: false,
        proSubscriptionExpiresAt: new Date() // Set to past date
      }
    })

    console.log(`[Admin] Cancelled subscription for ${user.email}. Reason: ${reason || 'No reason provided'}`)

    return NextResponse.json({
      success: true,
      message: `Subscription cancelled for ${user.email}`
    })
  } catch (error) {
    console.error('[POST /api/admin/subscriptions/cancel]', error)
    const prismaResp = prismaErrorResponse(error, 'Failed to cancel subscription')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
  }
}
