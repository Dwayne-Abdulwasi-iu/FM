import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { checkAndUpdateSellerTier } from '@/lib/tier-management'

/**
 * Admin endpoint for managing user pro trials
 * 
 * PATCH - Reset, extend, or revoke trials
 * GET - Fetch trial information
 * 
 * Protected: Admin only
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check admin role
  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  })

  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { userId } = await params

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        proTrialActivated: true,
        proTrialActivatedAt: true,
        proTrialExpiresAt: true,
        totalEarnings: true,
        createdAt: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const now = new Date()
    const isActive = user.proTrialActivated && 
      user.proTrialExpiresAt && 
      user.proTrialExpiresAt > now

    const daysRemaining = user.proTrialExpiresAt && user.proTrialExpiresAt > now
      ? Math.ceil((user.proTrialExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        totalEarnings: user.totalEarnings,
        createdAt: user.createdAt,
      },
      trial: {
        isActive,
        activated: user.proTrialActivated,
        activatedAt: user.proTrialActivatedAt,
        expiresAt: user.proTrialExpiresAt,
        daysRemaining,
      }
    })
  } catch (error) {
    console.error('[Admin Trial GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch trial info' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check admin role
  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  })

  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { userId } = await params

  try {
    const body = await req.json()
    const { action, reason } = body

    if (!action || !['reset', 'extend', 'revoke'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: reset, extend, or revoke' },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required for audit trail' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let updateData: any = {}
    let logMessage = ''

    switch (action) {
      case 'reset':
        // Deactivate and re-activate trial (resetting the 30-day clock)
        updateData = {
          proTrialActivated: true,
          proTrialActivatedAt: new Date(),
          proTrialExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        }
        logMessage = `[Admin] Reset trial for ${user.email} - Reason: ${reason}`
        break

      case 'extend':
        // Add 30 more days to current expiry
        const currentExpiry = await prisma.user.findUnique({
          where: { id: userId },
          select: { proTrialExpiresAt: true }
        })

        const baseDate = currentExpiry?.proTrialExpiresAt || new Date()
        updateData = {
          proTrialActivated: true,
          proTrialExpiresAt: new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        }
        logMessage = `[Admin] Extended trial for ${user.email} by 30 days - Reason: ${reason}`
        break

      case 'revoke':
        // Immediately deactivate trial
        updateData = {
          proTrialActivated: false,
          proTrialExpiresAt: new Date(), // Set to now (expired)
          proTrialActivatedAt: null,
        }
        logMessage = `[Admin] Revoked trial for ${user.email} - Reason: ${reason}`
        break
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        proTrialActivated: true,
        proTrialActivatedAt: true,
        proTrialExpiresAt: true,
      }
    })

    // If revoked, recalculate tier
    if (action === 'revoke') {
      await checkAndUpdateSellerTier(userId)
    }

    // Log admin action
    console.log(logMessage)

    // TODO: Store audit log in database
    // Requires AdminAuditLog model in schema:
    // - adminId (who made the change)
    // - action (trial_management)
    // - targetUserId (affected user)
    // - details (JSON: action, reason, trial info)
    // - timestamp
    // 
    // Example implementation:
    // if (prisma.adminAuditLog) {
    //   await prisma.adminAuditLog.create({
    //     data: {
    //       adminId: session.user.id,
    //       action: 'trial_management',
    //       targetUserId: userId,
    //       details: { action, reason },
    //       createdAt: new Date(),
    //     }
    //   })
    // }

    return NextResponse.json({
      success: true,
      message: `Trial ${action} successful`,
      trial: updatedUser,
    })
  } catch (error) {
    console.error('[Admin Trial PATCH] Error:', error)
    const prismaResp = prismaErrorResponse(error, 'Database operation failed')
    if (prismaResp) return prismaResp

    return NextResponse.json({ error: 'Failed to update trial' }, { status: 500 })
  }
}
