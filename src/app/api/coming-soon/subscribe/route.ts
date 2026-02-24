import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendComingSoonConfirmation } from '@/lib/sendgrid';
import { generateReferralCode, getReferralUrl, isValidReferralCode } from '@/lib/referral';

// Rate limit: Allow 10 signups per hour per IP
const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

const ipRequests = new Map<string, { count: number; resetTime: number }>();

export async function POST(request: NextRequest) {
  try {
    // Limit request body size to 10KB
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10240) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      );
    }

    const body = await request.text();
    
    // Log for debugging
    if (!body) {
      console.error('Empty request body received');
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      );
    }

    let email: string = '';
    let firstName: string | undefined;
    let lastName: string | undefined;
    let country: string | undefined;
    let referralCode: string | undefined;

    try {
      const parsed = JSON.parse(body);
      email = parsed.email;
      firstName = parsed.firstName;
      lastName = parsed.lastName;
      country = parsed.country;
      referralCode = parsed.referralCode;
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Body was:', body);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Normalize and validate email early
    const normalizedEmail = email.toLowerCase().trim();
    // RFC 5322 compliant email regex: no leading/trailing dots, no consecutive dots
    const emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*[a-zA-Z0-9]@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
    
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Validate and trim firstName/lastName with max length
    const maxNameLength = 50;
    const maxCountryLength = 2; // ISO country code
    // Only store names if they're not empty after trimming
    const trimmedFirstName = firstName?.trim() ? firstName.trim().substring(0, maxNameLength) : undefined;
    const trimmedLastName = lastName?.trim() ? lastName.trim().substring(0, maxNameLength) : undefined;
    const trimmedCountry = country?.trim() ? country.trim().substring(0, maxCountryLength) : undefined;

    // Extract IP safely - use first IP from x-forwarded-for if present
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (request.headers.get('x-real-ip') || 'unknown');
    const ip = clientIp;
    const now = Date.now();
    const existing = ipRequests.get(ip);

    // Cleanup expired entries periodically
    if (Math.random() < 0.1) {
      for (const [key, value] of ipRequests.entries()) {
        if (now >= value.resetTime) {
          ipRequests.delete(key);
        }
      }
    }

    if (existing && now < existing.resetTime) {
      if (existing.count >= RATE_LIMIT) {
        return NextResponse.json(
          {
            error:
              'Too many signup attempts. Please try again in an hour.',
          },
          { status: 429 }
        );
      }
      existing.count++;
    } else {
      ipRequests.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }

    // Check if email already exists (using normalized email)
    const existing_email = await prisma.comingSoonEmail.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing_email) {
      return NextResponse.json(
        { 
          message: 'Email already subscribed',
          referralUrl: existing_email.referralCode ? getReferralUrl(existing_email.referralCode) : undefined,
        },
        { status: 409 }
      );
    }

    // Generate unique referral code for new subscriber (use normalized email for consistency)
    const newReferralCode = await generateReferralCode(normalizedEmail);
    
    // Check if they came from a referral link
    let referredByCode: string | undefined;
    if (referralCode && isValidReferralCode(referralCode)) {
      const referrer = await prisma.comingSoonEmail.findFirst({
        where: { referralCode },
        select: { referralCode: true },
      });
      if (referrer?.referralCode) {
        referredByCode = referrer.referralCode; // Store the referral code they used
      }
    }

    // Create record with default status
    const record = await prisma.comingSoonEmail.create({
      data: {
        email: normalizedEmail,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        country: trimmedCountry,
        source: referralCode ? 'referral' : 'coming-soon-page',
        referralCode: newReferralCode,
        referredById: referredByCode, // Store the code of who referred them
        status: 'ACTIVE', // Ensure records are queryable
      },
    });

    // Track the signup in analytics
    try {
      // Validate referral code format before tracking
      let trackingReferralCode: string | undefined;
      if (referralCode && isValidReferralCode(referralCode)) {
        trackingReferralCode = referralCode;
      }

      await prisma.comingSoonAnalytics.create({
        data: {
          action: 'subscribe',
          email: normalizedEmail,
          ipAddress: ip,
          userAgent: request.headers.get('user-agent') || undefined,
          referralCode: trackingReferralCode,
        },
      });
    } catch (analyticsError) {
      // Error tracking silently discarded
    }

    // Send confirmation email via SendGrid
    try {
      const emailSent = await sendComingSoonConfirmation(
        normalizedEmail,
        trimmedFirstName
      );
      
      if (!emailSent) {
        // Email delivery failed but subscription was saved
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the entire request if email fails
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully subscribed! Check your email for updates.',
        referralUrl: getReferralUrl(newReferralCode),
        referralCode: newReferralCode,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Coming soon signup error:', error);

    // Check for database connection issues
    if (error instanceof Error) {
      if (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('database')
      ) {
        return NextResponse.json(
          { error: 'Database temporarily unavailable' },
          { status: 503 }
        );
      }

      // Handle Prisma unique constraint violations (concurrent duplicate signups)
      if (error.message.includes('Unique constraint failed')) {
        return NextResponse.json(
          { error: 'Email already subscribed' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Only allow authenticated admins to view subscribers (for future admin dashboard)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const cronSecret = process.env.CRON_SECRET;
    
    // Validate Bearer token
    if (!token || !cronSecret || token !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get pagination params with validation
    const { searchParams } = new URL(request.url);
    const skipParam = parseInt(searchParams.get('skip') || '0');
    const takeParam = parseInt(searchParams.get('take') || '50');
    
    // Validate pagination parameters
    if (isNaN(skipParam) || skipParam < 0) {
      return NextResponse.json(
        { error: 'Invalid skip parameter' },
        { status: 400 }
      );
    }
    if (isNaN(takeParam) || takeParam < 1) {
      return NextResponse.json(
        { error: 'Invalid take parameter' },
        { status: 400 }
      );
    }
    
    const skip = skipParam;
    const take = Math.min(takeParam, 100);

    const [emails, total] = await Promise.all([
      prisma.comingSoonEmail.findMany({
        where: { status: 'ACTIVE' },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.comingSoonEmail.count({ where: { status: 'ACTIVE' } }),
    ]);

    return NextResponse.json({
      emails,
      total,
      page: Math.floor(skip / take) + 1,
      pages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscribers' },
      { status: 500 }
    );
  }
}
