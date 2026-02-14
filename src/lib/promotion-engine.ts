import prisma from '@/lib/prisma'

export interface PromotionMatch {
  promotionId: string
  type: string
  discountAmount: number
  discountedPrice: number
  originalPrice: number
  isBundlePrimaryDesign?: boolean // True if this is the main item for bundle pricing
  bundlePrice?: number | null // Total price for entire bundle
  bundleItemCount?: number // Number of items in bundle
}

/**
 * Check if a design matches any active promotions and return the best discount
 * BUNDLE promotions require ALL designs in cart, so pass the full cart
 * 
 * @param designId - The design ID to check
 * @param sellerId - The seller ID who owns the design
 * @param originalPrice - The original design price
 * @param allCartDesignIds - All design IDs in the current cart (for BUNDLE validation)
 * @returns Promotion match with discount info, or null if no promotion applies
 */
export async function getPromotionForDesign(
  designId: string,
  sellerId: string,
  originalPrice: number,
  allCartDesignIds: string[]
): Promise<PromotionMatch | null> {
  // Get all active promotions for this seller
  const now = new Date()
  const promotions = await prisma.promotion.findMany({
    where: {
      sellerId,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
      // Check usage limits
      OR: [
        { maxUsage: null }, // Unlimited
        { maxUsage: { gt: 0 } }, // Has max usage set
      ],
    },
  })

  let bestMatch: PromotionMatch | null = null
  let bestDiscount = 0

  for (const promo of promotions) {
    // Skip if promotion has maxUsage and already reached
    if (promo.maxUsage !== null && promo.usageCount >= promo.maxUsage) {
      continue
    }

    // Check if this design is in the promotion
    // For BUNDLE: designIds must be specified and checked
    // For DISCOUNT/FLASH_SALE: if designIds is empty, apply to all; otherwise check specific designs
    let designMatches = false
    if (promo.type === 'BUNDLE') {
      designMatches = promo.designIds.includes(designId)
    } else {
      // DISCOUNT or FLASH_SALE
      designMatches = promo.designIds.length === 0 || promo.designIds.includes(designId)
    }

    if (!designMatches) {
      continue
    }

    let discountAmount = 0
    let discountedPrice = originalPrice

    if (promo.type === 'BUNDLE') {
      // BUNDLE: All designs in bundle must be in cart
      const allBundleDesignInCart = promo.designIds.every((id) =>
        allCartDesignIds.includes(id)
      )

      if (!allBundleDesignInCart) {
        // Bundle requirement not met - skip this promotion
        continue
      }

      // For BUNDLE: Apply bundlePrice only to the first design that matches
      // Other designs in the bundle will get $0 discount (they're included in the bundle price)
      // This prevents double-counting the discount
      const cartBundleDesigns = promo.designIds.filter((id) =>
        allCartDesignIds.includes(id)
      )

      const isFirstBundleDesign = cartBundleDesigns[0] === designId
      
      if (isFirstBundleDesign) {
        // Apply the full bundle price to the first design
        discountedPrice = promo.bundlePrice || originalPrice
        discountAmount = originalPrice - discountedPrice
        
        bestMatch = {
          promotionId: promo.id,
          type: promo.type,
          discountAmount,
          discountedPrice,
          originalPrice,
          isBundlePrimaryDesign: true,
          bundlePrice: promo.bundlePrice,
          bundleItemCount: cartBundleDesigns.length
        }
        break // BUNDLE always wins over other discounts
      } else if (cartBundleDesigns.includes(designId)) {
        // Other designs in the bundle get no discount (price=$0)
        // They're already factored into the first design's bundle price
        discountedPrice = 0
        discountAmount = originalPrice - 0 // $0 price = full discount from original
        
        bestMatch = {
          promotionId: promo.id,
          type: promo.type,
          discountAmount,
          discountedPrice,
          originalPrice,
          isBundlePrimaryDesign: false,
          bundlePrice: promo.bundlePrice,
          bundleItemCount: cartBundleDesigns.length
        }
        break // BUNDLE always wins over other discounts
      }
      
      continue
    } else if (promo.type === 'DISCOUNT' || promo.type === 'FLASH_SALE') {
      // DISCOUNT/FLASH_SALE: Apply percentage or fixed discount
      if (promo.discountType === 'PERCENTAGE' && promo.discountValue) {
        discountAmount = (originalPrice * promo.discountValue) / 100
        discountedPrice = originalPrice - discountAmount
      } else if (promo.discountType === 'FIXED' && promo.discountValue) {
        discountAmount = promo.discountValue
        discountedPrice = Math.max(0, originalPrice - discountAmount)
      }

      // Keep track of the best (highest) discount
      if (discountAmount > bestDiscount) {
        bestDiscount = discountAmount
        bestMatch = {
          promotionId: promo.id,
          type: promo.type,
          discountAmount,
          discountedPrice,
          originalPrice,
        }
      }
    }
  }

  return bestMatch
}

