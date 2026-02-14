import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email'

/**
 * POST /api/auth/send-verification
 * Sends email verification token to current user
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'You must be signed in to verify your email' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Rate limit: 3 requests per hour
    const rateLimitKey = `verify-email:${userId}`
    const rateLimit = await checkRateLimit(rateLimitKey, 3, 60 * 60 * 1000)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          message: 'Too many verification requests. Please try again later.',
          retryAfter: rateLimit.resetAt
        },
        { status: 429 }
      )
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true,
        name: true,
        emailVerified: true 
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 400 }
      )
    }

    // Generate verification token
    const verifyToken = crypto.randomBytes(32).toString('hex')
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store hashed token
    const hashedToken = crypto
      .createHash('sha256')
      .update(verifyToken)
      .digest('hex')

    await prisma.user.update({
      where: { id: userId },
      data: {
        verifyToken: hashedToken,
        verifyTokenExpiry
      }
    })

    // In production, send email with verification link
    console.log(`Email verification token for ${user.email}: ${verifyToken}`)
    
    // Send verification email
    const baseUrl = process.env.NEXTAUTH_URL || 'https://fashionmarketplace.example.com'
    const verificationLink = `${baseUrl}/auth/verify-email?token=${verifyToken}`
    
    await sendEmail({
      to: user.email,
      subject: 'Verify Your Email Address',
      html: `
        <h2>Email Verification Required</h2>
        <p>Hello ${user.name || 'User'},</p>
        <p>Thank you for signing up! Please verify your email address to complete your account setup.</p>
        
        <p>
          <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
            Verify Email Address
          </a>
        </p>
        
        <p>Or copy this link: <code>${verificationLink}</code></p>
        
        <p><strong>This link will expire in 24 hours.</strong></p>
        
        <p>If you did not create this account, please ignore this email.</p>
      `,
    })

    return NextResponse.json({
      message: 'Verification email sent. Please check your inbox.'
    })

  } catch (error) {
    console.error('Send verification error:', error)
    return NextResponse.json(
      { message: 'Failed to send verification email' },
      { status: 500 }
    )
  }
}
