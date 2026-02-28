import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Limit request body size to 5KB
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 5120) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      );
    }

    const { action = 'view', email, referralCode } = await request.json();

    // Whitelist allowed actions
    const allowedActions = ['view', 'subscribe'];
    if (!allowedActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Get IP and user agent - extract first IP from x-forwarded-for
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (request.headers.get('x-real-ip') || 'unknown');
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Validate and normalize email if provided
    const emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*[a-zA-Z0-9]@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
    let normalizedEmail: string | undefined;
    
    if (email) {
      const trimmedEmail = email.toLowerCase().trim();
      // Reject if email is provided but invalid
      if (!emailRegex.test(trimmedEmail)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
      normalizedEmail = trimmedEmail;
    }
    
    // Validate referral code if provided
    let validReferralCode: string | undefined;
    if (referralCode && /^[A-Z0-9]{7}$/.test(referralCode)) {
      validReferralCode = referralCode;
    }

    // Track the action
    const record = await prisma.comingSoonAnalytics.create({
      data: {
        action,
        email: normalizedEmail,
        ipAddress: ip,
        userAgent,
        referralCode: validReferralCode,
      },
    });

    return NextResponse.json({
      success: true,
      trackingId: record.id,
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track action' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check Bearer token OR admin session
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const cronSecret = process.env.CRON_SECRET;
    
    // Validate: Either valid Bearer token OR admin session
    const hasValidToken = token && cronSecret && token === cronSecret;
    let isAdmin = false;
    
    if (!hasValidToken) {
      const session = await getServerSession(authOptions);
      isAdmin = session?.user?.role === 'ADMIN';
      
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized - Requires Bearer token or Admin session' },
          { status: 401 }
        );
      }
    }

    // Get analytics summary
    const totalViews = await prisma.comingSoonAnalytics.count({
      where: { action: 'view' },
    });
    
    const totalSignups = await prisma.comingSoonAnalytics.count({
      where: { action: 'subscribe' },
    });
    
    const referralSignups = await prisma.comingSoonAnalytics.count({
      where: { 
        action: 'subscribe',
        referralCode: { not: null },
      },
    });

    // Get top referrers using aggregation pipeline (efficient for large datasets)
    const _topReferrersAgg = await prisma.comingSoonEmail.aggregate({
      _count: {
        referredById: true,
      },
      where: {
        referredById: { not: null },
      },
    } as any);

    // Get referrers with most signups
    const topReferrerDetails = await prisma.comingSoonEmail.groupBy({
      by: ['referredById'],
      _count: {
        referredById: true,
      },
      where: {
        referredById: { not: null },
      },
      orderBy: {
        _count: {
          referredById: 'desc',
        },
      },
      take: 10,
    });

    // Get details for these referrers
    const referrerCodes = topReferrerDetails
      .map((r) => r.referredById)
      .filter(Boolean) as string[];

    const referrerDetailsMap = await prisma.comingSoonEmail.findMany({
      where: {
        referralCode: { in: referrerCodes },
      },
      select: {
        email: true,
        firstName: true,
        referralCode: true,
      },
    });

    const referrerDetailsById = new Map(
      referrerDetailsMap.map((r) => [r.referralCode, r])
    );

    const topReferrers = topReferrerDetails
      .map((r) => {
        const details = referrerDetailsById.get(r.referredById || '');
        return {
          email: details?.email || '',
          name: details?.firstName || null,
          code: r.referredById || '',
          referrals: r._count.referredById,
        };
      })
      .filter((r) => r.code);

    return NextResponse.json({
      summary: {
        totalPageViews: totalViews,
        totalSignups: totalSignups,
        signupConversionRate: totalViews > 0 ? `${((totalSignups / totalViews) * 100).toFixed(2)}%` : '0%',
        referralSignups,
        referralConversionRate: totalSignups > 0 ? `${((referralSignups / totalSignups) * 100).toFixed(2)}%` : '0%',
        topReferrers,
      },
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
