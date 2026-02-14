import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email'

/**
 * POST /api/auth/forgot-password
 * Generates a password reset token and sends reset instructions
 * Rate limited to prevent abuse
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      )
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Rate limit: 3 requests per 15 minutes per email
    const rateLimitKey = `forgot-password:${normalizedEmail}`
    const rateLimit = await checkRateLimit(rateLimitKey, 3, 15 * 60 * 1000)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          message: 'Too many password reset requests. Please try again later.',
          retryAfter: rateLimit.resetAt
        },
        { status: 429 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex')
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Store hashed token in database
      const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex')

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: hashedToken,
          resetTokenExpiry
        }
      })

      // In production, send email with reset link
      // For now, log the token (remove in production!)
      console.log(`Password reset token for ${normalizedEmail}: ${resetToken}`)
      
      // Send password reset email
      const baseUrl = process.env.NEXTAUTH_URL || 'https://fashionmarketplace.example.com'
      const resetLink = `${baseUrl}/auth/reset-password?token=${resetToken}`
      
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Instructions',
        html: `
          <h2>Reset Your Password</h2>
          <p>Hello ${user.name || 'User'},</p>
          <p>You requested a password reset for your account. Click the link below to reset your password.</p>
          
          <p>
            <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
              Reset Password
            </a>
          </p>
          
          <p>Or copy this link: <code>${resetLink}</code></p>
          
          <p><strong>This link will expire in 1 hour.</strong></p>
          
          <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        `,
      })
    }

    // Always return success (prevents email enumeration)
    return NextResponse.json({
      message: 'If an account exists with this email, you will receive password reset instructions.'
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { message: 'An error occurred. Please try again later.' },
      { status: 500 }
    )
  }
}
