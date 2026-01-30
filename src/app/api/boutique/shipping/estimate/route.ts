import { NextRequest, NextResponse } from "next/server";
import { getShippingCost, extractGeoLocation, isShippingAvailable, getCurrencyForCountry } from "@/lib/geo-detection";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { state, fulfillmentMethod = 'ADMIN_STOCK', weight, buyerCountry: providedCountry } = body;

    // Extract buyer country from request headers if not provided
    const headerObject = Object.fromEntries(request.headers);
    const geoLocation = extractGeoLocation(headerObject);
    const buyerCountry = providedCountry || geoLocation.countryCode;

    // Validate shipping availability
    if (!isShippingAvailable(fulfillmentMethod, buyerCountry)) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Shipping (${fulfillmentMethod}) not available to ${buyerCountry}`,
          availability: false
        },
        { status: 400 }
      );
    }

    // Calculate shipping using geo-detection
    const shippingInfo = getShippingCost(
      fulfillmentMethod,
      buyerCountry,
      state,
      weight || 0.5
    );

    const currency = getCurrencyForCountry(buyerCountry);

    return NextResponse.json(
      {
        success: true,
        shipping: {
          cost: shippingInfo.cost,
          currency,
          estimatedDays: shippingInfo.estimatedDays,
          carrier: shippingInfo.carrier,
          notes: shippingInfo.notes,
        },
        buyer: {
          country: buyerCountry,
          state: state || undefined,
          fulfillmentMethod,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error estimating shipping:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to estimate shipping",
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
