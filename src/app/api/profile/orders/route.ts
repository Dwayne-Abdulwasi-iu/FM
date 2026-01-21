import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Fetch all orders for the user including POD orders
    const orders = await prisma.order.findMany({
      where: {
        customerId: session.user.id,
        status: { in: ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] }
      },
      include: {
        items: {
          include: {
            design: {
              select: {
                id: true,
                title: true,
                imageUrl: true,
                thumbnailUrl: true,
                category: true,
                mediaFiles: {
                  select: {
                    id: true,
                    fileUrl: true,
                    fileName: true,
                    fileType: true,
                    mimeType: true,
                    sortOrder: true
                  },
                  orderBy: {
                    sortOrder: 'asc'
                  }
                },
                designer: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Map orders to a cleaner structure
    const mappedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      orderType: order.orderType,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      paymentMethod: order.paymentMethod,
      
      // POD-specific fields
      podProvider: order.podProvider,
      podStatus: order.podStatus,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      estimatedDelivery: order.estimatedDelivery,
      
      // Shipping address
      shipping: order.orderType === 'POD' ? {
        name: order.shippingName,
        address1: order.shippingAddress1,
        address2: order.shippingAddress2,
        city: order.shippingCity,
        state: order.shippingState,
        country: order.shippingCountry,
        zip: order.shippingZip,
        phone: order.shippingPhone
      } : null,
      
      // Order items
      items: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        purchaseType: item.purchaseType,
        podProductId: item.podProductId,
        podProductName: item.podProductName,
        design: item.design
      }))
    }))

    // Separate digital and POD orders
    const digitalOrders = mappedOrders.filter(o => o.orderType === 'DIGITAL')
    const podOrders = mappedOrders.filter(o => o.orderType === 'POD')

    return NextResponse.json({
      orders: mappedOrders,
      digitalOrders,
      podOrders,
      counts: {
        total: mappedOrders.length,
        digital: digitalOrders.length,
        pod: podOrders.length
      }
    })

  } catch (error) {
    console.error('Get orders error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
