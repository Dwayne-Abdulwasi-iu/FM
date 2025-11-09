import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import crypto from 'crypto'
import Sentry from '@/lib/sentry.server'
import redisHelper from '@/lib/redis'
import { sendMail } from '@/lib/mail'

// In-memory fallback rate limiter (per-email) for environments without Redis.
const fpMemoryLimiter = new Map<string, { count: number; firstSeen: number }>()
const FP_EMAIL_LIMIT = 5 // max requests per hour per email
const FP_EMAIL_WINDOW_MS = 1000 * 60 * 60 // 1 hour

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json() as { email?: string }
    if (!email) return NextResponse.json({ message: 'email is required' }, { status: 400 })

    // Rate limit by email when possible (avoid abuse of forgot-password)
    const redis = redisHelper.getRedis()
    if (redis) {
      try {
        const key = `fp:email:${email}`
        const cnt = await redis.incr(key)
        if (cnt === 1) await redis.pexpire(key, FP_EMAIL_WINDOW_MS)
        if (cnt > FP_EMAIL_LIMIT) return NextResponse.json({ message: 'Too many requests' }, { status: 429 })
      } catch (e) {
        // Redis failed: fall through to in-memory limiter
        console.warn('Redis forgot-password limiter error', e)
      }
    } else {
      const record = fpMemoryLimiter.get(email) || { count: 0, firstSeen: Date.now() }
      if (Date.now() - record.firstSeen > FP_EMAIL_WINDOW_MS) {
        record.count = 0
        record.firstSeen = Date.now()
      }
      record.count += 1
      fpMemoryLimiter.set(email, record)
      if (record.count > FP_EMAIL_LIMIT) return NextResponse.json({ message: 'Too many requests' }, { status: 429 })
    }

    // Lookup user - keep response ambiguous to avoid account enumeration
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // pretend success
      return NextResponse.json({ ok: true })
    }

  // Create a one-time numeric OTP (6 digits)
  const otp = String(crypto.randomInt(100000, 1000000))
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10) // 10 minutes

  // Hash the OTP before storing for safety
  const hashed = crypto.createHash('sha256').update(otp).digest('hex')

  // Persist hashed OTP in password reset tokens table
  await prisma.passwordResetToken.create({ data: { token: hashed, userId: user.id, expiresAt } })

    const resetInstructions = `Your password reset code is: ${otp}. It expires in 10 minutes.`

    // Attempt email send: prefer SMTP config, fall back to SendGrid SMTP if SENDGRID_API_KEY is present,
    // otherwise log the link for manual delivery
    try {
      const result = await sendMail({ to: email, subject: 'Password reset code', text: resetInstructions, html: `<p>${resetInstructions}</p>` })
      if (!result.ok) {
        console.error('Send reset code failed', result.status, result.body)
        try {
          const sentryClient = Sentry as unknown as { captureException?: (err: unknown, ctx?: unknown) => void }
          if (sentryClient?.captureException) sentryClient.captureException(new Error('Password reset send failed'), { extra: { result, email } })
        } catch {}
      } else {
        return NextResponse.json({ ok: true })
      }
    } catch (mailErr) {
      console.error('Failed to send reset email:', mailErr)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Forgot password error', err)
    const maybe = prismaErrorResponse(err)
    if (maybe) return maybe
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
