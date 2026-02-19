// GET /api/cron/process-payouts - Process scheduled seller payouts (1-2 days after delivery)
import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { processScheduledPayouts } from '@/lib/boutique/payout'

/**
 * Cron job to process scheduled seller payouts
 * Should be called daily from external cron service (e.g., EasyCron, GitHub Actions, Render)
 * 
 * Authorization: Bearer <CRON_SECRET>
 * 
 * Example:
 * curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
 *   http://localhost:3000/api/cron/process-payouts
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret using unified auth
    const auth = await verifyCronSecret(request)
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.reason },
        { status: 401 }
      )
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
