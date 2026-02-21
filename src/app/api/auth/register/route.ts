import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Validate and normalize phone number
 * Accepts Nigerian numbers (0803... -> +234803...) and international formats
 */
function validatePhoneNumber(phone: string): { valid: boolean; normalized: string; error?: string } {
  // Remove all spaces, dashes, parentheses
  let normalized = phone.replace(/[\s\-\(\)]/g, '')

  // Handle Nigerian local format (0803... -> +234803...)
  if (normalized.startsWith('0') && normalized.length === 11) {
    normalized = '+234' + normalized.slice(1)
  }

  // Ensure it starts with +
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized
  }

  // Basic validation: + followed by 7-15 digits
  const phoneRegex = /^\+\d{7,15}$/
  if (!phoneRegex.test(normalized)) {
    return { 
      valid: false, 
      normalized, 
      error: 'Invalid phone number. Include country code (e.g., +234 for Nigeria)' 
    }
  }

  return { valid: true, normalized }
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * POST /api/auth/register
 *
 * Multi-step OTP registration flow:
 * 1) send-otp: create/update pending user and send email OTP
 * 2) verify-otp: verify OTP code
 * 3) complete-registration: set password and finalize account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, name, email, phone, password, otp } = body

    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 })
    }

    if (action === 'send-otp') {
      if (!name || !email || !phone) {
        return NextResponse.json(
          { error: 'Missing required fields (name, email, phone)' },
          { status: 400 }
        )
      }

      // --- Rate limiting: 5 OTP requests per hour per email ---
      const rateLimitKey = `otp:register:${email}`;
      const rateLimit = await checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000); // 5 per hour
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: `Too many OTP requests. Please wait and try again in ${Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 60000)} minutes.` },
          { status: 429 }
        );
      }

      // --- Resend cooldown: 60 seconds per email ---
      const cooldownKey = `otp:register:cooldown:${email}`;
      const cooldown = await checkRateLimit(cooldownKey, 1, 60 * 1000); // 1 per 60s
      if (!cooldown.allowed) {
        return NextResponse.json(
          { error: `Please wait ${Math.ceil((cooldown.resetAt.getTime() - Date.now()) / 1000)} seconds before requesting another OTP.` },
          { status: 429 }
        );
      }

      const phoneValidation = validatePhoneNumber(phone)
      if (!phoneValidation.valid) {
        return NextResponse.json({ error: phoneValidation.error }, { status: 400 })
      }
      const normalizedPhone = phoneValidation.normalized

      const existingEmail = await prisma.user.findUnique({ where: { email } })
      if (existingEmail && existingEmail.password) {
        return NextResponse.json({ error: 'Email is already registered' }, { status: 400 })
      }

      const existingPhone = await prisma.user.findUnique({ where: { phone: normalizedPhone } })
      if (existingPhone && existingPhone.email !== email) {
        return NextResponse.json({ error: 'Phone number is already registered' }, { status: 400 })
      }

      const otpCode = generateOTP()
      const hashedOTP = hashToken(otpCode)
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000)

      const pendingData = {
        name,
        email,
        phone: normalizedPhone,
        role: 'USER',
        emailVerified: false,
        verifyToken: hashedOTP,
        verifyTokenExpiry: otpExpiry,
      }

      if (existingEmail) {
        await prisma.user.update({
          where: { email },
          data: pendingData,
        })
      } else {
        await prisma.user.create({
          data: pendingData,
        })
      }

      const emailSent = await sendEmail({
        to: email,
        subject: '🔐 Your Fashion Marketplace OTP Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
            <div style="padding: 20px 24px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white;">
              <h2 style="margin:0; font-size: 22px;">Welcome to Fashion Battleground 🎨</h2>
              <p style="margin:8px 0 0; opacity:.9;">Let’s verify your email to continue account setup.</p>
            </div>
            <div style="padding: 24px;">
              <p style="margin:0 0 12px; color:#111827;">Hi ${name || 'there'},</p>
              <p style="margin:0 0 16px; color:#374151;">Use this OTP code to verify your email:</p>
              <div style="text-align:center; margin: 20px 0;">
                <div style="display:inline-block; letter-spacing: 8px; font-size: 30px; font-weight: 800; color:#111827; background:#f3f4f6; padding: 12px 18px; border-radius: 10px;">${otpCode}</div>
              </div>
              <p style="margin:0 0 8px; color:#6b7280;">This code expires in <strong>10 minutes</strong>.</p>
              <p style="margin:0; color:#9ca3af; font-size:12px;">If you did not request this, please ignore this email.</p>
            </div>
          </div>
        `,
      })

      // Log OTP to console if email service isn't configured (development only)
      if (!emailSent) {
        console.log(`[DEV - OTP for ${email}] ${otpCode}`);
      }

      return NextResponse.json({ 
        success: true, 
        message: emailSent 
          ? 'OTP sent to your email.' 
          : 'OTP generated. Check console for code (development mode).',
        ...(process.env.NODE_ENV === 'development' && !emailSent ? { otp: otpCode } : {})
      })
    }

    if (action === 'verify-otp') {
      if (!email || !otp) {
        return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
      }

      const user = await prisma.user.findUnique({ where: { email } })
      if (!user || user.password) {
        return NextResponse.json({ error: 'Registration session not found' }, { status: 400 })
      }

      if (!user.verifyToken || !user.verifyTokenExpiry || user.verifyTokenExpiry < new Date()) {
        return NextResponse.json({ error: 'OTP is invalid or expired. Please request a new one.' }, { status: 400 })
      }

      const otpHash = hashToken(otp)
      if (otpHash !== user.verifyToken) {
        return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 })
      }

      await prisma.user.update({
        where: { email },
        data: {
          emailVerified: true,
          verifyToken: null,
          verifyTokenExpiry: null,
        },
      })

      return NextResponse.json({ success: true, message: 'OTP verified. You can now set your password.' })
    }

    if (action === 'complete-registration') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
      }

      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
      }

      if (password.length > 256) {
        return NextResponse.json({ error: 'Password must be no more than 256 characters' }, { status: 400 })
      }

      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        return NextResponse.json({ error: 'Registration session not found' }, { status: 400 })
      }

      if (user.password) {
        return NextResponse.json({ error: 'Account already created. Please sign in.' }, { status: 400 })
      }

      if (!user.emailVerified) {
        return NextResponse.json({ error: 'Please verify your email OTP first.' }, { status: 400 })
      }

      const hashedPassword = await bcrypt.hash(password, 12)

      const createdUser = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          role: 'USER',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      })

      return NextResponse.json(
        {
          success: true,
          message: 'Account created successfully. You can now sign in.',
          user: createdUser,
        },
        { status: 201 }
      )
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error("Registration error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e: any = error
    
    // Handle duplicate key errors
    if (e?.code === 'P2002') {
      const field = e.meta?.target?.[0] || 'field'
      return NextResponse.json(
        { error: `This ${field} is already registered` },
        { status: 400 }
      )
    }

    if (e && e.code === 'P2031') {
      return NextResponse.json(
        {
          error:
            'Database connection issue. Please try again.'
        },
        { status: 503 }
      )
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { error: 'Database temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Registration failed. Please try again later.' },
      { status: 500 }
    );
  }
}
