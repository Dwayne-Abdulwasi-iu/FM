/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json() as { token?: string; password?: string }
    if (!token || !password) return NextResponse.json({ message: 'token and password are required' }, { status: 400 })

    // Find token record
    const tokenRec = await (prisma as any).passwordResetToken.findUnique({ where: { token } })
    if (!tokenRec) return NextResponse.json({ message: 'Invalid or expired token' }, { status: 400 })

    if (tokenRec.used) return NextResponse.json({ message: 'Token already used' }, { status: 400 })
    if (new Date(tokenRec.expiresAt) < new Date()) return NextResponse.json({ message: 'Token expired' }, { status: 400 })

    // Update user password
    const hashed = await bcrypt.hash(password, 10)
    await prisma.user.update({ where: { id: tokenRec.userId }, data: { password: hashed } })

    // Mark token used
    await (prisma as any).passwordResetToken.update({ where: { token }, data: { used: true } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Reset password error', err)
    const maybe = prismaErrorResponse(err)
    if (maybe) return maybe
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
