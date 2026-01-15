import Stripe from "stripe";

// Lazy initialization to prevent startup errors when STRIPE_SECRET_KEY is not set
let stripeInstance: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2023-10-16"
    });
  }
  return stripeInstance;
}

interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
  provider: "stripe" | "paystack";
}

/**
 * Process a refund via Stripe
 * @param paymentIntentId - The Stripe payment intent ID
 * @param amountInCents - Amount to refund in cents (for partial refunds)
 */
export async function processStripeRefund(
  paymentIntentId: string,
  amountInCents?: number
): Promise<RefundResult> {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Stripe not configured");
      return { success: false, error: "Stripe not configured", provider: "stripe" };
    }

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId
    };

    // If amount specified, it's a partial refund
    if (amountInCents) {
      refundParams.amount = amountInCents;
    }

    const refund = await getStripeClient().refunds.create(refundParams);

    return {
      success: refund.status === "succeeded" || refund.status === "pending",
      refundId: refund.id,
      provider: "stripe"
    };
  } catch (error) {
    console.error("Stripe refund error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      provider: "stripe"
    };
  }
}

/**
 * Process a refund via Paystack
 * @param transactionReference - The Paystack transaction reference
 * @param amount - Amount to refund (in the original currency)
 */
export async function processPaystackRefund(
  transactionReference: string,
  amount?: number
): Promise<RefundResult> {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      console.error("Paystack not configured");
      return { success: false, error: "Paystack not configured", provider: "paystack" };
    }

    // First, get the transaction details
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${transactionReference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const verifyData = await verifyResponse.json();
    
    if (!verifyData.status || !verifyData.data) {
      return {
        success: false,
        error: "Could not verify transaction",
        provider: "paystack"
      };
    }

    const transactionId = verifyData.data.id;

    // Create refund request
    const refundBody: Record<string, unknown> = {
      transaction: transactionId
    };

    // If amount specified (in original currency, e.g., NGN), convert to kobo
    if (amount) {
      refundBody.amount = Math.round(amount * 100); // Convert to kobo
    }

    const refundResponse = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(refundBody)
    });

    const refundData = await refundResponse.json();

    if (refundData.status && refundData.data) {
      return {
        success: true,
        refundId: refundData.data.id?.toString() || refundData.data.reference,
        provider: "paystack"
      };
    }

    return {
      success: false,
      error: refundData.message || "Refund failed",
      provider: "paystack"
    };
  } catch (error) {
    console.error("Paystack refund error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      provider: "paystack"
    };
  }
}

/**
 * Check refund status for Stripe
 */
export async function checkStripeRefundStatus(refundId: string): Promise<{
  status: string;
  amount?: number;
}> {
  try {
    const refund = await getStripeClient().refunds.retrieve(refundId);
    return {
      status: refund.status || "unknown",
      amount: refund.amount ? refund.amount / 100 : undefined
    };
  } catch (error) {
    console.error("Error checking Stripe refund:", error);
    return { status: "error" };
  }
}

/**
 * Check refund status for Paystack
 */
export async function checkPaystackRefundStatus(refundId: string): Promise<{
  status: string;
  amount?: number;
}> {
  try {
    const response = await fetch(
      `https://api.paystack.co/refund/${refundId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const data = await response.json();

    if (data.status && data.data) {
      return {
        status: data.data.status,
        amount: data.data.amount ? data.data.amount / 100 : undefined
      };
    }

    return { status: "unknown" };
  } catch (error) {
    console.error("Error checking Paystack refund:", error);
    return { status: "error" };
  }
}
