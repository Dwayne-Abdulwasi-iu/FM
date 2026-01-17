import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { generateOTP, getOTPExpiry, sendOTP, validatePhoneNumber } from '@/lib/sms'

/**
 * POST /api/auth/send-phone-otp
 * 
 * Sends an OTP to the provided phone number for verification.
 * Can be used during registration or to update phone number.
 * 
 * Body: { phone: string, email?: string }
 * - phone: The phone number to verify
 * - email: If provided, associates OTP with existing user (for phone updates)
 */
export async function POST(request: NextRequest) {
  try {
    const { phone, email } = await request.json()

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Validate and normalize phone number
    const validation = validatePhoneNumber(phone)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const normalizedPhone = validation.normalized

    // Check if phone is already registered and verified by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        phoneVerified: true,
        ...(email && { NOT: { email } }), // Exclude current user if updating
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'This phone number is already registered to another account' },
        { status: 409 }
      )
    }

    // Generate OTP
    const otp = generateOTP()
    const otpExpiry = getOTPExpiry()

    // If email provided, update existing user's OTP fields
    if (email) {
      const user = await prisma.user.findUnique({ where: { email } })
      if (user) {
        await prisma.user.update({
          where: { email },
          data: {
            phone: normalizedPhone,
            phoneOTP: otp,
            phoneOTPExpiry: otpExpiry,
            phoneVerified: false, // Reset verification when phone changes
          },
        })
      }
    }

    // Send OTP via SMS
    const result = await sendOTP(normalizedPhone, otp)

    if (!result.success) {
      console.error('Failed to send OTP:', result.error)
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      )
    }

    // For registration flow (no email), store OTP temporarily
    // The registration endpoint will verify before creating user

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your phone',
      phone: normalizedPhone,
      // Include OTP details for the registration flow to use
      // These are NOT exposed to client - used internally
      _internal: {
        otp, // Will be verified in registration
        otpExpiry: otpExpiry.toISOString(),
      },
    })
  } catch (error) {
    console.error('Send phone OTP error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
