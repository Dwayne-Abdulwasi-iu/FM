import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import redisHelper from '@/lib/redis'

// In-memory fallback for attempt tracking when Redis isn't available
const verifyAttemptsMemory = new Map<string, { count: number; expiresAt: number }>()
const MAX_VERIFY_ATTEMPTS = 5

export async function POST(request: NextRequest) {
  try {
    const { email, otp, password } = await request.json() as { email?: string, otp?: string, password?: string }
    if (!email || !otp || !password) return NextResponse.json({ message: 'email, otp and password are required' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ message: 'Invalid code or user' }, { status: 400 })

    const hashed = crypto.createHash('sha256').update(String(otp)).digest('hex')

    // Find a matching, unused, non-expired token
    const tokenRecord = await prisma.passwordResetToken.findFirst({ where: { userId: user.id, token: hashed, used: false, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } })
    if (!tokenRecord) {
      // Failed attempt: track by user/email and invalidate all tokens after too many failures
      const redis = redisHelper.getRedis()
      const attemptKeyEmail = `reset_attempts_email:${user.id}`
      if (redis) {
        try {
          const attempts = await redis.incr(attemptKeyEmail)
          // expire attempts after 10 minutes to match OTP window
          if (attempts === 1) await redis.pexpire(attemptKeyEmail, 1000 * 60 * 10)
          if (attempts > MAX_VERIFY_ATTEMPTS) {
            await prisma.passwordResetToken.updateMany({ where: { userId: user.id, used: false }, data: { used: true } })
            return NextResponse.json({ message: 'Too many attempts. Codes invalidated.' }, { status: 429 })
          }
        } catch (e) {
          console.warn('Redis attempt counter failed', e)
        }
      } else {
        const rec = verifyAttemptsMemory.get(user.id) || { count: 0, expiresAt: Date.now() + 1000 * 60 * 10 }
        if (Date.now() > rec.expiresAt) { rec.count = 0; rec.expiresAt = Date.now() + 1000 * 60 * 10 }
        rec.count += 1
        verifyAttemptsMemory.set(user.id, rec)
        if (rec.count > MAX_VERIFY_ATTEMPTS) {
          await prisma.passwordResetToken.updateMany({ where: { userId: user.id, used: false }, data: { used: true } })
          return NextResponse.json({ message: 'Too many attempts. Codes invalidated.' }, { status: 429 })
        }
      }

      return NextResponse.json({ message: 'Invalid or expired code' }, { status: 400 })
    }

    // Hash the new password and update user
    const saltRounds = 10
    const newHash = await bcrypt.hash(password, saltRounds)
    await prisma.user.update({ where: { id: user.id }, data: { password: newHash } })

    // Mark token used
    await prisma.passwordResetToken.update({ where: { id: tokenRecord.id }, data: { used: true } })

    // Clear attempt counters for this user/email
    try {
      const redis2 = redisHelper.getRedis()
      if (redis2) await redis2.del(`reset_attempts_email:${user.id}`)
      verifyAttemptsMemory.delete(user.id)
    } catch (e) {
      console.warn('Failed clearing verify attempt counters', e)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Reset password OTP error', err)
    const maybe = prismaErrorResponse(err)
    if (maybe) return maybe
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
