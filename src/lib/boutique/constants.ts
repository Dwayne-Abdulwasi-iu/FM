// Fashion Boutique - Constants and Configuration

// Import tiered commission system for SELLER_DIRECT
import { 
  getCommissionRate as getDigitalCommissionRate,
  getCommissionTier,
  COMMISSION_TIERS,
  type CommissionTierKey,
} from '@/lib/commission-tiers';

// Re-export for convenience
export { getCommissionTier, COMMISSION_TIERS, type CommissionTierKey };

// Fulfillment Methods
export const FULFILLMENT_METHOD = {
  ADMIN_STOCK: 'ADMIN_STOCK',      // Seller ships to admin, admin ships to buyer
  SELLER_DIRECT: 'SELLER_DIRECT',  // Seller ships directly to buyer (Tier 3+)
} as const;

export type FulfillmentMethod = typeof FULFILLMENT_METHOD[keyof typeof FULFILLMENT_METHOD];

// Fulfillment Method Config
export const FULFILLMENT_CONFIG: Record<FulfillmentMethod, { 
  label: string; 
  shortLabel: string;
  description: string; 
  color: string; 
  bgColor: string;
  icon: string;
}> = {
  ADMIN_STOCK: { 
    label: 'Admin Warehouse', 
    shortLabel: 'Warehouse',
    description: 'Ship to our warehouse, we handle delivery to buyers', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-100',
    icon: '🏢',
  },
  SELLER_DIRECT: { 
    label: 'Seller Direct', 
    shortLabel: 'Direct',
    description: 'Ship directly to buyers from your location', 
    color: 'text-purple-700', 
    bgColor: 'bg-purple-100',
    icon: '🚀',
  },
};

// Seller Tiers
export const SELLER_TIERS = {
  DESIGNER: 'DESIGNER',           // Tier 1 - New sellers
  GOLD_DESIGNER: 'GOLD_DESIGNER', // Tier 2 - Established sellers
  VIP_DESIGNER: 'VIP_DESIGNER',   // Tier 3 - Trusted sellers (Direct shipping eligible)
  VVIP_DESIGNER: 'VVIP_DESIGNER', // Tier 4 - Premium sellers
} as const;

export type SellerTier = typeof SELLER_TIERS[keyof typeof SELLER_TIERS];

// Tier Config
export const SELLER_TIER_CONFIG: Record<SellerTier, {
  label: string;
  level: number;
  color: string;
  bgColor: string;
  badge: string;
  canDirectShip: boolean;
  commissionRate: number; // Platform commission percentage
  requirements: string[];
}> = {
  DESIGNER: {
    label: 'Designer',
    level: 1,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    badge: '🎨',
    canDirectShip: false,
    commissionRate: 15,
    requirements: ['Complete profile', 'Verify email'],
  },
  GOLD_DESIGNER: {
    label: 'Gold Designer',
    level: 2,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    badge: '⭐',
    canDirectShip: false,
    commissionRate: 12,
    requirements: ['10+ sales', '4.0+ rating', '90%+ on-time delivery'],
  },
  VIP_DESIGNER: {
    label: 'VIP Designer',
    level: 3,
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    badge: '💎',
    canDirectShip: true,
    commissionRate: 10,
    requirements: ['50+ sales', '4.5+ rating', '95%+ on-time delivery', '< 5% return rate'],
  },
  VVIP_DESIGNER: {
    label: 'VVIP Designer',
    level: 4,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    badge: '👑',
    canDirectShip: true,
    commissionRate: 8,
    requirements: ['200+ sales', '4.7+ rating', '98%+ on-time delivery', '< 3% return rate'],
  },
};

// Direct Shipping Specific Status (subset of product statuses)
export const DIRECT_SHIP_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_CONTENT_REVIEW: 'PENDING_CONTENT_REVIEW',
  CONTENT_APPROVED: 'CONTENT_APPROVED', // For direct ship, this means ready to go live
  LIVE: 'LIVE',
  SOLD: 'SOLD',
  REJECTED: 'REJECTED',
  PAUSED: 'PAUSED', // Seller temporarily unavailable
} as const;

