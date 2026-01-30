import { NextResponse } from "next/server";
import { isStripeConfigured } from "@/lib/stripe";
import { isPaystackConfigured } from "@/lib/paystack";

/**
 * GET /api/commission-requests/payment-methods
 * Returns available payment methods for commissions
 */
export async function GET() {
  try {
    const methods = {
      stripe: isStripeConfigured(),
      paystack: isPaystackConfigured(),
    };

    // Ensure at least one payment method is available
    const hasAvailableMethod = Object.values(methods).some(available => available);
    
    if (!hasAvailableMethod) {
      return NextResponse.json(
        { 
          error: "No payment methods are currently configured",
          methods,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ methods });
  } catch (error) {
    console.error("Error retrieving payment methods:", error);
    return NextResponse.json(
      { error: "Failed to retrieve payment methods" },
      { status: 500 }
    );
  }
}
