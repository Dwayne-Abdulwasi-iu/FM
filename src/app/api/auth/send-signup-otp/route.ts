import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import redisHelper from '@/lib/redis'
import { sendMail } from '@/lib/mail'

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function POST(request: NextRequest) {
  try {
    const { name, email } = await request.json() as { name?: string; email?: string }
    if (!email || !name) return NextResponse.json({ message: 'name and email required' }, { status: 400 })

    // Basic existing user check omitted here to avoid account enumeration — caller should handle messaging.
    const code = generateCode()
    const hashed = crypto.createHash('sha256').update(String(code)).digest('hex')

    const redis = redisHelper.getRedis()
    const key = `signup_otp:${email.toLowerCase()}`
    const payload = JSON.stringify({ token: hashed, name, createdAt: Date.now() })

    if (redis) {
      // store hashed token with TTL (10 minutes)
      await redis.set(key, payload, 'PX', 1000 * 60 * 10)
    } else {
      // fallback: store in global memory (best-effort for dev/test)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = globalThis as { __signupOtps?: Record<string, { token: string; name: string; expiresAt: number }> }
      g.__signupOtps = g.__signupOtps || {}
      g.__signupOtps[key] = { token: hashed, name, expiresAt: Date.now() + 1000 * 60 * 10 }
    }

    // send email with code (best-effort)
    try {
      const subject = 'Your Fashion Marketplace verification code'
      const text = `Your verification code is: ${code}\nIt expires in 10 minutes.`
      await sendMail({ to: email, subject, text })
    } catch (err) {
      console.warn('Failed sending signup OTP mail', err)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('send-signup-otp error', err)
    return NextResponse.json({ message: 'Failed' }, { status: 500 })
  }
}
