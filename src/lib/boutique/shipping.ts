// Shipping utility functions for Boutique
// Handles shipping calculations for both ADMIN_STOCK and SELLER_DIRECT

import prisma from '@/lib/prisma';
import { FULFILLMENT_METHOD } from './constants';

// Nigerian state to zone mapping for default shipping calculations
const NIGERIAN_ZONES: Record<string, string[]> = {
  'LAGOS_METRO': ['Lagos'],
  'SOUTH_WEST': ['Ogun', 'Oyo', 'Osun', 'Ondo', 'Ekiti'],
  'SOUTH_SOUTH': ['Edo', 'Delta', 'Rivers', 'Bayelsa', 'Cross River', 'Akwa Ibom'],
  'SOUTH_EAST': ['Anambra', 'Enugu', 'Imo', 'Abia', 'Ebonyi'],
  'NORTH_CENTRAL': ['FCT', 'Abuja', 'Kwara', 'Kogi', 'Benue', 'Niger', 'Plateau', 'Nassarawa'],
  'NORTH_WEST': ['Kaduna', 'Kano', 'Katsina', 'Zamfara', 'Sokoto', 'Kebbi', 'Jigawa'],
  'NORTH_EAST': ['Borno', 'Yobe', 'Bauchi', 'Gombe', 'Adamawa', 'Taraba'],
};

// Get zone name for a state
export function getZoneForState(state: string): string {
  const normalizedState = state.trim();
  for (const [zone, states] of Object.entries(NIGERIAN_ZONES)) {
    if (states.some(s => s.toLowerCase() === normalizedState.toLowerCase())) {
      return zone;
    }
  }
  return 'OTHER';
}

// Default shipping rates if no zone is configured (fallback)
const DEFAULT_RATES: Record<string, { baseRate: number; minDays: number; maxDays: number }> = {
  'LAGOS_METRO': { baseRate: 1500, minDays: 1, maxDays: 2 },
  'SOUTH_WEST': { baseRate: 2000, minDays: 2, maxDays: 4 },
  'SOUTH_SOUTH': { baseRate: 2500, minDays: 3, maxDays: 5 },
  'SOUTH_EAST': { baseRate: 2500, minDays: 3, maxDays: 5 },
  'NORTH_CENTRAL': { baseRate: 2500, minDays: 3, maxDays: 5 },
  'NORTH_WEST': { baseRate: 3000, minDays: 4, maxDays: 7 },
  'NORTH_EAST': { baseRate: 3500, minDays: 5, maxDays: 7 },
  'OTHER': { baseRate: 3000, minDays: 5, maxDays: 10 },
};

export interface ShippingEstimate {
  cost: number;
  minDays: number;
  maxDays: number;
  zoneName: string;
  freeShipping: boolean;
  freeShippingThreshold?: number;
}

export interface CartShippingInfo {
  // ADMIN_STOCK shipping (to platform)
  adminShipping: {
    cost: number;
    minDays: number;
    maxDays: number;
    itemCount: number;
  } | null;
  
  // SELLER_DIRECT shipping (to seller)
  sellerShipping: Array<{
    sellerId: string;
    sellerName: string;
    cost: number;
    shippingTime: string | null;
    itemCount: number;
  }>;
  
  // Combined totals
  totalShipping: number;
  
  // For display
  hasMultipleShippingSources: boolean;
}

/**
 * Calculate shipping for ADMIN_STOCK orders using configured zones
 * Shipping goes 100% to platform
 */
export async function calculateAdminShipping(
  state: string,
  subtotal: number,
  totalWeightKg?: number
): Promise<ShippingEstimate> {
  // Try to find matching zone in database
  const zone = await prisma.shippingZone.findFirst({
    where: {
      isActive: true,
      OR: [
        { states: { has: state } },
        { states: { has: state.toLowerCase() } },
        { name: { contains: getZoneForState(state), mode: 'insensitive' } },
      ],
    },
  });

  if (zone) {
    // Check for free shipping threshold
    const freeShipping = zone.freeShippingThreshold 
      ? subtotal >= zone.freeShippingThreshold 
      : false;

    let cost = freeShipping ? 0 : zone.baseRate;
    
    // Add per-kg charges if weight provided
    if (!freeShipping && totalWeightKg && zone.perKgRate > 0) {
      cost += zone.perKgRate * totalWeightKg;
    }

    return {
      cost: Math.round(cost),
      minDays: zone.minDays,
      maxDays: zone.maxDays,
      zoneName: zone.name,
      freeShipping,
      freeShippingThreshold: zone.freeShippingThreshold || undefined,
    };
  }

  // Fallback to default rates
  const zoneName = getZoneForState(state);
  const defaultRate = DEFAULT_RATES[zoneName] || DEFAULT_RATES.OTHER;

  return {
    cost: defaultRate.baseRate,
    minDays: defaultRate.minDays,
    maxDays: defaultRate.maxDays,
    zoneName,
    freeShipping: false,
  };
}

/**
 * Calculate shipping for SELLER_DIRECT orders using seller's set rate
 * Shipping goes to seller (minus commission)
 */
