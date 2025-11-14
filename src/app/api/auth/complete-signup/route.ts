import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import redisHelper from '@/lib/redis'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json() as { name?: string; email?: string; password?: string }
    if (!email || !password) return NextResponse.json({ message: 'email and password required' }, { status: 400 })

    const redis = redisHelper.getRedis()
    const verifiedKey = `signup_verified:${email.toLowerCase()}`
    let verified = false
    let savedName: string | undefined

    if (redis) {
      const raw = await redis.get(verifiedKey)
      if (raw) {
        try { const p = JSON.parse(raw); verified = true; savedName = p.name } catch {}
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = globalThis as { __signupOtpsVerified?: Record<string, { verifiedAt: number; name: string; expiresAt: number }> }
      const mem = g.__signupOtpsVerified || {}
      const v = mem[verifiedKey]
      if (v && v.expiresAt > Date.now()) { verified = true; savedName = v.name }
    }

    if (!verified) return NextResponse.json({ message: 'OTP not verified or expired' }, { status: 400 })

    // ensure user not already present
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ message: 'User already exists' }, { status: 400 })

    const hash = await bcrypt.hash(password, 12)
    const created = await prisma.user.create({ data: { name: name || savedName || 'User', email, password: hash, isVerified: true } , select: { id: true, email: true, name: true }})

    // remove verified token
    try {
      if (redis) await redis.del(verifiedKey)
      else try { delete mem[verifiedKey] } catch {}
    } catch {}

    return NextResponse.json({ ok: true, user: created }, { status: 201 })
  } catch (err) {
    console.error('complete-signup error', err)
    return NextResponse.json({ message: 'Failed' }, { status: 500 })
  }
}