// Product Status Workflow
export const PRODUCT_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_CONTENT_REVIEW: 'PENDING_CONTENT_REVIEW',
  CONTENT_APPROVED: 'CONTENT_APPROVED',
  SHIPPED_TO_ADMIN: 'SHIPPED_TO_ADMIN',
  RECEIVED_BY_ADMIN: 'RECEIVED_BY_ADMIN',
  VERIFICATION_PASSED: 'VERIFICATION_PASSED',
  LIVE: 'LIVE',
  IN_RETURN: 'IN_RETURN',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
  RETURN_SHIPPED: 'RETURN_SHIPPED',
  RETURNED_TO_SELLER: 'RETURNED_TO_SELLER',
  SOLD: 'SOLD',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  LIQUIDATED: 'LIQUIDATED',
} as const;

export type ProductStatus = typeof PRODUCT_STATUS[keyof typeof PRODUCT_STATUS];

// Status display labels and colors
export const PRODUCT_STATUS_CONFIG: Record<ProductStatus, { label: string; color: string; bgColor: string; description: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-600', bgColor: 'bg-gray-100', description: 'Save and continue editing' },
  PENDING_CONTENT_REVIEW: { label: 'Pending Review', color: 'text-yellow-700', bgColor: 'bg-yellow-100', description: 'Awaiting admin content approval' },
  CONTENT_APPROVED: { label: 'Content Approved', color: 'text-blue-700', bgColor: 'bg-blue-100', description: 'Ship product within 7 days' },
  SHIPPED_TO_ADMIN: { label: 'Shipped', color: 'text-purple-700', bgColor: 'bg-purple-100', description: 'Product in transit to admin' },
  RECEIVED_BY_ADMIN: { label: 'Received', color: 'text-indigo-700', bgColor: 'bg-indigo-100', description: 'Product received, verifying...' },
  VERIFICATION_PASSED: { label: 'Verified', color: 'text-teal-700', bgColor: 'bg-teal-100', description: 'Ready to go live' },
  LIVE: { label: 'Live', color: 'text-green-700', bgColor: 'bg-green-100', description: 'Available for purchase' },
  IN_RETURN: { label: 'Approved for Return', color: 'text-orange-700', bgColor: 'bg-orange-100', description: 'Return approved by admin' },
  RETURN_REQUESTED: { label: 'Return Requested', color: 'text-amber-700', bgColor: 'bg-amber-100', description: 'Return request pending approval' },
  RETURN_SHIPPED: { label: 'Return Shipped', color: 'text-orange-600', bgColor: 'bg-orange-100', description: 'Product being returned to seller' },
  RETURNED_TO_SELLER: { label: 'Returned Successfully', color: 'text-emerald-700', bgColor: 'bg-emerald-100', description: 'Returned to seller' },
  SOLD: { label: 'Sold', color: 'text-emerald-700', bgColor: 'bg-emerald-100', description: 'Product has been sold' },
  REJECTED: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100', description: 'Did not meet requirements' },
  CANCELLED: { label: 'Cancelled', color: 'text-orange-700', bgColor: 'bg-orange-100', description: 'Shipment deadline passed' },
  LIQUIDATED: { label: 'Liquidated', color: 'text-amber-700', bgColor: 'bg-amber-100', description: 'Sold at discounted price' },
};

// Order Status
export const ORDER_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
  RETURN_APPROVED: 'RETURN_APPROVED',
  RETURN_SHIPPED: 'RETURN_SHIPPED',
  RETURN_RECEIVED: 'RETURN_RECEIVED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

// Return Status
export const RETURN_STATUS = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SHIPPED: 'SHIPPED',
  RECEIVED: 'RECEIVED',
  INSPECTED: 'INSPECTED',
  REFUND_PROCESSING: 'REFUND_PROCESSING',
  REFUNDED: 'REFUNDED',
  CLOSED: 'CLOSED',
} as const;

export type ReturnStatus = typeof RETURN_STATUS[keyof typeof RETURN_STATUS];

// Return Reasons
export const RETURN_REASONS = {
  DAMAGED: 'Damaged or defective',
  WRONG_ITEM: 'Wrong item received',
  NOT_AS_DESCRIBED: 'Not as described',
  CHANGED_MIND: 'Changed my mind',
  OTHER: 'Other reason',
} as const;

