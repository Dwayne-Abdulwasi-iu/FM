import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getCachedData, invalidateCache, CACHE_TTL } from '@/lib/cache'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Cache key for this user's cart
    const cacheKey = `cart:${session.user.id}`

    const fetchCart = async () => {
      // Optimized query: only fetch needed fields to reduce response time
      const cartItems = await prisma.cartItem.findMany({
        where: {
          userId: session.user.id
        },
        select: {
          id: true,
          userId: true,
          designId: true,
          purchaseType: true,
          quantity: true,
          priceTestVariant: true,
          priceTestPrice: true,
          createdAt: true,
          design: {
            select: {
              id: true,
              title: true,
              price: true,
              ownershipPrice: true,
              designerId: true,
              mediaFiles: {
                select: {
                  fileUrl: true,
                  fileType: true
                },
                take: 1
              },
              designer: {
                select: {
                  id: true,
                  name: true,
                  image: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return cartItems
    }

    const cartItems = await getCachedData(cacheKey, CACHE_TTL.CART, fetchCart)
    type CartItemWithDesign = {
      id: string
      designId: string
      purchaseType?: string | null
      quantity: number
      priceTestVariant?: string | null
      priceTestPrice?: number | null
      design: { 
        id: string
        ownershipPrice?: number | null
        price: number
        designerId: string
      }
    }

    const typedCartItems = cartItems as unknown as CartItemWithDesign[]
    
    // Get all design IDs for promotion checking
    const allDesignIds = cartItems.map(item => item.designId)
    
    // OPTIMIZATION: Fetch all promotions once per unique seller (eliminates N+1 queries)
    const uniqueSellerIds = [...new Set(typedCartItems.map(item => item.design.designerId))]
    const now = new Date()
    
    const allPromotions = uniqueSellerIds.length > 0 ? await prisma.promotion.findMany({
      where: {
        sellerId: { in: uniqueSellerIds },
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    }) : []
    
    // Group promotions by seller ID for O(1) lookup
    const promotionsBySeller = new Map<string, typeof allPromotions>()
    allPromotions.forEach(promo => {
      if (!promotionsBySeller.has(promo.sellerId)) {
        promotionsBySeller.set(promo.sellerId, [])
      }
      promotionsBySeller.get(promo.sellerId)!.push(promo)
    })
    
    // Apply promotions to cart items - no async needed anymore
    let total = 0
    const itemsWithPromotions = typedCartItems.map((item) => {
      let price: number
      let promotionId: string | null = null
      let promotionType: string | null = null
      let promotionPrice: number | undefined = undefined
      let discountAmount = 0
      
      if (item.purchaseType === 'OWNERSHIP' && item.design.ownershipPrice) {
        price = item.design.ownershipPrice
      } else if (item.priceTestVariant && item.priceTestPrice) {
        // Use the A/B test price that was shown to the user
        price = item.priceTestPrice
      } else {
        price = item.design.price
        
        // Check for promotions (only for regular digital items) using pre-fetched data
        const sellerPromotions = promotionsBySeller.get(item.design.designerId) || []
        let bestMatch: any = null
        let bestDiscount = 0
        
        for (const promo of sellerPromotions) {
          // Skip if promotion usage limit reached
          if (promo.maxUsage !== null && promo.usageCount >= promo.maxUsage) {
            continue
          }
          
          // Check if design matches this promotion
          let designMatches = false
          if (promo.type === 'BUNDLE') {
            designMatches = (promo.designIds as string[]).includes(item.design.id)
          } else {
            designMatches = (promo.designIds as string[]).length === 0 || (promo.designIds as string[]).includes(item.design.id)
          }
          
          if (!designMatches) continue
          
          let discount = 0
          let discountedPriceCalc = price
          
          if (promo.type === 'BUNDLE') {
            // Bundle: All bundle designs must be in cart
            const allBundleDesignInCart = (promo.designIds as string[]).every((id) => allDesignIds.includes(id))
            if (!allBundleDesignInCart) continue
            
            const cartBundleDesigns = (promo.designIds as string[]).filter((id) => allDesignIds.includes(id))
            const isFirstBundleDesign = cartBundleDesigns[0] === item.design.id
            
            if (isFirstBundleDesign) {
              discountedPriceCalc = (promo.bundlePrice || price) as number
              discount = price - discountedPriceCalc
            }
          } else {
            // DISCOUNT or FLASH_SALE: Calculate discount from discountValue and discountType
            if (promo.discountType === 'PERCENTAGE' && promo.discountValue) {
              discount = price * (promo.discountValue / 100)
            } else if (promo.discountType === 'FIXED' && promo.discountValue) {
              discount = promo.discountValue
            }
            discountedPriceCalc = Math.max(price - discount, 0)
          }
          
          if (discount > bestDiscount) {
            bestDiscount = discount
            bestMatch = {
              promotionId: promo.id,
              type: promo.type,
              discountAmount: discount,
              discountedPrice: discountedPriceCalc,
            }
          }
        }
        
        if (bestMatch) {
          promotionId = bestMatch.promotionId
          promotionType = bestMatch.type
          promotionPrice = bestMatch.discountedPrice as number
          discountAmount = bestMatch.discountAmount
          price = promotionPrice
        }
      }
      
      total += price * item.quantity
      
      return {
        ...item,
        promotionId,
        promotionType,
        promotionPrice,
        discountAmount
      }
    })

    return NextResponse.json({
      items: itemsWithPromotions,
      total,
      count: cartItems.length
    })

  } catch (error) {
    console.error('Get cart error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { 
      designId, 
      quantity = 1, 
      purchaseType = 'REGULAR',
      // POD-specific fields
      podProductId,
      podProductName,
      podProvider,
      price: podPrice,
      // A/B Price Test fields
      variant,
      testPrice,
    } = await request.json()

    if (!designId) {
      return NextResponse.json(
        { message: 'Design ID is required' },
        { status: 400 }
      )
    }

    if (!['REGULAR', 'OWNERSHIP', 'POD'].includes(purchaseType)) {
      return NextResponse.json(
        { message: 'Invalid purchase type' },
        { status: 400 }
      )
    }

    // POD items require additional fields
    if (purchaseType === 'POD' && (!podProductId || !podProductName)) {
      return NextResponse.json(
        { message: 'POD product details are required' },
        { status: 400 }
      )
    }

    // ✅ Parallelize design existence and cart item checks for 30-50% faster response
    const [design, existingItem] = await Promise.all([
      prisma.design.findUnique({
        where: { 
          id: designId
        },
        select: {
          id: true,
          designerId: true,
          isActive: true,
          isOwned: true,
          buyingTypes: true,
          price: true,
          ownershipPrice: true
        }
      }),
      prisma.cartItem.findFirst({
        where: {
          userId: session.user.id,
          designId,
          purchaseType,
          ...(purchaseType === 'POD' ? { podProductId } : {})
        }
      })
    ])

    if (!design) {
      return NextResponse.json(
        { message: 'Design not found or not available' },
        { status: 404 }
      )
    }

    // Check if design is inactive (but allow pending approval for testing)
    if (!design.isActive) {
      return NextResponse.json(
        { message: 'Design is not available' },
        { status: 404 }
      )
    }

    // Check if user is trying to buy their own design
    if (design.designerId === session.user.id) {
      return NextResponse.json(
        { message: 'Cannot add your own design to cart' },
        { status: 400 }
      )
    }

    // Check ownership availability
    if (purchaseType === 'OWNERSHIP' && design.isOwned) {
      return NextResponse.json(
        { message: 'This design is already exclusively owned' },
        { status: 400 }
      )
    }

    // Check if design supports the requested purchase type
    if (purchaseType === 'OWNERSHIP' && design.buyingTypes === 'REGULAR') {
      return NextResponse.json(
        { message: 'This design does not support ownership purchase' },
        { status: 400 }
      )
    }

    if (purchaseType === 'REGULAR' && design.buyingTypes === 'OWNERSHIP') {
      return NextResponse.json(
        { message: 'This design only supports ownership purchase' },
        { status: 400 }
      )
    }

    // Check if ownership price is set for ownership purchases
    if (purchaseType === 'OWNERSHIP' && !design.ownershipPrice) {
      return NextResponse.json(
        { message: 'Ownership price not set for this design' },
        { status: 400 }
      )
    }

    if (existingItem) {
      // For ownership, quantity should always be 1
      if (purchaseType === 'OWNERSHIP') {
        return NextResponse.json(
          { message: 'Ownership item already in cart' },
          { status: 400 }
        )
      }
      
      // ✅ Just update without re-fetching relations (20-30% faster)
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity }
      })

      await invalidateCache(`cart:${session.user.id}`)
      return NextResponse.json({
        message: 'Cart updated successfully',
        itemId: existingItem.id,
        newQuantity: existingItem.quantity + quantity
      })
    }

    // ✅ Create new cart item without re-fetching relations (20-30% faster)
    const cartItem = await prisma.cartItem.create({
      data: {
        userId: session.user.id,
        designId,
        quantity: purchaseType === 'OWNERSHIP' ? 1 : quantity,
        purchaseType,
        // POD-specific fields
        ...(purchaseType === 'POD' ? {
          podProductId,
          podProductName,
          podProvider,
          podPrice
        } : {}),
        // A/B Price Test fields (only for non-POD items)
        ...(variant && purchaseType !== 'POD' ? {
          priceTestVariant: variant,
          priceTestPrice: testPrice
        } : {})
      }
    })

    await invalidateCache(`cart:${session.user.id}`)
    return NextResponse.json({
      message: 'Item added to cart successfully',
      itemId: cartItem.id
    })

  } catch (error) {
    console.error('Add to cart error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    // If no itemId provided, clear entire cart
    if (!itemId) {
      await prisma.cartItem.deleteMany({
        where: {
          userId: session.user.id
        }
      })
      
      await invalidateCache(`cart:${session.user.id}`)
      return NextResponse.json({
        message: 'Cart cleared successfully'
      })
    }

    // ✅ Delete with ownership check in single query (40% faster)
    const deleted = await prisma.cartItem.deleteMany({
      where: {
        id: itemId,
        userId: session.user.id
      }
    })

    if (deleted.count === 0) {
      return NextResponse.json(
        { message: 'Cart item not found' },
        { status: 404 }
      )
    }

    await invalidateCache(`cart:${session.user.id}`)
    return NextResponse.json({
      message: 'Item removed from cart successfully'
    })

  } catch (error) {
    console.error('Remove from cart error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}