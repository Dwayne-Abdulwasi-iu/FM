// POST /api/boutique/checkout - Create boutique order and initiate payment
// GET /api/boutique/checkout/[orderId] - Get order status
//
// PAYMENT & REFUND POLICY:
// -------------------------
// ADMIN_STOCK orders:
//   - Platform receives 100% of payment (tiered commission 0.1%-8% after seller payout)
//   - Platform handles shipping, returns, and refunds directly via Paystack
//   - Full refund control since platform holds the funds
//
// SELLER_DIRECT orders:
//   - Paystack split pays seller directly at checkout (minus tiered 0.1%-8% commission)
//   - Refunds/Returns require MANUAL seller coordination:
//     1. Buyer requests return via /api/boutique/returns
//     2. Admin reviews and approves/rejects
//     3. Seller processes refund back to buyer
//   - Platform can only automatically refund its commission portion

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { paystack, isPaystackConfigured } from '@/lib/paystack';
import { getPaymentProcessor, extractGeoLocation, type PaymentProcessor } from '@/lib/geo-detection';
import { 
  FULFILLMENT_METHOD, 
  getCommissionRate,
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
// Both ADMIN_STOCK and SELLER_DIRECT use tiered rates (0.1%-8%) based on seller's total earnings
async function calculatePlatformFee(
  amount: number, 
  fulfillmentMethod: FulfillmentMethod, 
  sellerTier: SellerTier | null,
  sellerId: string
): Promise<number> {
  // Fetch seller's total earnings and subscription status for tiered calculation
  const sellerStats = await prisma.user.findUnique({
    where: { id: sellerId },
    select: { 
      totalEarnings: true,
      designerTier: true, // VIP/VVIP are pro subscribers
    },
  });
  
  const sellerTotalEarnings = sellerStats?.totalEarnings || 0;
  const isProSubscriber = sellerStats?.designerTier === 'VIP_DESIGNER' || sellerStats?.designerTier === 'VVIP_DESIGNER';
  
  // Get commission rate using tiered system (applies to both ADMIN_STOCK and SELLER_DIRECT)
  const commissionRate = getCommissionRate(sellerTier, fulfillmentMethod, sellerTotalEarnings, isProSubscriber);
  return Math.round(amount * commissionRate * 100) / 100; // Return in same currency unit
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
      buyerCountry: providedBuyerCountry,
    } = body;

    // Extract buyer country from request headers if not provided
    const headerObject = Object.fromEntries(request.headers);
    const geoLocation = extractGeoLocation(headerObject);
    const buyerCountry = providedBuyerCountry || geoLocation.countryCode || 'NG';

    // Determine payment processor based on buyer geography
    const paymentProcessor = getPaymentProcessor(buyerCountry);

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

    // Validate all items are available AND reserve them in a transaction
    // This prevents race conditions where multiple checkouts could oversell
    
    // First, validate everything is available
    const unavailableItems = cartItems.filter(
      item => item.product.status !== 'LIVE' || 
              !item.variant || 
              (item.variant.quantity - item.variant.reserved) < item.quantity
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

    // Reserve stock atomically per variant to prevent race conditions
    // This ensures only one checkout can claim the stock
    for (const item of cartItems) {
      if (!item.variant) continue;
      
      // Use a transaction to check available quantity and reserve atomically
      try {
        await prisma.$transaction(async (tx) => {
          const currentVariant = await tx.boutiqueProductVariant.findUnique({
            where: { id: item.variant!.id }
          });
          
          if (!currentVariant) {
            throw new Error(`Variant ${item.variant!.id} not found`);
          }
          
          const available = currentVariant.quantity - currentVariant.reserved;
          if (available < item.quantity) {
            throw new Error(`Insufficient stock for variant ${item.variant!.id}. Available: ${available}, Requested: ${item.quantity}`);
          }
          
          // Reserve the stock
          await tx.boutiqueProductVariant.update({
            where: { id: item.variant!.id },
            data: {
              quantity: { decrement: item.quantity },
              reserved: { increment: item.quantity },
            },
          });
        });
      } catch (error) {
        // If any variant fails to reserve, the transaction rolls back
        // Restore inventory for already-reserved items
        for (const previousItem of cartItems) {
          if (previousItem.variant && previousItem !== item) {
            try {
              await prisma.boutiqueProductVariant.update({
                where: { id: previousItem.variant.id },
                data: {
                  quantity: { increment: previousItem.quantity },
                  reserved: { decrement: previousItem.quantity },
                },
              });
            } catch (restoreError) {
              console.error('Error restoring inventory:', restoreError);
            }
          }
        }
        
        const errorMessage = error instanceof Error ? error.message : 'Stock reservation failed';
        return NextResponse.json(
          { 
            success: false, 
            message: 'Item(s) no longer available. Please try again.',
            details: errorMessage,
          },
          { status: 400 }
        );
      }
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

    for (const [_key, items] of orderGroups) {
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
      // Both ADMIN_STOCK and SELLER_DIRECT: Use tiered commission (0.1%-8%) based on seller's earnings
      // SELLER_DIRECT: Commission on products + shipping
      // ADMIN_STOCK: Commission on products only, shipping 100% to platform
      const commissionableAmount = fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT
        ? subtotal + shippingCost  // Commission on products + shipping
        : subtotal;  // Commission only on products
        
      const platformFee = await calculatePlatformFee(
        commissionableAmount, 
        fulfillmentMethod, 
        seller.designerTier as SellerTier | null,
        seller.id
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
    const finalTotal = grandTotal;

    // Create orders in database
    const createdOrders: string[] = [];
    
    for (const orderPreview of orderPreviews) {
      const orderTotal = orderPreview.subtotal + orderPreview.shippingCost;
      
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
          discount: 0,
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

    // Initialize payment based on processor selection
    if (paymentProcessor === 'PAYSTACK' && isPaystackConfigured()) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, name: true },
      });

      // Paystack amount in kobo
      const amountKobo = Math.round(finalTotal * 100);
      
      // Build subaccount splits for SELLER_DIRECT orders
      // SELLER_DIRECT uses automatic Paystack splits (tiered commission like digital designs)
      // ADMIN_STOCK goes fully to platform (manual payout after delivery)
      type SubaccountSplit = { subaccount: string; share: number };
      const sellerDirectSplits: SubaccountSplit[] = [];
      const sellerDirectOrderIds: string[] = [];
      const adminStockOrderIds: string[] = [];
      
      for (const orderPreview of orderPreviews) {
        const orderId = createdOrders[orderPreviews.indexOf(orderPreview)];
        
        if (orderPreview.fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT) {
          sellerDirectOrderIds.push(orderId);
          
          // Get seller's subaccount
          const sellerAccount = await prisma.sellerAccount.findUnique({
            where: { userId: orderPreview.sellerId },
            select: { subaccountCode: true },
          });
          
          if (sellerAccount?.subaccountCode) {
            // Seller's share = sellerEarnings in kobo
            // Note: sellerEarnings already accounts for platformFee
            const sellerShareKobo = Math.round(orderPreview.sellerEarnings * 100);
            
            sellerDirectSplits.push({
              subaccount: sellerAccount.subaccountCode,
              share: sellerShareKobo,
            });
          } else {
            // SELLER_DIRECT seller without subaccount - this is a problem
            // Block checkout and ask them to set up payment
            console.error(`[Boutique Checkout] SELLER_DIRECT seller ${orderPreview.sellerId} has no subaccount`);
            
            // Rollback: restore inventory and delete orders
            for (const rollbackOrderId of createdOrders) {
              const rollbackOrder = await prisma.boutiqueOrder.findUnique({
                where: { id: rollbackOrderId },
                include: { items: true },
              });
              if (rollbackOrder) {
                for (const item of rollbackOrder.items) {
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
                await prisma.boutiqueOrder.delete({ where: { id: rollbackOrderId } });
              }
            }
            
            return NextResponse.json({
              success: false,
              message: `Seller "${orderPreview.sellerName}" needs to complete payment setup. Please contact the seller or remove their products.`,
            }, { status: 400 });
          }
        } else {
          adminStockOrderIds.push(orderId);
        }
      }
      
      // Build transaction data
      const transactionData: Record<string, unknown> = {
        email: user?.email || session.user.email!,
        amount: amountKobo,
        currency: 'NGN',
        reference: `BTQ-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        callback_url: `${process.env.NEXTAUTH_URL}/boutique/checkout/callback`,
        metadata: {
          orderIds: createdOrders,
          orderType: 'boutique',
          buyerId: session.user.id,
          sellerDirectOrderIds,
          adminStockOrderIds,
          hasSplitPayment: sellerDirectSplits.length > 0,
          custom_fields: [
            { display_name: 'Order Type', variable_name: 'order_type', value: 'Boutique' },
            { display_name: 'Customer Name', variable_name: 'customer_name', value: user?.name || 'Customer' },
          ],
        },
      };
      
      // Add split payment configuration for SELLER_DIRECT orders
      // Always use flat split (not direct subaccount) to ensure our calculated tiered commission is used
      // Direct subaccount would use the subaccount's percentage_charge which may be outdated
      if (sellerDirectSplits.length > 0) {
        transactionData.split = {
          type: 'flat',
          bearer_type: 'account', // Platform pays transaction fees
          subaccounts: sellerDirectSplits,
        };
        console.log('[Boutique Checkout] Split payment configured:', JSON.stringify(transactionData.split, null, 2));
      }
      // If no sellerDirectSplits, all goes to platform (ADMIN_STOCK only)
      
      const paystackResponse = await paystack.transaction.initialize(transactionData);

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

      // Clear cart only after successful payment initialization
      await prisma.boutiqueCartItem.deleteMany({
        where: { userId: session.user.id },
      });

      return NextResponse.json({
        success: true,
        message: 'Checkout initiated',
        paymentUrl: paystackResponse.data.authorization_url,
        reference: paystackResponse.data.reference,
        orderIds: createdOrders,
        subtotal: grandSubtotal,
        shipping: grandShipping,
        total: finalTotal,
        buyer: {
          country: buyerCountry,
          paymentProcessor,
        },
      });
    }

    // For other payment methods or if Paystack not configured
    return NextResponse.json({
      success: true,
      message: 'Orders created - awaiting payment',
      orderIds: createdOrders,
      subtotal: grandSubtotal,
      shipping: grandShipping,
      total: finalTotal,
      buyer: {
        country: buyerCountry,
        paymentProcessor,
      },
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
export async function GET(_request: NextRequest) {
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
