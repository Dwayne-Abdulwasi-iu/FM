import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/pod/shipping-estimate
 * Calculate shipping cost estimate for POD items
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { items, shippingAddress } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: 'Items array required' },
        { status: 400 }
      );
    }

    if (!shippingAddress?.country) {
      return NextResponse.json(
        { message: 'Shipping address with country required' },
        { status: 400 }
      );
    }

    // Calculate shipping for each item based on provider and destination
    const shippingEstimates = await Promise.all(items.map(async (item: {
      provider: string;
      productId: string;
      variantId: string;
      quantity: number;
    }) => {
      const provider = item.provider?.toLowerCase();
      let shippingCost = 0;
      let estimatedDays = { min: 5, max: 10 };

      // Get shipping estimates based on provider and destination
      if (provider === 'printful') {
        const estimate = await getPrintfulShippingEstimate(
          item.productId,
          item.variantId,
          item.quantity,
          shippingAddress.country
        );
        shippingCost = estimate.cost;
        estimatedDays = estimate.days;
      } else if (provider === 'printify') {
        const estimate = await getPrintifyShippingEstimate(
          item.productId,
          item.variantId,
          item.quantity,
          shippingAddress.country
        );
        shippingCost = estimate.cost;
        estimatedDays = estimate.days;
      } else {
        // Default shipping estimates based on region
        const estimate = getDefaultShippingEstimate(shippingAddress.country, item.quantity);
        shippingCost = estimate.cost;
        estimatedDays = estimate.days;
      }

      return {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        shippingCost,
        estimatedDays
      };
    }));

    // Calculate totals
    const totalShipping = shippingEstimates.reduce((sum, est) => sum + est.shippingCost, 0);
    const minDays = Math.min(...shippingEstimates.map(e => e.estimatedDays.min));
    const maxDays = Math.max(...shippingEstimates.map(e => e.estimatedDays.max));

    return NextResponse.json({
      success: true,
      estimates: shippingEstimates,
      totalShipping: Number(totalShipping.toFixed(2)),
      estimatedDelivery: {
        minDays,
        maxDays,
        estimate: `${minDays}-${maxDays} business days`
      },
      currency: 'USD'
    });

  } catch (error) {
    console.error('Shipping estimate error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to calculate shipping estimate'
    }, { status: 500 });
  }
}

/**
 * Get Printful shipping estimate
 */
async function getPrintfulShippingEstimate(
  productId: string,
  variantId: string,
  quantity: number,
  country: string
): Promise<{ cost: number; days: { min: number; max: number } }> {
  // Try to get actual shipping rates from Printful API
  const apiKey = process.env.PRINTFUL_API_KEY;
  
  if (apiKey) {
    try {
      // Printful shipping rate endpoint
      const response = await fetch('https://api.printful.com/shipping/rates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: {
            country_code: country
          },
          items: [{
            variant_id: parseInt(variantId) || 0,
            quantity: quantity
          }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result?.length > 0) {
          // Get standard shipping option
          const standardOption = data.result.find((r: { id: string }) => 
            r.id === 'STANDARD' || r.id === 'standard'
          ) || data.result[0];
          
          return {
            cost: parseFloat(standardOption.rate) || getDefaultShippingCost(country, quantity),
            days: {
              min: standardOption.minDeliveryDays || 5,
              max: standardOption.maxDeliveryDays || 10
            }
          };
        }
      }
    } catch (error) {
      console.error('Printful shipping API error:', error);
    }
  }

  // Fallback to default estimates
  return getDefaultShippingEstimate(country, quantity);
}

/**
 * Get Printify shipping estimate
 */
async function getPrintifyShippingEstimate(
  productId: string,
  variantId: string,
  quantity: number,
  country: string
): Promise<{ cost: number; days: { min: number; max: number } }> {
  // Printify shipping is handled by print providers
  // Use default estimates based on region
  return getDefaultShippingEstimate(country, quantity);
}

/**
 * Default shipping estimates by region
 */
function getDefaultShippingEstimate(
  country: string,
  quantity: number
): { cost: number; days: { min: number; max: number } } {
  return {
    cost: getDefaultShippingCost(country, quantity),
    days: getDefaultDeliveryDays(country)
  };
}

/**
 * Calculate default shipping cost based on region
 */
function getDefaultShippingCost(country: string, quantity: number): number {
  const upperCountry = country.toUpperCase();
  
  // Regional shipping rates (USD)
  const rates: Record<string, { base: number; additional: number }> = {
    // North America
    US: { base: 4.99, additional: 1.50 },
    CA: { base: 6.99, additional: 2.00 },
    MX: { base: 7.99, additional: 2.50 },
    
    // Europe
    GB: { base: 5.99, additional: 1.75 },
    DE: { base: 5.99, additional: 1.75 },
    FR: { base: 5.99, additional: 1.75 },
    ES: { base: 6.99, additional: 2.00 },
    IT: { base: 6.99, additional: 2.00 },
    NL: { base: 5.99, additional: 1.75 },
    
    // Africa
    NG: { base: 12.99, additional: 3.50 },
    GH: { base: 14.99, additional: 4.00 },
    KE: { base: 14.99, additional: 4.00 },
    ZA: { base: 12.99, additional: 3.50 },
    EG: { base: 14.99, additional: 4.00 },
    
    // Asia Pacific
    AU: { base: 9.99, additional: 2.50 },
    NZ: { base: 10.99, additional: 3.00 },
    JP: { base: 8.99, additional: 2.50 },
    SG: { base: 7.99, additional: 2.00 },
    
    // Rest of World (default)
    DEFAULT: { base: 12.99, additional: 3.50 }
  };

  const rate = rates[upperCountry] || rates.DEFAULT;
  
  // First item + additional items
  return Number((rate.base + (quantity - 1) * rate.additional).toFixed(2));
}

/**
 * Get default delivery days by region
 */
function getDefaultDeliveryDays(country: string): { min: number; max: number } {
  const upperCountry = country.toUpperCase();
  
  // North America
  if (['US', 'CA'].includes(upperCountry)) {
    return { min: 3, max: 7 };
  }
  
  // Mexico
  if (upperCountry === 'MX') {
    return { min: 7, max: 14 };
  }
  
  // Europe
  if (['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'CH'].includes(upperCountry)) {
    return { min: 5, max: 12 };
  }
  
  // Africa
  if (['NG', 'GH', 'KE', 'ZA', 'EG', 'MA', 'TZ'].includes(upperCountry)) {
    return { min: 14, max: 28 };
  }
  
  // Asia Pacific
  if (['AU', 'NZ', 'JP', 'SG', 'HK'].includes(upperCountry)) {
    return { min: 7, max: 14 };
  }
  
  // Rest of World
  return { min: 10, max: 21 };
}
