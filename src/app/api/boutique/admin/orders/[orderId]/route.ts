import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await params

    const order = await prisma.boutiqueOrder.findUnique({
      where: { id: orderId },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true, // Admin only - for disputes/urgent contact
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true, // Admin only - for disputes/urgent contact
            sellerAccount: {
              select: {
                bankName: true,
                accountNumber: true,
                accountName: true,
              },
            },
          },
        },
        items: {
          include: {
            product: {
              include: {
                seller: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                category: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Admin order detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await params
    const body = await request.json()
    const { status, trackingNumber, trackingUrl, notes } = body

    // Validate status if provided
    const validStatuses = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const existingOrder = await prisma.boutiqueOrder.findUnique({
      where: { id: orderId },
      include: {
        seller: { select: { id: true, name: true, email: true } },
      },
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Build update data with status-specific timestamps
    const updateData: Record<string, unknown> = {}
    if (status) {
      updateData.status = status
      // Set timestamps based on status change
      if (status === 'SHIPPED' && !existingOrder.shippedAt) {
        updateData.shippedAt = new Date()
      }
      if (status === 'DELIVERED' && !existingOrder.deliveredAt) {
        updateData.deliveredAt = new Date()
      }
      if (status === 'COMPLETED' && !existingOrder.completedAt) {
        updateData.completedAt = new Date()
      }
    }
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber
    if (trackingUrl !== undefined) updateData.trackingUrl = trackingUrl
    if (notes !== undefined) updateData.adminNotes = notes

    const order = await prisma.boutiqueOrder.update({
      where: { id: orderId },
      data: updateData,
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true, // Admin only - for disputes/urgent contact
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true, // Admin only - for disputes/urgent contact
            sellerAccount: {
              select: {
                bankName: true,
                accountNumber: true,
                accountName: true,
              },
            },
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                thumbnailUrl: true,
              },
            },
          },
        },
      },
    })

    const productTitle = order.items[0]?.product.title || 'your order'
    const orderUrl = `${process.env.NEXTAUTH_URL}/boutique/orders/${order.id}`

    // Send notification emails based on status change
    if (status && status !== existingOrder.status) {
      // Email to buyer
      if (order.buyer?.email) {
        let subject = ''
        let content = ''

        switch (status) {
          case 'SHIPPED':
            subject = `Your Order #${order.orderNumber} Has Been Shipped! 🚚`
            content = `
              <h2>Your Order is On Its Way!</h2>
              <p>Hi ${order.buyer.name || 'Customer'},</p>
              <p>Great news! Your order <strong>#${order.orderNumber}</strong> has been shipped.</p>
              
              ${trackingNumber ? `
              <h3>Tracking Information</h3>
              <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
              ${trackingUrl ? `<p><a href="${trackingUrl}">Track Your Package</a></p>` : ''}
              ` : ''}
              
              <p><strong>Product:</strong> ${productTitle}</p>
              
              <p><a href="${orderUrl}">View Order Details</a></p>
            `
            break

          case 'DELIVERED':
            subject = `Your Order #${order.orderNumber} Has Been Delivered! 📦`
            content = `
              <h2>Your Order Has Arrived!</h2>
              <p>Hi ${order.buyer.name || 'Customer'},</p>
              <p>Your order <strong>#${order.orderNumber}</strong> has been delivered.</p>
              
              <p><strong>Product:</strong> ${productTitle}</p>
              
              <h3>What's Next?</h3>
              <p>Please confirm you've received your order and everything is as expected:</p>
              <p><a href="${orderUrl}" style="display: inline-block; background: #9333ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Confirm Delivery & Leave Review</a></p>
              
              <p>If there's any issue with your order, you can request a return from the same page.</p>
            `
            break

          case 'COMPLETED':
            subject = `Order #${order.orderNumber} Completed! Thank You! 🎉`
            content = `
              <h2>Order Complete!</h2>
              <p>Hi ${order.buyer.name || 'Customer'},</p>
              <p>Your order <strong>#${order.orderNumber}</strong> is now complete. Thank you for shopping with us!</p>
              
              <p><strong>Product:</strong> ${productTitle}</p>
              
              <h3>We'd Love Your Feedback!</h3>
              <p>Please take a moment to leave a review for the product:</p>
              <p><a href="${orderUrl}" style="display: inline-block; background: #9333ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Leave a Review</a></p>
            `
            break

          case 'CANCELLED':
            subject = `Order #${order.orderNumber} Cancelled`
            content = `
              <h2>Order Cancelled</h2>
              <p>Hi ${order.buyer.name || 'Customer'},</p>
              <p>Your order <strong>#${order.orderNumber}</strong> has been cancelled.</p>
              <p>If you paid for this order, your refund will be processed within 3-5 business days.</p>
              <p>If you have any questions, please contact our support team.</p>
            `
            break
        }

        if (subject && content) {
          await sendEmail({
            to: order.buyer.email,
            subject,
            html: content,
          })
        }
      }

      // Email to seller for relevant status changes
      if (order.seller?.email && ['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(status)) {
        let sellerSubject = ''
        let sellerContent = ''

        switch (status) {
          case 'SHIPPED':
            sellerSubject = `Order #${order.orderNumber} Shipped`
            sellerContent = `
              <h2>Order Shipped</h2>
              <p>Hi ${order.seller.name || 'Seller'},</p>
              <p>Order <strong>#${order.orderNumber}</strong> has been shipped to the customer.</p>
              <p><strong>Product:</strong> ${productTitle}</p>
              ${trackingNumber ? `<p><strong>Tracking:</strong> ${trackingNumber}</p>` : ''}
              <p><a href="${process.env.NEXTAUTH_URL}/seller/boutique/orders">View Your Orders</a></p>
            `
            break

          case 'DELIVERED':
            sellerSubject = `Order #${order.orderNumber} Delivered - Awaiting Confirmation`
            sellerContent = `
              <h2>Order Delivered</h2>
              <p>Hi ${order.seller.name || 'Seller'},</p>
              <p>Order <strong>#${order.orderNumber}</strong> has been delivered to the customer.</p>
              <p>Once the customer confirms receipt, your payout will be processed.</p>
              <p><strong>Product:</strong> ${productTitle}</p>
              <p><strong>Your Payout:</strong> ₦${order.sellerPayout?.toLocaleString() || 'N/A'}</p>
            `
            break

          case 'COMPLETED':
            sellerSubject = `🎉 Order #${order.orderNumber} Completed - Payout Processing`
            sellerContent = `
              <h2>Order Completed!</h2>
              <p>Hi ${order.seller.name || 'Seller'},</p>
              <p>Great news! Order <strong>#${order.orderNumber}</strong> has been marked as complete.</p>
              <p><strong>Product:</strong> ${productTitle}</p>
              <p><strong>Your Payout:</strong> ₦${order.sellerPayout?.toLocaleString() || 'N/A'}</p>
              <p>Your payout will be transferred to your bank account within 24-48 hours.</p>
            `
            break
        }

        if (sellerSubject && sellerContent) {
          await sendEmail({
            to: order.seller.email,
            subject: sellerSubject,
            html: sellerContent,
          })
        }
      }
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Admin order update error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
