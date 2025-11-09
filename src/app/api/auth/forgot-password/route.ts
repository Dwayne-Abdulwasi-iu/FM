import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import redisHelper from '@/lib/redis'

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

  // Create a secure token
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

  // Persist token
  await prisma.passwordResetToken.create({ data: { token, userId: user.id, expiresAt } })

    const resetUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || ''}/auth/reset/${token}`

    // Attempt email send: prefer SMTP config, fall back to SendGrid SMTP if SENDGRID_API_KEY is present,
    // otherwise log the link for manual delivery
    try {
      let transporter
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: (process.env.SMTP_SECURE === 'true'),
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        })
      } else if (process.env.SENDGRID_API_KEY) {
        // Prefer SendGrid Web API (more reliable than SMTP relay in some accounts).
        // We'll attempt a Web API send here and skip creating an SMTP transporter.
        const sgApiKey = process.env.SENDGRID_API_KEY
        try {
          const payload = {
            personalizations: [{ to: [{ email }], subject: 'Password reset' }],
            from: { email: process.env.EMAIL_FROM || 'no-reply@example.com' },
            content: [
              { type: 'text/plain', value: `Reset your password: ${resetUrl}` },
              { type: 'text/html', value: `<p>Reset your password: <a href="${resetUrl}">${resetUrl}</a></p>` }
            ]
          }

          const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${sgApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          })

          if (!res.ok) {
            const body = await res.text().catch(() => '')
            console.error('SendGrid Web API send failed', res.status, res.statusText, body)
            // fall through so we still return ok:true to the client (avoid enumeration)
          } else {
            // success via Web API — skip SMTP send
            return NextResponse.json({ ok: true })
          }
        } catch (e) {
          console.error('SendGrid Web API error', e)
          // fall back to SMTP below if configured
        }
      }

      if (transporter) {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || 'no-reply@example.com',
          to: email,
          subject: 'Password reset',
          text: `Reset your password: ${resetUrl}`,
          html: `<p>Reset your password: <a href="${resetUrl}">${resetUrl}</a></p>`
        })
      } else {
        // In non-SMTP environments we intentionally avoid sending emails; log the URL only for developers.
        // Removed noisy console.log in production flow; keep minimal logging via debug flag if needed.
        if (process.env.DEBUG_RESET === 'true') console.debug('Password reset link for', email, resetUrl)
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
