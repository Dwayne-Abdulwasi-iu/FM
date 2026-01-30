// GET /api/cron/process-payouts - Process scheduled seller payouts (1-2 days after delivery)
import { NextRequest, NextResponse } from 'next/server';
import { processScheduledPayouts } from '@/lib/boutique/payout';

/**
 * Cron job to process scheduled payouts
 * Should be called daily from external cron service (e.g., EasyCron, GitHub Actions)
 * 
 * Expected header:
 * Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.warn('CRON_SECRET not configured - skipping payout processing');
      return NextResponse.json(
        { success: false, message: 'CRON_SECRET not configured' },
        { status: 400 }
      );
    }

    if (cronSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Process all scheduled payouts
    const result = await processScheduledPayouts();

    return NextResponse.json({
      success: true,
      message: 'Payouts processed',
      result,
    });

  } catch (error) {
    console.error('Cron payout processing error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
