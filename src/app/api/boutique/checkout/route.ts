// POST /api/boutique/checkout - Create boutique order and initiate payment
// GET /api/boutique/checkout/[orderId] - Get order status

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { paystack, isPaystackConfigured } from '@/lib/paystack';
import { 
  FULFILLMENT_METHOD, 
  ORDER_STATUS,
  getCommissionRate,
  BOUTIQUE_DEFAULTS,
  type FulfillmentMethod,
  type SellerTier,
} from '@/lib/boutique/constants';
import { 
  calculateAdminShipping, 
  calculateSellerDirectShipping 
} from '@/lib/boutique/shipping';

// Generate unique order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BTQ-${timestamp}-${random}`;
}

// Calculate platform fee based on fulfillment method and seller tier
function calculatePlatformFee(
  amount: number, 
  fulfillmentMethod: FulfillmentMethod, 
  sellerTier: SellerTier | null
): number {
  const commissionRate = getCommissionRate(sellerTier, fulfillmentMethod);
  return Math.round(amount * commissionRate) / 100;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      shippingAddress, 
      paymentMethod = 'paystack',
      couponCode,
    } = body;

    // Validate shipping address
    if (!shippingAddress || !shippingAddress.name || !shippingAddress.street || 
        !shippingAddress.city || !shippingAddress.state || !shippingAddress.phone) {
      return NextResponse.json(
        { success: false, message: 'Complete shipping address is required' },
        { status: 400 }
      );
    }

    // Get user's cart items
    const cartItems = await prisma.boutiqueCartItem.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          include: {
            seller: {
              select: { 
                id: true, 
                name: true, 
                email: true,
                designerTier: true,
              },
            },
          },
        },
        variant: true,
      },
    });

    if (cartItems.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Validate all items are available
    const unavailableItems = cartItems.filter(
      item => item.product.status !== 'LIVE' || 
              !item.variant || 
              item.variant.quantity < item.quantity
    );

    if (unavailableItems.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Some items are no longer available',
          unavailableItems: unavailableItems.map(i => i.product.title),
        },
        { status: 400 }
      );
    }

    // Group items by seller and fulfillment method
    const orderGroups = new Map<string, typeof cartItems>();
    
    for (const item of cartItems) {
      const key = `${item.product.sellerId}-${item.product.fulfillmentMethod}`;
      if (!orderGroups.has(key)) {
        orderGroups.set(key, []);
      }
      orderGroups.get(key)!.push(item);
    }

    // Calculate totals with shipping
    let grandSubtotal = 0;
    let grandShipping = 0;
    const buyerState = shippingAddress.state;
    
    const orderPreviews: Array<{
      sellerId: string;
      sellerName: string;
      fulfillmentMethod: FulfillmentMethod;
      items: typeof cartItems;
      subtotal: number;
      shippingCost: number;
      shippingDestination: 'PLATFORM' | 'SELLER'; // Who receives shipping fee
      platformFee: number;
      sellerEarnings: number;
    }> = [];

    for (const [key, items] of orderGroups) {
      const seller = items[0].product.seller;
      const fulfillmentMethod = items[0].product.fulfillmentMethod as FulfillmentMethod;
      
      const subtotal = items.reduce((sum, item) => {
        const price = item.product.salePrice || item.product.basePrice;
        const adjustment = item.variant?.priceAdjustment || 0;
        return sum + (price + adjustment) * item.quantity;
      }, 0);

      // Calculate shipping based on fulfillment method
      let shippingCost = 0;
      let shippingDestination: 'PLATFORM' | 'SELLER' = 'PLATFORM';
      
      if (fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT) {
        // SELLER_DIRECT: Use seller's shipping fee, goes to seller (minus commission)
        const firstProduct = items[0].product;
        const sellerShipping = calculateSellerDirectShipping(
          firstProduct.sellerShippingFee || null,
          firstProduct.sellerShippingLocations || [],
          buyerState
        );
        
        if (!sellerShipping.canShip) {
          return NextResponse.json(
            { 
              success: false, 
              message: `${seller.name || 'Seller'} does not ship to ${buyerState}. Please remove those items.` 
            },
            { status: 400 }
          );
        }
        
        shippingCost = sellerShipping.cost;
        shippingDestination = 'SELLER';
      } else {
        // ADMIN_STOCK: Use platform shipping rates, 100% to platform
        const totalWeight = items.reduce((sum, item) => {
          return sum + ((item.product as { weight?: number }).weight || 0.5) * item.quantity;
        }, 0);
        
        const adminShipping = await calculateAdminShipping(buyerState, subtotal, totalWeight);
        shippingCost = adminShipping.cost;
        shippingDestination = 'PLATFORM';
      }

      // Calculate platform fee
      // For SELLER_DIRECT: Commission applies to (product + shipping)
      // For ADMIN_STOCK: Commission only on products, shipping 100% to platform
      const commissionableAmount = fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT
        ? subtotal + shippingCost  // Commission on products + shipping
        : subtotal;  // Commission only on products
        
      const platformFee = calculatePlatformFee(
        commissionableAmount, 
        fulfillmentMethod, 
        seller.designerTier as SellerTier | null
      );

      // Calculate seller earnings
      // SELLER_DIRECT: Gets (product + shipping) - platformFee
      // ADMIN_STOCK: Gets product - platformFee (shipping goes to platform)
      const sellerEarnings = fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT
        ? (subtotal + shippingCost) - platformFee
        : subtotal - platformFee;

      orderPreviews.push({
        sellerId: seller.id,
        sellerName: seller.name || 'Unknown Seller',
        fulfillmentMethod,
        items,
        subtotal,
        shippingCost,
        shippingDestination,
        platformFee,
        sellerEarnings,
      });

      grandSubtotal += subtotal;
      grandShipping += shippingCost;
    }

    const grandTotal = grandSubtotal + grandShipping;

    // Apply coupon if provided
    let discount = 0;
    let appliedCoupon: { id: string; discountType: string; discountValue: number; maxDiscount: number | null } | null = null;
    
    if (couponCode) {
      // First get all matching coupons, then filter by usedCount < maxUses
      const coupon = await prisma.boutiqueCoupon.findFirst({
        where: {
          code: couponCode.toUpperCase(),
          isActive: true,
          validFrom: { lte: new Date() },
          validUntil: { gte: new Date() },
        },
      });

      // Check if coupon exists and has uses remaining
      if (coupon && coupon.usedCount < coupon.maxUses) {
        if (coupon.discountType === 'PERCENTAGE') {
          discount = Math.round(grandTotal * coupon.discountValue / 100);
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
        } else {
          discount = coupon.discountValue;
        }
        appliedCoupon = coupon;
        
        // Increment coupon usage count
        await prisma.boutiqueCoupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    const finalTotal = grandTotal - discount;

    // Create orders in database
    const createdOrders: string[] = [];
    
    for (const orderPreview of orderPreviews) {
      const isSellerDirect = orderPreview.fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT;
      
      // Calculate proportional discount for this order
      const orderProportion = (orderPreview.subtotal + orderPreview.shippingCost) / grandTotal;
      const orderDiscount = Math.round(discount * orderProportion);
      const orderTotal = orderPreview.subtotal + orderPreview.shippingCost - orderDiscount;
      
      // Create order
      const order = await prisma.boutiqueOrder.create({
        data: {
          orderNumber: generateOrderNumber(),
          buyerId: session.user.id,
          sellerId: orderPreview.sellerId,
          productId: orderPreview.items[0].product.id, // Primary product
          status: 'PENDING_PAYMENT',
          fulfillmentMethod: orderPreview.fulfillmentMethod,
          subtotal: orderPreview.subtotal,
          discount: orderDiscount,
          shippingCost: orderPreview.shippingCost,
          platformFee: orderPreview.platformFee,
          sellerPayout: orderPreview.sellerEarnings,
          total: orderTotal,
          currency: 'NGN',
          shippingAddress: shippingAddress,
          paymentMethod,
          items: {
            create: orderPreview.items.map(item => {
              const unitPrice = (item.product.salePrice || item.product.basePrice) + (item.variant?.priceAdjustment || 0);
              return {
                productId: item.product.id,
                variantId: item.variant!.id,
                quantity: item.quantity,
                price: unitPrice,
                finalPrice: unitPrice * item.quantity,
                variantSnapshot: item.variant ? {
                  size: item.variant.size,
                  color: item.variant.color,
                  colorHex: item.variant.colorHex,
                } : null,
              };
            }),
          },
        },
      });

      createdOrders.push(order.id);

      // Reserve inventory
      for (const item of orderPreview.items) {
        await prisma.boutiqueProductVariant.update({
          where: { id: item.variant!.id },
          data: { 
            quantity: { decrement: item.quantity },
            reserved: { increment: item.quantity },
          },
        });
      }
    }

    // Clear cart
    await prisma.boutiqueCartItem.deleteMany({
      where: { userId: session.user.id },
    });

    // Initialize payment based on method
    if (paymentMethod === 'paystack' && isPaystackConfigured()) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, name: true },
      });

      // Paystack amount in kobo
      const amountKobo = Math.round(finalTotal * 100);
      
      const paystackResponse = await paystack.transaction.initialize({
        email: user?.email || session.user.email!,
        amount: amountKobo,
        currency: 'NGN',
        reference: `BTQ-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        callback_url: `${process.env.NEXTAUTH_URL}/boutique/checkout/callback`,
        metadata: {
          orderIds: createdOrders,
          orderType: 'boutique',
          buyerId: session.user.id,
          custom_fields: [
            { display_name: 'Order Type', variable_name: 'order_type', value: 'Boutique' },
            { display_name: 'Customer Name', variable_name: 'customer_name', value: user?.name || 'Customer' },
          ],
        },
      });

      if (!paystackResponse.status) {
        // Rollback: restore inventory and delete orders
        for (const orderId of createdOrders) {
          const order = await prisma.boutiqueOrder.findUnique({
            where: { id: orderId },
            include: { items: true },
          });
          if (order) {
            for (const item of order.items) {
              if (item.variantId) {
                await prisma.boutiqueProductVariant.update({
                  where: { id: item.variantId },
                  data: {
                    quantity: { increment: item.quantity },
                    reserved: { decrement: item.quantity },
                  },
                });
              }
            }
            await prisma.boutiqueOrder.delete({ where: { id: orderId } });
          }
        }
        
        return NextResponse.json(
          { success: false, message: 'Payment initialization failed' },
          { status: 500 }
        );
      }

      // Update orders with payment reference
      await prisma.boutiqueOrder.updateMany({
        where: { id: { in: createdOrders } },
        data: { paymentReference: paystackResponse.data.reference },
      });

      return NextResponse.json({
        success: true,
        message: 'Checkout initiated',
        paymentUrl: paystackResponse.data.authorization_url,
        reference: paystackResponse.data.reference,
        orderIds: createdOrders,
        subtotal: grandSubtotal,
        shipping: grandShipping,
        discount,
        total: finalTotal,
      });
    }

    // For other payment methods or if Paystack not configured
    return NextResponse.json({
      success: true,
      message: 'Orders created - awaiting payment',
      orderIds: createdOrders,
      subtotal: grandSubtotal,
      shipping: grandShipping,
      discount,
      total: finalTotal,
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { success: false, message: 'Checkout failed' },
      { status: 500 }
    );
  }
}

// GET - Get checkout summary before payment
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get cart items with fulfillment info
    const cartItems = await prisma.boutiqueCartItem.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          include: {
            seller: {
              select: { id: true, name: true, designerTier: true },
            },
          },
        },
        variant: true,
      },
    });

    if (cartItems.length === 0) {
      return NextResponse.json({
        success: true,
        summary: {
          items: [],
          subtotal: 0,
          hasSellerDirect: false,
          hasMixedFulfillment: false,
        },
      });
    }

    // Check fulfillment types
    const fulfillmentTypes = new Set(cartItems.map(i => i.product.fulfillmentMethod));
    const hasSellerDirect = fulfillmentTypes.has(FULFILLMENT_METHOD.SELLER_DIRECT);
    const hasMixedFulfillment = fulfillmentTypes.size > 1;

    // Group by seller for display
    const sellerGroups = new Map<string, {
      seller: { id: string; name: string | null };
      fulfillmentMethod: string;
      items: typeof cartItems;
      subtotal: number;
    }>();

    for (const item of cartItems) {
      const key = `${item.product.sellerId}-${item.product.fulfillmentMethod}`;
      if (!sellerGroups.has(key)) {
        sellerGroups.set(key, {
          seller: item.product.seller,
          fulfillmentMethod: item.product.fulfillmentMethod || FULFILLMENT_METHOD.ADMIN_STOCK,
          items: [],
          subtotal: 0,
        });
      }
      const group = sellerGroups.get(key)!;
      group.items.push(item);
      const price = item.product.salePrice || item.product.basePrice;
      const adjustment = item.variant?.priceAdjustment || 0;
      group.subtotal += (price + adjustment) * item.quantity;
    }

    const subtotal = cartItems.reduce((sum, item) => {
      const price = item.product.salePrice || item.product.basePrice;
      const adjustment = item.variant?.priceAdjustment || 0;
      return sum + (price + adjustment) * item.quantity;
    }, 0);

    return NextResponse.json({
      success: true,
      summary: {
        items: cartItems.map(item => ({
          id: item.id,
          product: {
            id: item.product.id,
            title: item.product.title,
            thumbnailUrl: item.product.thumbnailUrl,
            fulfillmentMethod: item.product.fulfillmentMethod,
            sellerShippingTime: item.product.sellerShippingTime,
          },
          variant: item.variant,
          quantity: item.quantity,
          price: (item.product.salePrice || item.product.basePrice) + (item.variant?.priceAdjustment || 0),
          seller: item.product.seller,
        })),
        sellerGroups: Array.from(sellerGroups.values()).map(g => ({
          sellerId: g.seller.id,
          sellerName: g.seller.name,
          fulfillmentMethod: g.fulfillmentMethod,
          itemCount: g.items.length,
          subtotal: g.subtotal,
        })),
        subtotal,
        hasSellerDirect,
        hasMixedFulfillment,
        sellerDirectNote: hasSellerDirect 
          ? 'Some items ship directly from sellers. Delivery times may vary.'
          : null,
      },
    });

  } catch (error) {
    console.error('Error getting checkout summary:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get checkout summary' },
      { status: 500 }
    );
  }
}
