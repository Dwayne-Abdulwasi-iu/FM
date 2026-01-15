import { NextResponse } from 'next/server';
import { getReferralLeaderboard } from '@/lib/referral-service';

/**
 * GET /api/referrals/leaderboard - Get referral leaderboard
 */
export async function GET() {
  try {
    const leaderboard = await getReferralLeaderboard(20);
    
    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
