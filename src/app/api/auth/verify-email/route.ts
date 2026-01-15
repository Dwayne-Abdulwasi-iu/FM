import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/auth/verify-email
 * Verifies email using the token from the verification link
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { message: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Rate limit: 10 attempts per 15 minutes per token prefix
    const rateLimitKey = `verify-token:${token.substring(0, 16)}`
    const rateLimit = await checkRateLimit(rateLimitKey, 10, 15 * 60 * 1000)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          message: 'Too many verification attempts. Please try again later.',
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

    // Find user with valid verification token
    const user = await prisma.user.findFirst({
      where: {
        verifyToken: hashedToken,
        verifyTokenExpiry: {
          gt: new Date()
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid or expired verification token. Please request a new one.' },
        { status: 400 }
      )
    }

    // Mark email as verified and clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verifyToken: null,
        verifyTokenExpiry: null
      }
    })

    return NextResponse.json({
      message: 'Email verified successfully! You can now access all features.'
    })

  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.json(
      { message: 'Failed to verify email' },
      { status: 500 }
    )
  }
}
