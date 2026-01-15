import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/auth/reset-password
 * Validates reset token and updates password
 */
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { message: 'Reset token is required' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { message: 'Password is required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Rate limit: 5 attempts per 15 minutes per token
    const rateLimitKey = `reset-password:${token.substring(0, 16)}`
    const rateLimit = await checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          message: 'Too many reset attempts. Please request a new reset link.',
          retryAfter: rateLimit.resetAt
        },
        { status: 429 }
      )
    }

    // Hash the provided token to match stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex')

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid or expired reset token. Please request a new password reset.' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    })

    // TODO: Send confirmation email
    // await sendPasswordChangedEmail(user.email)

    return NextResponse.json({
      message: 'Password reset successfully. You can now sign in with your new password.'
    })

  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { message: 'An error occurred. Please try again later.' },
      { status: 500 }
    )
  }
}
