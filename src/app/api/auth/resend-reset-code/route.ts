import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import crypto from 'crypto'
import Sentry from '@/lib/sentry.server'
import redisHelper from '@/lib/redis'
import { sendMail } from '@/lib/mail'

// In-memory fallback limiter for environments without Redis
const resendMemoryLimiter = new Map<string, { count: number; firstSeen: number }>()

// Stricter resend policy: allow 1 resend per 5 minutes per email
const RESEND_LIMIT = 1
const RESEND_WINDOW_MS = 1000 * 60 * 5 // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json() as { email?: string }
    if (!email) return NextResponse.json({ message: 'email is required' }, { status: 400 })

  let limited = false
    // Prefer Redis for distributed rate limiting
    const redisClient = redisHelper.getRedis()
    if (redisClient) {
      try {
        const key = `reset_resend:${email}`
        const cnt = await redisClient.incr(key)
        if (cnt === 1) await redisClient.pexpire(key, RESEND_WINDOW_MS)
        if (cnt > RESEND_LIMIT) limited = true
      } catch (e) {
        console.warn('Redis resend limiter error', e)
      }
    } else {
      // In-memory fallback (best-effort, per-process)
      try {
        const rec = resendMemoryLimiter.get(email) || { count: 0, firstSeen: Date.now() }
        if (Date.now() - rec.firstSeen > RESEND_WINDOW_MS) { rec.count = 0; rec.firstSeen = Date.now() }
        rec.count += 1
        resendMemoryLimiter.set(email, rec)
        if (rec.count > RESEND_LIMIT) limited = true
      } catch (e) {
        console.warn('In-memory resend limiter error', e)
      }
    }

    if (limited) {
      const retrySeconds = Math.ceil(RESEND_WINDOW_MS / 1000)
      return NextResponse.json({ message: 'Too many resend requests', cooldownSeconds: retrySeconds }, { status: 429, headers: { 'Retry-After': String(retrySeconds) } })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ ok: true })

    // Invalidate previous unused tokens
    await prisma.passwordResetToken.updateMany({ where: { userId: user.id, used: false }, data: { used: true } })

    // Create new OTP
    const otp = String(crypto.randomInt(100000, 1000000))
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10) // 10 minutes
    const hashed = crypto.createHash('sha256').update(otp).digest('hex')
    await prisma.passwordResetToken.create({ data: { token: hashed, userId: user.id, expiresAt } })

    const instructions = `Your password reset code is: ${otp}. It expires in 10 minutes.`

    try {
      const result = await sendMail({ to: email, subject: 'Password reset code', text: instructions, html: `<p>${instructions}</p>` })
      const cooldownSeconds = Math.ceil(RESEND_WINDOW_MS / 1000)
      if (!result.ok) {
        console.error('Send reset code failed', result.status, result.body)
        try {
          const sentryClient = Sentry as unknown as { captureException?: (err: unknown, ctx?: unknown) => void }
          if (sentryClient?.captureException) sentryClient.captureException(new Error('Password reset send failed'), { extra: { result, email } })
        } catch {}
        // To avoid account enumeration, still return ok but include cooldown info
        return NextResponse.json({ ok: true, cooldownSeconds })
      }
      // Successful send — return cooldown so client can honor it
      return NextResponse.json({ ok: true, cooldownSeconds })
    } catch (mailErr) {
      console.error('Failed to send reset email:', mailErr)
      const cooldownSeconds = Math.ceil(RESEND_WINDOW_MS / 1000)
      return NextResponse.json({ ok: true, cooldownSeconds })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Resend reset code error', err)
    const maybe = prismaErrorResponse(err)
    if (maybe) return maybe
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
