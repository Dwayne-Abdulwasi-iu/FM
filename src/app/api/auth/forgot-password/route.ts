/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json() as { email?: string }
    if (!email) return NextResponse.json({ message: 'email is required' }, { status: 400 })

    // Lookup user - keep response ambiguous to avoid account enumeration
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // pretend success
      return NextResponse.json({ ok: true })
    }

    // Create a secure token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

  // passwordResetToken model added to Prisma schema. Use any-cast to avoid needing a generated client in this commit.
  await (prisma as any).passwordResetToken.create({ data: { token, userId: user.id, expiresAt } })

    const resetUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || ''}/auth/reset/${token}`

    // Attempt email send if SMTP config present, otherwise log the link for manual delivery
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: (process.env.SMTP_SECURE === 'true'),
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        })

        await transporter.sendMail({
          from: process.env.EMAIL_FROM || 'no-reply@example.com',
          to: email,
          subject: 'Password reset',
          text: `Reset your password: ${resetUrl}`,
          html: `<p>Reset your password: <a href="${resetUrl}">${resetUrl}</a></p>`
        })
      } catch (mailErr) {
        console.error('Failed to send reset email:', mailErr)
      }
    } else {
      console.log('Password reset link for', email, resetUrl)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Forgot password error', err)
    const maybe = prismaErrorResponse(err)
    if (maybe) return maybe
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