/**
 * Check if a boutique product matches any active promotions and return the best discount
 * Similar to getPromotionForDesign but for boutique products
 * 
 * @param productId - The product ID to check
 * @param sellerId - The seller ID who owns the product
 * @param basePrice - The original product price
 * @param allCartProductIds - All product IDs in the current cart (for BUNDLE validation)
 * @returns Promotion match with discount info, or null if no promotion applies
 */
export async function getPromotionForProduct(
  productId: string,
  sellerId: string,
  basePrice: number,
  allCartProductIds: string[]
): Promise<PromotionMatch | null> {
  // Get all active promotions for this seller
  const now = new Date()
  const promotions = await prisma.promotion.findMany({
    where: {
      sellerId,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
      // Check usage limits
      OR: [
        { maxUsage: null }, // Unlimited
        { maxUsage: { gt: 0 } }, // Has max usage set
      ],
    },
  })

  let bestMatch: PromotionMatch | null = null
  let bestDiscount = 0

  for (const promo of promotions) {
    // Skip if promotion has maxUsage and already reached
    if (promo.maxUsage !== null && promo.usageCount >= promo.maxUsage) {
      continue
    }

    // Check if this product is in the promotion
    let productMatches = false
    if (promo.type === 'BUNDLE') {
      productMatches = promo.productIds.includes(productId)
    } else {
      // DISCOUNT or FLASH_SALE
      productMatches = promo.productIds.length === 0 || promo.productIds.includes(productId)
    }

    if (!productMatches) {
      continue
    }

    let discountAmount = 0
    let discountedPrice = basePrice

    if (promo.type === 'BUNDLE') {
      // BUNDLE: All products in bundle must be in cart
      const allBundleProductInCart = promo.productIds.every((id) =>
        allCartProductIds.includes(id)
      )

      if (!allBundleProductInCart) {
        continue
      }

      const cartBundleProducts = promo.productIds.filter((id) =>
        allCartProductIds.includes(id)
      )

      const isFirstBundleProduct = cartBundleProducts[0] === productId
      
      if (isFirstBundleProduct) {
        discountedPrice = promo.bundlePrice || basePrice
        discountAmount = basePrice - discountedPrice
        
        bestMatch = {
          promotionId: promo.id,
          type: promo.type,
          discountAmount,
          discountedPrice,
          originalPrice: basePrice,
          isBundlePrimaryDesign: true,
          bundlePrice: promo.bundlePrice,
          bundleItemCount: cartBundleProducts.length
        }
        break
      } else if (cartBundleProducts.includes(productId)) {
        discountedPrice = 0
        discountAmount = basePrice
        
        bestMatch = {
          promotionId: promo.id,
          type: promo.type,
          discountAmount,
          discountedPrice,
          originalPrice: basePrice,
          isBundlePrimaryDesign: false,
          bundlePrice: promo.bundlePrice,
          bundleItemCount: cartBundleProducts.length
        }
        break
      }
      
      continue
    } else if (promo.type === 'DISCOUNT' || promo.type === 'FLASH_SALE') {
      if (promo.discountType === 'PERCENTAGE' && promo.discountValue) {
        discountAmount = (basePrice * promo.discountValue) / 100
        discountedPrice = basePrice - discountAmount
      } else if (promo.discountType === 'FIXED' && promo.discountValue) {
        discountAmount = promo.discountValue
        discountedPrice = Math.max(0, basePrice - discountAmount)
      }

      if (discountAmount > bestDiscount) {
        bestDiscount = discountAmount
        bestMatch = {
          promotionId: promo.id,
          type: promo.type,
          discountAmount,
          discountedPrice,
          originalPrice: basePrice,
        }
      }
    }
  }

  return bestMatch
}

/**
 * Apply promotions to all items in a cart and return updated prices
 * 
 * @param cartItems - Array of cart items with designId, quantity, and price
 * @param sellerId - Seller ID
 * @returns Updated cart items with promotion info
 */
export async function applyPromotionsToCart(
  cartItems: Array<{ designId: string; quantity: number; price: number }>,
  sellerId: string
): Promise<
  Array<{
    designId: string
    quantity: number
    price: number
    originalPrice: number
    promotionId: string | null
    promotionType: string | null
    discountAmount: number
  }>
> {
  const allDesignIds = cartItems.map((item) => item.designId)

  const updatedItems = await Promise.all(
    cartItems.map(async (item) => {
      const promotion = await getPromotionForDesign(
        item.designId,
        sellerId,
        item.price,
        allDesignIds
      )

      return {
        designId: item.designId,
        quantity: item.quantity,
        price: promotion?.discountedPrice || item.price,
        originalPrice: item.price,
        promotionId: promotion?.promotionId || null,
        promotionType: promotion?.type || null,
        discountAmount: promotion?.discountAmount || 0,
      }
    })
  )

  return updatedItems
}

/**
 * Increment promotion usage after successful order
 */
export async function incrementPromotionUsage(promotionIds: string[]): Promise<void> {
  const uniquePromotionIds = [...new Set(promotionIds)]

  for (const promotionId of uniquePromotionIds) {
    await prisma.promotion.update({
      where: { id: promotionId },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    })
  }
}