// Shipment Status
export const SHIPMENT_STATUS = {
  PENDING: 'PENDING',
  SHIPPED: 'SHIPPED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

// Warehouse Inventory Status
export const WAREHOUSE_STATUS = {
  IN_STOCK: 'IN_STOCK',
  RESERVED: 'RESERVED',
  SHIPPED: 'SHIPPED',
  RETURNED: 'RETURNED',
  PENDING_RETURN_TO_SELLER: 'PENDING_RETURN_TO_SELLER',
  RETURNED_TO_SELLER: 'RETURNED_TO_SELLER',
  DISPOSED: 'DISPOSED',
} as const;

// Product Condition
export const PRODUCT_CONDITION = {
  NEW: 'New with tags',
  LIKE_NEW: 'Like new (no tags)',
  GOOD: 'Good condition',
  FAIR: 'Fair condition',
} as const;

// Sizes
export const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;

export const SHOE_SIZES = {
  EU: [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48],
  US_MEN: [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 14],
  US_WOMEN: [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11],
  UK: [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 11, 12],
};

// Gender Options
export const GENDER_OPTIONS = ['Men', 'Women', 'Unisex', 'Boys', 'Girls', 'Kids'] as const;

// Occasions
export const OCCASIONS = [
  'Casual',
  'Formal',
  'Wedding',
  'Party',
  'Office/Work',
  'Beach/Resort',
  'Sports',
  'Traditional/Cultural',
  'Date Night',
  'Everyday',
] as const;

// Styles
export const STYLES = [
  'Traditional',
  'Modern',
  'Casual',
  'Formal',
  'Bohemian',
  'Minimalist',
  'Vintage',
  'Streetwear',
  'Elegant',
  'Sporty',
  'Ethnic',
  'Western',
] as const;

// Platform Settings Defaults
export const BOUTIQUE_DEFAULTS = {
  // Commission
  platformCommission: 15, // 15%
  
  // Storage
  freeStorageDays: 30,
  storageFeePct: 2, // 2% per month after free period
  maxStorageDays: 90,
  
  // Shipment
  shipmentDeadlineDays: 7,
  
  // Returns
  returnWindowDays: 7,
  
  // Liquidation
  liquidationDiscountPct: 50,
  sellerLiquidationSharePct: 40,
  
  // Media requirements
  minImages: 3,
  minVideos: 2,
  maxImages: 10,
  maxVideos: 5,
  maxImageSize: 10 * 1024 * 1024, // 10MB
  maxVideoSize: 100 * 1024 * 1024, // 100MB
  maxVideoDuration: 60, // seconds
  
  // Seller Direct Shipping Defaults
  sellerDirect: {
    minTierLevel: 3, // VIP_DESIGNER minimum
    shipDeadlineHours: 48, // Must ship within 48 hours
    maxShipDeadlineHours: 72, // Grace period before penalty
    commissionDiscount: 3, // 3% less commission (no storage costs)
    firstProductsRequireSample: 3, // First 3 direct products need sample verification
    minShippingRating: 4.0, // Minimum shipping performance to maintain eligibility
    pauseThreshold: {
      lateShipments: 3, // 3 late shipments in 30 days = auto-pause
      cancellations: 2, // 2 seller cancellations = auto-pause
    },
    demotionThreshold: {
      lateShipmentRate: 0.15, // 15% late rate = review for demotion
      returnRate: 0.10, // 10% return rate = review for demotion
    },
  },
};

// Nigerian Shipping Carriers
export const SHIPPING_CARRIERS = [
  { code: 'GIGL', name: 'GIG Logistics' },
  { code: 'DHL', name: 'DHL Express' },
  { code: 'FEDEX', name: 'FedEx' },
  { code: 'UPS', name: 'UPS' },
  { code: 'KWIK', name: 'Kwik Delivery' },
  { code: 'MAXNG', name: 'Max.ng' },
  { code: 'SENDBOX', name: 'Sendbox' },
  { code: 'TOPSHIP', name: 'Topship' },
  { code: 'ACE', name: 'ACE Logistics' },
  { code: 'OTHER', name: 'Other' },
];

// Nigerian States (for shipping)
export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

// Helper functions
export function getStatusLabel(status: ProductStatus): string {
  return PRODUCT_STATUS_CONFIG[status]?.label || status;
}

export function getStatusColor(status: ProductStatus): string {
  return PRODUCT_STATUS_CONFIG[status]?.color || 'text-gray-600';
}

export function getStatusBgColor(status: ProductStatus): string {
  return PRODUCT_STATUS_CONFIG[status]?.bgColor || 'bg-gray-100';
}

export function canSubmitForReview(status: ProductStatus): boolean {
  return status === PRODUCT_STATUS.DRAFT || status === PRODUCT_STATUS.REJECTED;
}

export function canEditProduct(status: ProductStatus): boolean {
  return status === PRODUCT_STATUS.DRAFT || status === PRODUCT_STATUS.REJECTED;
}

export function canShipToAdmin(status: ProductStatus): boolean {
  return status === PRODUCT_STATUS.CONTENT_APPROVED;
}

export function canGoLive(status: ProductStatus): boolean {
  return status === PRODUCT_STATUS.VERIFICATION_PASSED;
}

export function isActiveProduct(status: ProductStatus): boolean {
  return status === PRODUCT_STATUS.LIVE;
}

export function isSold(status: ProductStatus): boolean {
  return status === PRODUCT_STATUS.SOLD;
}

// Fulfillment Method Helpers
export function canUseDirectShipping(sellerTier: SellerTier | null | undefined): boolean {
  if (!sellerTier) return false;
  const config = SELLER_TIER_CONFIG[sellerTier];
  return config?.canDirectShip ?? false;
}

export function getSellerTierLevel(tier: SellerTier | null | undefined): number {
  if (!tier) return 0;
  return SELLER_TIER_CONFIG[tier]?.level ?? 0;
}

/**
 * Get commission rate for boutique sales based on fulfillment method
 * 
 * ADMIN_STOCK (warehouse): 15% flat - platform handles storage, verification, shipping
 * SELLER_DIRECT: Uses tiered rates like digital designs (0.1%, 10%, 9.5%, 9%, 8.5%, 8%, 7%)
 *                since platform doesn't handle any physical aspects
 * 
 * @param tier - Seller's tier (used for eligibility check, not rate calculation for SELLER_DIRECT)
 * @param fulfillmentMethod - ADMIN_STOCK or SELLER_DIRECT
 * @param sellerTotalEarnings - Total earnings for tiered rate calculation (SELLER_DIRECT only)
 * @param isProSubscriber - Whether seller has VIP/VVIP subscription
 */
export function getCommissionRate(
  tier: SellerTier | null | undefined, 
  fulfillmentMethod: FulfillmentMethod,
  sellerTotalEarnings: number = 0,
  isProSubscriber: boolean = false
): number {
  if (fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT) {
    // SELLER_DIRECT: Use tiered commission like digital designs
    // Platform doesn't handle shipping, storage, or physical verification
    const tieredRate = getDigitalCommissionRate(sellerTotalEarnings, isProSubscriber);
    return tieredRate; // Returns decimal like 0.10 for 10%
  }
  
  // ADMIN_STOCK: Flat 15% commission (platform handles everything)
  return BOUTIQUE_DEFAULTS.platformCommission / 100; // Convert 15 to 0.15
}

export function getDirectShipDeadline(): { hours: number; graceHours: number } {
  return {
    hours: BOUTIQUE_DEFAULTS.sellerDirect.shipDeadlineHours,
    graceHours: BOUTIQUE_DEFAULTS.sellerDirect.maxShipDeadlineHours,
  };
}

export function needsSampleVerification(directProductCount: number): boolean {
  return directProductCount < BOUTIQUE_DEFAULTS.sellerDirect.firstProductsRequireSample;
}

// Status helpers for seller direct workflow
export function getWorkflowForFulfillment(fulfillmentMethod: FulfillmentMethod): ProductStatus[] {
  if (fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT) {
    // Simplified workflow for seller direct
    return [
      PRODUCT_STATUS.DRAFT,
      PRODUCT_STATUS.PENDING_CONTENT_REVIEW,
      PRODUCT_STATUS.CONTENT_APPROVED, // Goes directly to LIVE after content approval
      PRODUCT_STATUS.LIVE,
      PRODUCT_STATUS.SOLD,
    ];
  }
  // Admin stock has full workflow
  return [
    PRODUCT_STATUS.DRAFT,
    PRODUCT_STATUS.PENDING_CONTENT_REVIEW,
    PRODUCT_STATUS.CONTENT_APPROVED,
    PRODUCT_STATUS.SHIPPED_TO_ADMIN,
    PRODUCT_STATUS.RECEIVED_BY_ADMIN,
    PRODUCT_STATUS.VERIFICATION_PASSED,
    PRODUCT_STATUS.LIVE,
    PRODUCT_STATUS.SOLD,
  ];
}

export function canGoLiveDirectly(status: ProductStatus, fulfillmentMethod: FulfillmentMethod): boolean {
  // Seller direct products can go live after content approval (no physical verification needed)
  return fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT && status === PRODUCT_STATUS.CONTENT_APPROVED;
}
