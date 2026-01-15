import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createPODOrder, getOrderStatus, isPODConfigured, PODOrderInput } from '@/lib/pod-service';
import prisma from '@/lib/prisma';

/**
 * GET /api/pod/orders
 * Get POD orders for the current seller
 * Note: Since the schema doesn't have POD-specific fields yet,
 * this returns regular orders that can be associated with POD products
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get orders for designs owned by this seller
    const whereClause: Record<string, unknown> = {
      items: {
        some: {
          design: {
            designerId: session.user.id
          }
        }
      }
    };

    if (status) {
      whereClause.status = status.toUpperCase();
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          items: {
            include: {
              design: {
                select: {
                  id: true,
                  title: true,
                  imageUrl: true,
                  designerId: true
                }
              }
            }
          },
          customer: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.order.count({ where: whereClause })
    ]);

    // Transform orders to match POD order format
    type OrderWithRelations = typeof orders[number];
    const podOrders = orders.map((order: OrderWithRelations) => ({
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      totalAmount: order.totalAmount,
      orderItems: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        design: item.design
      })),
      user: order.customer,
      // POD-specific fields (placeholder for future schema update)
      podOrderId: null,
      podProvider: null,
      trackingNumber: null,
      trackingUrl: null
    }));

    return NextResponse.json({
      success: true,
      orders: podOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get POD orders error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch POD orders'
    }, { status: 500 });
  }
}

/**
 * POST /api/pod/orders
 * Create a new POD order
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
    const {
      provider = 'printful',
      designId,
      productId,
      variantId,
      quantity = 1,
      shippingAddress
    } = body;

    // Validate required fields
    if (!designId || !productId || !variantId || !shippingAddress) {
      return NextResponse.json(
        { message: 'Missing required fields: designId, productId, variantId, shippingAddress' },
        { status: 400 }
      );
    }

    // Get the design to get the image URL
    const design = await prisma.design.findUnique({
      where: { id: designId },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        designerId: true,
        price: true
      }
    });

    if (!design) {
      return NextResponse.json(
        { message: 'Design not found' },
        { status: 404 }
      );
    }

    const validProvider = provider as 'printful' | 'printify' | 'gooten' | 'printivo';

    // Check if provider is configured
    if (!isPODConfigured(validProvider)) {
      // Return mock order for development
      const mockOrder = {
        id: `mock-pod-${Date.now()}`,
        status: 'pending',
        provider: 'mock',
        items: [{
          productId,
          variantId,
          quantity,
          designUrl: design.imageUrl
        }],
        shipping: shippingAddress,
        createdAt: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        configured: false,
        order: mockOrder,
        message: 'Mock order created. Configure POD API keys for real orders.'
      });
    }

    // Create the POD order
    const orderInput: PODOrderInput = {
      items: [{
        productId,
        variantId,
        quantity,
        imageUrl: design.imageUrl,
        placement: 'front'
      }],
      shippingAddress: {
        name: shippingAddress.name,
        address1: shippingAddress.address1,
        address2: shippingAddress.address2 || '',
        city: shippingAddress.city,
        state: shippingAddress.state || '',
        country: shippingAddress.country,
        zip: shippingAddress.zip
      }
    };

    const podOrder = await createPODOrder(validProvider, orderInput);

    // Store the order in our database
    // Link it to the design and seller

    return NextResponse.json({
      success: true,
      configured: true,
      order: podOrder,
      provider
    });

  } catch (error) {
    console.error('Create POD order error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create POD order',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
