import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { isPaystackConfigured, getUSDToNGNRate } from "@/lib/paystack";
import { checkRateLimit, paymentRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";
import { getCommissionRate } from "@/lib/commission-tiers";

/**
 * POST /api/commission-requests/pay - Initiate payment for a commission
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, paymentMethod } = body;

    if (!requestId) {
      return NextResponse.json({ error: "Request ID required" }, { status: 400 });
    }

    // Database-backed rate limit check - max 5 payment attempts per commission per hour
    const rateLimitKey = paymentRateLimitKey(session.user.id, requestId);
    const rateLimitResult = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.PAYMENT_ATTEMPTS.limit,
      RATE_LIMITS.PAYMENT_ATTEMPTS.windowMs
    );
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: "Too many payment attempts. Please wait before trying again.",
          retryAfter: rateLimitResult.resetAt.toISOString(),
        },
        { status: 429 }
      );
    }

    // Find the commission request
    const commissionRequest = await prisma.commissionRequest.findUnique({
      where: { id: requestId },
      include: {
        designer: {
          select: { id: true, name: true, displayName: true, email: true },
        },
        requester: {
          select: { id: true, email: true },
        },
      },
    });

    if (!commissionRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Verify ownership
    if (commissionRequest.requesterId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if already paid (idempotency)
    if (commissionRequest.isPaid) {
      return NextResponse.json(
        { error: "This commission has already been paid" },
        { status: 400 }
      );
    }

    // Check for existing pending payment session (prevent duplicate sessions)
    if (commissionRequest.paymentReference && 
        commissionRequest.status === "QUOTED") {
      // If there's already a payment reference but not yet paid,
      // a previous session may be in progress
      const createdAt = commissionRequest.updatedAt || commissionRequest.createdAt;
      const hoursSinceUpdate = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
      
      // Only block if recent (within 1 hour) to prevent stale sessions from blocking
      if (hoursSinceUpdate < 1) {
        return NextResponse.json(
          { error: "A payment session is already in progress. Please complete or wait for it to expire." },
          { status: 400 }
        );
      }
    }

    // Verify status
    if (commissionRequest.status !== "QUOTED") {
      return NextResponse.json(
        { error: "This request is not ready for payment" },
        { status: 400 }
      );
    }

    const quote = commissionRequest.designerQuote;
    if (!quote || quote <= 0) {
      return NextResponse.json({ error: "Invalid quote amount" }, { status: 400 });
    }

    // Get designer's tiered commission rate
    const designer = await prisma.user.findUnique({
      where: { id: commissionRequest.designerId },
      select: { totalEarnings: true, designerTier: true }
    });
    const totalEarnings = designer?.totalEarnings ?? 0;
    const isProSubscriber = designer?.designerTier === 'VIP_DESIGNER' || designer?.designerTier === 'VVIP_DESIGNER';
    const commissionRate = getCommissionRate(totalEarnings, isProSubscriber);
    
    const platformFee = quote * commissionRate;
    const designerEarnings = quote - platformFee;

    // Handle payment based on method
    if (paymentMethod === "stripe") {
      if (!isStripeConfigured()) {
        return NextResponse.json(
          { error: "Stripe is not configured" },
          { status: 500 }
        );
      }

      const stripe = getStripe();
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

      // Create Stripe checkout session
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Commission: ${commissionRequest.title}`,
                description: `Custom commission from ${commissionRequest.designerName}`,
              },
              unit_amount: Math.round(quote * 100), // Stripe uses cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/commission-payment/success?request_id=${requestId}`,
        cancel_url: `${baseUrl}/commission-payment/${requestId}`,
        metadata: {
          type: "commission",
          commissionRequestId: requestId,
          designerId: commissionRequest.designerId,
          requesterId: commissionRequest.requesterId,
          platformFee: platformFee.toString(),
          designerEarnings: designerEarnings.toString(),
        },
        customer_email: commissionRequest.requester.email,
      });

      // Store the intended payment method before redirect
      await prisma.commissionRequest.update({
        where: { id: requestId },
        data: {
          paymentMethod: "stripe",
          paymentReference: checkoutSession.id, // Store session ID for tracking
        },
      });

      return NextResponse.json({
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.id,
      });
    } else if (paymentMethod === "paystack") {
      if (!isPaystackConfigured()) {
        return NextResponse.json(
          { error: "Paystack is not configured" },
          { status: 500 }
        );
      }

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const reference = `comm_${requestId}_${Date.now()}`;

      // Get live exchange rate for USD to NGN conversion
      const exchangeRate = await getUSDToNGNRate();
      
      // Convert USD to NGN for Paystack (Nigerian payment processor)
      const amountInNGN = quote * exchangeRate;
      const platformFeeNGN = platformFee * exchangeRate;
      const designerEarningsNGN = designerEarnings * exchangeRate;

      // Initialize Paystack transaction
      const paystackResponse = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: commissionRequest.requester.email,
            amount: Math.round(amountInNGN * 100), // Paystack uses kobo (1 NGN = 100 kobo)
            currency: "NGN",
            reference,
            callback_url: `${baseUrl}/commission-payment/success?request_id=${requestId}&reference=${reference}`,
            metadata: {
              type: "commission",
              commission_request_id: requestId,
              designer_id: commissionRequest.designerId,
              requester_id: commissionRequest.requesterId,
              platform_fee: platformFee, // Store USD values for records
              designer_earnings: designerEarnings,
              platform_fee_ngn: platformFeeNGN,
              designer_earnings_ngn: designerEarningsNGN,
              amount_usd: quote,
              amount_ngn: amountInNGN,
              exchange_rate: exchangeRate,
            },
          }),
        }
      );

      const paystackData = await paystackResponse.json();

      if (!paystackData.status) {
        return NextResponse.json(
          { error: paystackData.message || "Payment initialization failed" },
          { status: 500 }
        );
      }

      // Store the intended payment method before redirect
      await prisma.commissionRequest.update({
        where: { id: requestId },
        data: {
          paymentMethod: "paystack",
          paymentReference: reference, // Store reference for tracking
        },
      });

      return NextResponse.json({
        authorizationUrl: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Commission payment error:", error);
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
