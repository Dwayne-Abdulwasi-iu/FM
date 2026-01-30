import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

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
  const phoneRegex = /^\+[1-9]\d{6,14}$/
  if (!phoneRegex.test(normalized)) {
    return { 
      valid: false, 
      normalized, 
      error: 'Invalid phone number. Include country code (e.g., +234 for Nigeria)' 
    }
  }

  return { valid: true, normalized }
}

/**
 * POST /api/auth/register
 * 
 * Simple single-step registration.
 * Phone is required but not OTP-verified (admin can contact via email if phone fails).
 */
export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password } = await request.json()
    // SECURITY: Role is always USER - never accept from client to prevent privilege escalation
    const role = "USER";

    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: "Missing required fields (name, email, phone, password)" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (password.length > 256) {
      return NextResponse.json(
        { error: "Password must be no more than 256 characters" },
        { status: 400 }
      );
    }

    // Validate and normalize phone number
    const phoneValidation = validatePhoneNumber(phone)
    if (!phoneValidation.valid) {
      return NextResponse.json(
        { error: phoneValidation.error },
        { status: 400 }
      )
    }
    const normalizedPhone = phoneValidation.normalized

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email is already registered" },
        { status: 400 }
      );
    }

    // Check if phone already exists
    const existingPhone = await prisma.user.findUnique({
      where: { phone: normalizedPhone }
    });

    if (existingPhone) {
      return NextResponse.json(
        { error: "Phone number is already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: normalizedPhone,
        password: hashedPassword,
        role: role.toUpperCase(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ 
      success: true,
      message: "Account created successfully. You can now sign in.",
      user 
    }, { status: 201 });

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
