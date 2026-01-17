import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * POST /api/auth/verify-phone-otp
 * 
 * Verifies the OTP entered by user.
 * Used for:
 * 1. Existing users updating their phone number (requires session)
 * 2. Called internally during registration (OTP verified before account creation)
 * 
 * Body: { otp: string, email?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { otp, email } = await request.json()

    if (!otp) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      )
    }

    // Get session if available (for existing users updating phone)
    const session = await getServerSession(authOptions)
    const userEmail = email || session?.user?.email

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email is required for verification' },
        { status: 400 }
      )
    }

    // Find user and check OTP
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        phone: true,
        phoneOTP: true,
        phoneOTPExpiry: true,
        phoneVerified: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.phoneVerified) {
      return NextResponse.json({
        success: true,
        message: 'Phone number is already verified',
        verified: true,
      })
    }

    if (!user.phoneOTP || !user.phoneOTPExpiry) {
      return NextResponse.json(
        { error: 'No verification code found. Please request a new one.' },
        { status: 400 }
      )
    }

    // Check if OTP has expired
    if (new Date() > user.phoneOTPExpiry) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Verify OTP
    if (user.phoneOTP !== otp) {
      return NextResponse.json(
        { error: 'Invalid verification code. Please try again.' },
        { status: 400 }
      )
    }

    // OTP is valid - mark phone as verified and clear OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerified: true,
        phoneOTP: null,
        phoneOTPExpiry: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully',
      verified: true,
    })
  } catch (error) {
    console.error('Verify phone OTP error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
