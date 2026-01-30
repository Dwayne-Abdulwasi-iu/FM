import { NextResponse } from 'next/server'
import { getUSDToNGNRate } from '@/lib/paystack'

/**
 * GET /api/exchange-rates
 * 
 * Fetch current USD to NGN exchange rate for display purposes
 * Used by client components to show converted prices
 */
export async function GET() {
  try {
    const rate = await getUSDToNGNRate()
    
    return NextResponse.json({
      success: true,
      rate,
      source: 'live',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Exchange Rates] Error fetching rate:', error)
    
    // Return fallback rate on error
    return NextResponse.json({
      success: true,
      rate: 1650, // Conservative fallback
      source: 'fallback',
      timestamp: new Date().toISOString(),
    })
  }
}
