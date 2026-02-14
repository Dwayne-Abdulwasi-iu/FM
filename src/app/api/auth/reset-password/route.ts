import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email'

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

    if (password.length > 256) {
      return NextResponse.json(
        { message: 'Password must be no more than 256 characters' },
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

    // Send confirmation email
    const baseUrl = process.env.NEXTAUTH_URL || 'https://fashionmarketplace.example.com'
    await sendEmail({
      to: user.email,
      subject: 'Password Changed Successfully',
      html: `
        <h2>Password Reset Confirmation</h2>
        <p>Hello ${user.name || 'User'},</p>
        <p>Your password has been successfully reset.</p>
        
        <p>If you did not request this change, please contact our support team immediately.</p>
        
        <p>
          <a href="${baseUrl}/auth/signin" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
            Sign In
          </a>
        </p>
        
        <p>Thank you for keeping your account secure.</p>
      `,
    })

    return NextResponse.json({
      message: 'Password reset successfully. You can now sign in with your new password.'
    })

  } catch (error) {
    console.error('Reset password error:', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { message: 'Invalid request format' },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { message: 'Database temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: 'Password reset failed. Please try again later.' },
      { status: 500 }
    )
  }
}
