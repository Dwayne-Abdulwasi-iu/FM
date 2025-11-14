import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import redisHelper from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json() as { email?: string; otp?: string }
    if (!email || !otp) return NextResponse.json({ message: 'email and otp required' }, { status: 400 })

    const redis = redisHelper.getRedis()
    const key = `signup_otp:${email.toLowerCase()}`
    let record: { token: string; name?: string } | null = null

    if (redis) {
      const raw = await redis.get(key)
      if (raw) {
        try { record = JSON.parse(raw) } catch {}
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = globalThis as { __signupOtps?: Record<string, { token: string; name?: string; expiresAt: number }> }
      const mem = g.__signupOtps || {}
      record = mem[key] || null
    }

    if (!record) return NextResponse.json({ message: 'Invalid or expired code' }, { status: 400 })

    const hashed = crypto.createHash('sha256').update(String(otp)).digest('hex')
    if (hashed !== record.token) return NextResponse.json({ message: 'Invalid code' }, { status: 400 })

    // mark verified in Redis so next step can complete signup
    const verifiedKey = `signup_verified:${email.toLowerCase()}`
    if (redis) {
      await redis.set(verifiedKey, JSON.stringify({ verifiedAt: Date.now(), name: record.name || '' }), 'PX', 1000 * 60 * 10)
      // remove OTP key
      await redis.del(key)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g2 = globalThis as { __signupOtpsVerified?: Record<string, { verifiedAt: number; name: string; expiresAt: number }> }
      g2.__signupOtpsVerified = g2.__signupOtpsVerified || {}
      g2.__signupOtpsVerified[verifiedKey] = { verifiedAt: Date.now(), name: record.name || '', expiresAt: Date.now() + 1000 * 60 * 10 }
      try { delete mem[key] } catch {}
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('verify-signup-otp error', err)
    return NextResponse.json({ message: 'Failed' }, { status: 500 })
  }
}
