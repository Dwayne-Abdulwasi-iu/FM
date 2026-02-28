import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { isEligibleForProTrial, activateProTrial, getRemainingTrialDays } from '@/lib/pro-trial'
import { sendTrialActivationEmail, sendTrialOTPEmail } from '@/lib/emails/trial'
import { getRedisClient } from '@/lib/redis'
import crypto from 'crypto'

/**
 * GET /api/subscriptions/pro-trial/status
 * Get current user's pro trial status
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        proTrialActivated: true,
        proTrialActivatedAt: true,
        proTrialExpiresAt: true,
      }
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const now = new Date()
    const isTrialActive = user.proTrialActivated && 
                         user.proTrialExpiresAt && 
                         user.proTrialExpiresAt > now

    const remainingDays = await getRemainingTrialDays(session.user.id)
    const isEligible = await isEligibleForProTrial(session.user.id)

    return NextResponse.json({
      isTrialActivated: user.proTrialActivated,
      isTrialActive,
      trialActivatedAt: user.proTrialActivatedAt,
      trialExpiresAt: user.proTrialExpiresAt,
      remainingDays,
      isEligible,
    })
  } catch (error) {
    console.error('[GET /api/subscriptions/pro-trial/status]', error)
    const prismaResp = prismaErrorResponse(error, 'Failed to fetch trial status')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to fetch trial status' }, { status: 500 })
  }
}

/**
 * POST /api/subscriptions/pro-trial/activate
 * 
 * Step 1: Generate verification code
 * Request: { step: 'init' }
 * Response: { verificationId: string, message: string }
 * 
 * Step 2: Verify and activate trial
 * Request: { step: 'verify', verificationCode: string, verificationId: string }
 * Response: { success: boolean, trialExpiresAt: Date }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { step, verificationCode, verificationId } = body

    // STEP 1: Initialize verification
    if (step === 'init') {
      // Check if eligible
      const isEligible = await isEligibleForProTrial(session.user.id)
      if (!isEligible) {
        return NextResponse.json(
          { error: 'You have already activated the free pro trial' },
          { status: 403 }
        )
      }

      // Check if user has phone verified
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          phoneVerified: true,
          phone: true,
          email: true,
          name: true,
        }
      })

      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      // Generate verification code (6 digits)
      const code = crypto.randomInt(100000, 999999).toString()
      const verificationId = crypto.randomBytes(16).toString('hex')

      // Store code in Redis for 10 minutes (REQUIRED - no fallback)
      const redis = getRedisClient()
      if (!redis) {
        console.error('[Pro Trial] FATAL: Redis (REDIS_URL env var) is REQUIRED for trial OTP verification')
        return NextResponse.json(
          { error: 'Verification service unavailable. This feature requires Redis configuration. Contact support if this persists.' },
          { status: 503 }
        )
      }

      const redisKey = `trial:otp:${session.user.id}:${verificationId}`
      await redis.setex(
        redisKey,
        600, // 10 minutes
        JSON.stringify({
          code,
          email: user.email,
          attempts: 0,
          createdAt: new Date().toISOString(),
        })
      )

      // Send OTP email
      const emailSent = await sendTrialOTPEmail(
        user.email,
        user.name || 'Designer',
        code
      )

      if (!emailSent) {
        // Clear Redis key if email fails
        if (redis) {
          await redis.del(`trial:otp:${session.user.id}:${verificationId}`)
        }
        return NextResponse.json(
          { error: 'Failed to send verification code. Please try again.' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        verificationId,
        message: `A 6-digit verification code has been sent to ${user.email}`,
        expiresIn: 600, // 10 minutes in seconds
      })
    }

    // STEP 2: Verify code and activate trial
    if (step === 'verify') {
      if (!verificationCode || !verificationId) {
        return NextResponse.json(
          { error: 'Missing verification code or ID' },
          { status: 400 }
        )
      }

      if (!/^\d{6}$/.test(verificationCode)) {
        return NextResponse.json(
          { error: 'Invalid verification code format' },
          { status: 400 }
        )
      }

      // Retrieve stored OTP from Redis (REQUIRED - no fallback)
      const redis = getRedisClient()
      if (!redis) {
        console.error('[Pro Trial] FATAL: Redis (REDIS_URL env var) is REQUIRED for trial OTP verification')
        return NextResponse.json(
          { error: 'Verification service unavailable. This feature requires Redis configuration. Contact support if this persists.' },
          { status: 503 }
        )
      }

      const redisKey = `trial:otp:${session.user.id}:${verificationId}`
      const storedData = await redis.get(redisKey)

      if (!storedData) {
        return NextResponse.json(
          { error: 'Verification code expired or invalid. Please request a new code.' },
          { status: 400 }
        )
      }

      try {
        const { code: storedCode, attempts } = JSON.parse(storedData)

        // Check if too many attempts
        if (attempts >= 3) {
          await redis.del(redisKey)
          return NextResponse.json(
            { error: 'Too many failed attempts. Please request a new code.' },
            { status: 429 }
          )
        }

        // Verify code
        if (storedCode !== verificationCode) {
          // Increment attempts
          const updatedData = JSON.parse(storedData)
          updatedData.attempts = (updatedData.attempts || 0) + 1
          await redis.setex(redisKey, 600, JSON.stringify(updatedData))

          return NextResponse.json(
            {
              error: 'Invalid verification code',
              attemptsRemaining: 3 - updatedData.attempts,
            },
            { status: 400 }
          )
        }

        // Code is correct - activate trial
        const result = await activateProTrial(session.user.id)

        if (!result.success) {
          return NextResponse.json(
            { error: result.error || 'Failed to activate trial' },
            { status: 400 }
          )
        }

        // Delete used OTP
        await redis.del(redisKey)

        // Get user info for confirmation email
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            email: true,
            name: true,
            proTrialActivatedAt: true,
            proTrialExpiresAt: true,
          }
        })

        if (user) {
          // Send activation confirmation email
          await sendTrialActivationEmail({
            email: user.email!,
            userName: user.name || 'Designer',
            expiresAt: user.proTrialExpiresAt || new Date(),
          })
        }

        return NextResponse.json({
          success: true,
          message: 'Trial activated successfully!',
          expiresAt: result.expiresAt,
        })
      } catch (error) {
        console.error('[Pro Trial] Verification error:', error)
        return NextResponse.json(
          { error: 'Verification failed. Please try again.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Invalid step. Use "init" or "verify"' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[POST /api/subscriptions/pro-trial/activate]', error)
    const prismaResp = prismaErrorResponse(error, 'Failed to activate trial')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to activate trial' }, { status: 500 })
  }
}