export function calculateSellerDirectShipping(
  sellerShippingFee: number | null,
  sellerShippingLocations: string[],
  buyerState: string
): { cost: number; canShip: boolean; reason?: string } {
  // Check if seller ships to buyer's location
  if (sellerShippingLocations.length > 0) {
    const canShip = sellerShippingLocations.some(
      loc => loc.toLowerCase() === buyerState.toLowerCase() ||
             loc.toLowerCase() === 'nationwide' ||
             loc.toLowerCase() === 'all'
    );

    if (!canShip) {
      return {
        cost: 0,
        canShip: false,
        reason: `Seller does not ship to ${buyerState}`,
      };
    }
  }

  // Use seller's shipping fee or default
  const cost = sellerShippingFee ?? 2000; // Default ₦2,000 if not set

  return {
    cost,
    canShip: true,
  };
}

/**
 * Calculate complete shipping info for a cart
 * Groups by fulfillment method and calculates appropriate shipping
 */
export async function calculateCartShipping(
  cartItems: Array<{
    product: {
      id: string;
      sellerId: string;
      fulfillmentMethod: string;
      sellerShippingFee: number | null;
      sellerShippingLocations: string[];
      sellerShippingTime: string | null;
      weight: number | null;
      basePrice: number;
      salePrice: number | null;
    };
    seller: {
      id: string;
      name: string | null;
    };
    variant: {
      priceAdjustment: number | null;
    } | null;
    quantity: number;
  }>,
  buyerState: string
): Promise<CartShippingInfo> {
  // Separate items by fulfillment method
  const adminStockItems = cartItems.filter(
    i => i.product.fulfillmentMethod === FULFILLMENT_METHOD.ADMIN_STOCK
  );
  const sellerDirectItems = cartItems.filter(
    i => i.product.fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT
  );

  let totalShipping = 0;

  // Calculate ADMIN_STOCK shipping
  let adminShipping: CartShippingInfo['adminShipping'] = null;
  if (adminStockItems.length > 0) {
    const subtotal = adminStockItems.reduce((sum, item) => {
      const price = item.product.salePrice || item.product.basePrice;
      const adj = item.variant?.priceAdjustment || 0;
      return sum + (price + adj) * item.quantity;
    }, 0);

    const totalWeight = adminStockItems.reduce((sum, item) => {
      return sum + (item.product.weight || 0.5) * item.quantity;
    }, 0);

    const estimate = await calculateAdminShipping(buyerState, subtotal, totalWeight);
    
    adminShipping = {
      cost: estimate.cost,
      minDays: estimate.minDays,
      maxDays: estimate.maxDays,
      itemCount: adminStockItems.length,
    };
    
    totalShipping += estimate.cost;
  }

  // Calculate SELLER_DIRECT shipping (grouped by seller)
  const sellerShipping: CartShippingInfo['sellerShipping'] = [];
  const sellerGroups = new Map<string, typeof sellerDirectItems>();
  
  for (const item of sellerDirectItems) {
    const sellerId = item.product.sellerId;
    if (!sellerGroups.has(sellerId)) {
      sellerGroups.set(sellerId, []);
    }
    sellerGroups.get(sellerId)!.push(item);
  }

  for (const [sellerId, items] of sellerGroups) {
    const firstItem = items[0];
    const shipping = calculateSellerDirectShipping(
      firstItem.product.sellerShippingFee,
      firstItem.product.sellerShippingLocations,
      buyerState
    );

    // Note: For multiple items from same seller, we charge shipping once
    sellerShipping.push({
      sellerId,
      sellerName: firstItem.seller.name || 'Seller',
      cost: shipping.cost,
      shippingTime: firstItem.product.sellerShippingTime,
      itemCount: items.length,
    });

    totalShipping += shipping.cost;
  }

  return {
    adminShipping,
    sellerShipping,
    totalShipping,
    hasMultipleShippingSources: (adminShipping ? 1 : 0) + sellerShipping.length > 1,
  };
}

/**
 * Get shipping cost for a single order group (used during checkout)
 */
export async function getOrderGroupShipping(
  fulfillmentMethod: string,
  sellerId: string,
  buyerState: string,
  subtotal: number,
  productWeight?: number
): Promise<{ cost: number; destinationType: 'PLATFORM' | 'SELLER' }> {
  if (fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT) {
    // Get seller's shipping fee
    const product = await prisma.boutiqueProduct.findFirst({
      where: { 
        sellerId,
        fulfillmentMethod: FULFILLMENT_METHOD.SELLER_DIRECT,
      },
      select: {
        sellerShippingFee: true,
        sellerShippingLocations: true,
      },
    });

    const shipping = calculateSellerDirectShipping(
      product?.sellerShippingFee || null,
      product?.sellerShippingLocations || [],
      buyerState
    );

    return {
      cost: shipping.cost,
      destinationType: 'SELLER', // Goes to seller minus commission
    };
  }

  // ADMIN_STOCK - shipping goes to platform
  const estimate = await calculateAdminShipping(buyerState, subtotal, productWeight);
  return {
    cost: estimate.cost,
    destinationType: 'PLATFORM', // 100% to platform
  };
}
