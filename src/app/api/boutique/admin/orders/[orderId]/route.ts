import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { sendEmail } from '@/lib/email'
import { requiresOverrideReason, type BoutiqueOrderStatus } from '@/lib/boutique/statusMapping'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== 'ADMIN') {
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

    // Fetch audit logs separately to avoid 500 error if table doesn't exist yet
    const auditLogs: any[] = []
    try {
      const logs = await prisma.boutiqueOrderAuditLog.findMany({
        where: { orderId },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      console.log(`[GET-ORDER] Fetched ${logs.length} audit logs for order ${orderId}`)
      auditLogs.push(...logs)
    } catch (error) {
      // Table doesn't exist yet or error occurred, continue without audit logs
      console.warn('Could not fetch audit logs:', error)
    }

    return NextResponse.json({ ...order, auditLogs })
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
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminId = session.user?.id as string | undefined
    const { orderId } = await params
    const body = await request.json()
    const { status, trackingNumber, trackingUrl, notes, overrideReason } = body

    console.log(`[PATCH-ORDER-V2] NEW VERSION - Received: orderId=${orderId}, status="${status}"`)
    console.log(`[PATCH-ORDER] Received: orderId=${orderId}, status="${status}" (type: ${typeof status}, empty: ${!status}), hasNotes=${!!notes}, adminId=${adminId}`)

    // Validate status if provided - all statuses that exist in the database
    // Note: Frontend shows simplified names (PENDING, PAID, etc.) but database has full names
    const validStatuses = [
      // Checkout/Payment statuses
      'PENDING_PAYMENT', 'PAYMENT_FAILED',
      // Core statuses
      'AWAITING_SELLER_CONFIRMATION', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED',
      // Return/Refund statuses
      'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_SHIPPED', 'RETURN_RECEIVED',
      // Terminal statuses
      'CANCELLED', 'REFUNDED', 'DISPUTED'
    ]
    if (status && !validStatuses.includes(status)) {
      console.error('Invalid status attempted:', status, 'Valid statuses:', validStatuses)
      return NextResponse.json({ error: `Invalid status: ${status}. Valid options: ${validStatuses.join(', ')}` }, { status: 400 })
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

    console.log(`Updating order ${orderId}. Current status: "${existingOrder.status}", New status: "${status}", adminId: ${adminId}`)

    // Ensure we have valid status values
    if (!existingOrder.status) {
      console.error(`Order ${orderId} has no status value. Cannot update.`)
      return NextResponse.json({ error: 'Order has invalid status. Contact support.' }, { status: 400 })
    }

    // Check if status change is being made
    const isStatusChange = status && status !== existingOrder.status
    
    // Validate status transitions - certain changes require override reason
    if (isStatusChange) {
      const needsOverride = requiresOverrideReason(existingOrder.status as BoutiqueOrderStatus, status as BoutiqueOrderStatus)

      console.log(`Status change check: ${existingOrder.status} → ${status}, needsOverride=${needsOverride}, overrideReason="${overrideReason}"`)

      // If transition requires override reason, validate it
      if (needsOverride) {
        const reasonLength = overrideReason?.trim().length || 0
        if (!overrideReason || reasonLength < 10) {
          console.warn(`Status change blocked: ${existingOrder.status} → ${status}, override reason too short (${reasonLength} chars, need 10+)`)
          return NextResponse.json(
            { error: 'Override reason required for this status change (minimum 10 characters)', requiresReason: true },
            { status: 400 }
          )
        }
      }
    }

    // Build update data with status-specific timestamps
    const updateData: Record<string, unknown> = {}
    const changedFields: Record<string, unknown> = {}

    if (status) {
      updateData.status = status
      // Note: Don't add status to changedFields - it's tracked separately as oldStatus/newStatus in audit log
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
      if (status === 'REFUNDED' && !existingOrder.refundedAt) {
        updateData.refundedAt = new Date()
      }
    }
    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber
      changedFields.trackingNumber = trackingNumber
    }
    if (trackingUrl !== undefined) {
      updateData.trackingUrl = trackingUrl
      changedFields.trackingUrl = trackingUrl
    }
    if (notes !== undefined) {
      updateData.adminNotes = notes
      changedFields.adminNotes = notes
    }

    console.log(`[PATCH-ORDER] UpdateData keys: ${Object.keys(updateData).join(',')}, Values:`, updateData)

    const order = await prisma.boutiqueOrder.update({
      where: { id: orderId },
      data: updateData,
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
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

    console.log(`[PATCH-ORDER-UPDATED] Order ${orderId} updated successfully. New status: "${order.status}", Old status: "${existingOrder.status}", Updated fields: ${Object.keys(updateData).join(',')}`)

    // Handle stock restoration if order is being cancelled
    if (status === 'CANCELLED' && existingOrder.status !== 'CANCELLED') {
      const productsToCheck = new Set<string>();
      
      for (const item of order.items) {
        if (item.variantId) {
          // Restore stock to variant
          await prisma.boutiqueProductVariant.update({
            where: { id: item.variantId },
            data: { quantity: { increment: item.quantity } },
          });
        }
        if (item.productId) {
          productsToCheck.add(item.productId);
        }
      }
      
      // Check if any OUT_OF_STOCK products now have stock and restore them to LIVE
      for (const productId of productsToCheck) {
        const variants = await prisma.boutiqueProductVariant.findMany({
          where: { productId },
          select: { quantity: true },
        });
        const totalStock = variants.reduce((sum, v) => sum + v.quantity, 0);
        
        const product = await prisma.boutiqueProduct.findUnique({
          where: { id: productId },
          select: { status: true },
        });
        
        // If product is OUT_OF_STOCK and now has stock, restore to LIVE
        if (product?.status === 'OUT_OF_STOCK' && totalStock > 0) {
          await prisma.boutiqueProduct.update({
            where: { id: productId },
            data: { 
              status: 'LIVE',
              currentStock: totalStock,
            },
          });
          console.log(`[Admin Cancel] Product ${productId} restored to LIVE status (stock: ${totalStock})`);
        } else {
          // Sync currentStock field
          await prisma.boutiqueProduct.update({
            where: { id: productId },
            data: { currentStock: totalStock },
          });
        }
      }
    }
    const orderUrl = `${process.env.NEXTAUTH_URL}/boutique/orders/${order.id}`

    // Create audit log for this change
    // Always create audit log if there's a status change or other field updates
    const hasStatusChange = status && status !== existingOrder.status
    const hasOtherChanges = Object.keys(changedFields).length > 0
    const hasChanges = hasStatusChange || hasOtherChanges
    
    console.log(`[AUDIT-CHECK] hasStatusChange=${hasStatusChange}, hasOtherChanges=${hasOtherChanges}, hasChanges=${hasChanges}`)
    console.log(`[AUDIT-CHECK] status param="${status}", existingOrder.status="${existingOrder.status}", order.status="${order.status}"`)
    console.log(`[AUDIT-CHECK] updateData keys:`, Object.keys(updateData))
    console.log(`[AUDIT-CHECK] changedFields:`, changedFields)
    
    if (hasChanges) {
      const isManualStatusOverride = !!(status && status !== existingOrder.status && overrideReason)
      
      // Use the updated order status (what was actually applied), not the request status
      const auditNewStatus = order.status
      
      console.log(`[AUDIT-LOG-CREATE] Creating audit log - hasChanges=true`)
      console.log(`  - orderId: ${orderId}`)
      console.log(`  - oldStatus: ${existingOrder.status}`)
      console.log(`  - newStatus: ${auditNewStatus}`)
      console.log(`  - action: ${status ? 'STATUS_CHANGE' : 'NOTES_UPDATE'}`)
      console.log(`  - adminId: ${adminId}`)
      console.log(`  - changedFields:`, changedFields)
      
      try {
        console.log(`[AUDIT-LOG-DATA] About to create audit log`)
        console.log(`[AUDIT-LOG-DATA] orderId: "${orderId}" (${typeof orderId})`)
        console.log(`[AUDIT-LOG-DATA] adminId: "${adminId}" (${typeof adminId})`)
        console.log(`[AUDIT-LOG-DATA] isManualOverride: ${isManualStatusOverride}`)
        
        const auditLogEntry = await prisma.boutiqueOrderAuditLog.create({
          data: {
            order: { connect: { id: orderId } },
            action: status ? 'STATUS_CHANGE' : 'NOTES_UPDATE',
            oldStatus: existingOrder.status,
            newStatus: auditNewStatus || undefined,
            changedFields: hasOtherChanges ? (changedFields as Prisma.InputJsonValue) : null,
            isManualOverride: isManualStatusOverride,
            overrideReason: overrideReason || undefined,
            triggerType: 'ADMIN',
            admin: adminId ? { connect: { id: adminId } } : undefined,
          },
        })
        console.log(`[AUDIT-SUCCESS] Audit log created with ID: ${auditLogEntry.id}`)
      } catch (auditError) {
        console.error('[AUDIT-FAILED] Audit log creation failed!')
        console.error('[AUDIT-ERROR-MESSAGE]', auditError instanceof Error ? auditError.message : String(auditError))
        if (auditError instanceof Error && auditError.stack) {
          console.error('[AUDIT-ERROR-STACK]', auditError.stack.split('\n').slice(0, 5).join('\n'))
        }
        // Don't throw - continue even if audit log fails
      }
    } else {
      console.log(`[AUDIT-SKIPPED] No changes detected - not creating audit log`)
      console.log(`  - status param: "${status}"`)
      console.log(`  - existingOrder.status: "${existingOrder.status}"`)
      console.log(`  - changedFields keys: ${Object.keys(changedFields).join(',')}`)
    }

    // Send notification emails based on status change
    if (status && status !== existingOrder.status) {
      const productTitle = order.items?.[0]?.product?.title || 'Your Product'
      
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

    // Fetch audit logs to include in response (so frontend doesn't need separate call)
    const auditLogs: any[] = []
    try {
      const logs = await prisma.boutiqueOrderAuditLog.findMany({
        where: { orderId },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      auditLogs.push(...logs)
      console.log(`[PATCH-RESPONSE] Fetched ${auditLogs.length} audit logs for order ${orderId}`)
      if (auditLogs.length > 0) {
        console.log(`[PATCH-RESPONSE] Latest audit log:`, {
          id: auditLogs[0].id,
          action: auditLogs[0].action,
          oldStatus: auditLogs[0].oldStatus,
          newStatus: auditLogs[0].newStatus,
          createdAt: auditLogs[0].createdAt,
        })
      }
    } catch (error) {
      console.warn('[PATCH-RESPONSE-ERROR] Could not fetch audit logs in PATCH response:', error)
    }

    return NextResponse.json({ ...order, auditLogs })
  } catch (error) {
    console.error('Admin order update error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
