import { NextResponse } from "next/server";
import { getUSDToNGNRate } from "@/lib/paystack";

/**
 * GET /api/exchange-rate - Get current USD to NGN exchange rate
 * Returns the cached or live exchange rate for display purposes
 */
export async function GET() {
  try {
    const rate = await getUSDToNGNRate();
    
    return NextResponse.json({
      rate,
      currency: "NGN",
      base: "USD",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Exchange rate API error:", error);
    
    // Return fallback rate on error
    return NextResponse.json({
      rate: 1372,
      currency: "NGN",
      base: "USD",
      timestamp: new Date().toISOString(),
      fallback: true,
    });
  }
}
