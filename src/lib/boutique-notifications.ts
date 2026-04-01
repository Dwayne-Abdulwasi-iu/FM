/**
 * Boutique Product Notifications
 * Handles both email and in-app notifications for boutique product events
 */

import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export const BOUTIQUE_NOTIFICATION_TYPES = {
  CONTENT_APPROVED: 'BOUTIQUE_CONTENT_APPROVED',
  CONTENT_REJECTED: 'BOUTIQUE_CONTENT_REJECTED',
  SHIPMENT_RECEIVED: 'BOUTIQUE_SHIPMENT_RECEIVED',
  VERIFICATION_PASSED: 'BOUTIQUE_VERIFICATION_PASSED',
  VERIFICATION_FAILED: 'BOUTIQUE_VERIFICATION_FAILED',
  PRODUCT_LIVE: 'BOUTIQUE_PRODUCT_LIVE',
  PRODUCT_CANCELLED: 'BOUTIQUE_PRODUCT_CANCELLED',
  STATUS_CHANGED: 'BOUTIQUE_STATUS_CHANGED',
} as const

// Status transition descriptions for user-friendly messaging
export const STATUS_DESCRIPTIONS: Record<string, { emoji: string; label: string; description: string }> = {
  DRAFT: {
    emoji: '📝',
    label: 'Draft',
    description: 'Product is being created'
  },
  PENDING_CONTENT_REVIEW: {
    emoji: '👀',
    label: 'Awaiting Content Review',
    description: 'Admin is reviewing your images and videos'
  },
  CONTENT_APPROVED: {
    emoji: '✅',
    label: 'Content Approved',
    description: 'Content approved! Please ship the product to our warehouse'
  },
  SHIPPED_TO_ADMIN: {
    emoji: '📦',
    label: 'Shipped to Warehouse',
    description: 'Your shipment is on the way to our warehouse'
  },
  RECEIVED_BY_ADMIN: {
    emoji: '🏢',
    label: 'Received by Warehouse',
    description: 'Your product has arrived at our warehouse'
  },
  VERIFICATION_PASSED: {
    emoji: '🎉',
    label: 'Verification Passed',
    description: 'Your product passed physical verification'
  },
  LIVE: {
    emoji: '🚀',
    label: 'Live on Marketplace',
    description: 'Your product is now live and available for purchase!'
  },
  OUT_OF_STOCK: {
    emoji: '😔',
    label: 'Out of Stock',
    description: 'All units have been sold'
  },
  REJECTED: {
    emoji: '❌',
    label: 'Rejected',
    description: 'Admin rejected your product'
  },
  CANCELLED: {
    emoji: '⏱️',
    label: 'Cancelled',
    description: 'Your shipment did not arrive within the deadline'
  },
  RETURNED_TO_SELLER: {
    emoji: '↩️',
    label: 'Returned',
    description: 'Product returned to your address'
  },
}

/**
 * Send email notification to seller
 */
async function sendSellerEmail(
  email: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const result = await sendEmail({
      to: email,
      subject,
      html,
    })
    return !!result
  } catch (error) {
    console.error('Failed to send boutique notification email:', error)
    return false
  }
}

/**
 * Create in-app notification for seller
 */
async function createPlatformNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data ? JSON.parse(JSON.stringify(data)) : {},
      },
    })
    return true
  } catch (error) {
    console.error('Failed to create platform notification:', error)
    return false
  }
}

/**
 * Notify seller that content has been approved and awaiting shipment
 */
export async function notifyContentApproved(
  productId: string,
  productTitle: string,
  sellerEmail: string,
  sellerName: string,
  sellerId: string
): Promise<{ emailSent: boolean; notificationCreated: boolean }> {
  const emailSubject = `Your boutique product "${productTitle}" has been approved!`
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Great News! Content Approved</h2>
      <p>Hi <strong>${sellerName}</strong>,</p>
      
      <p>Your boutique product <strong>"${productTitle}"</strong> has passed our content review!</p>
      
      <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Next Steps:</h3>
        <ol style="color: #666;">
          <li><strong>Ship the product to our warehouse within 7 days</strong></li>
          <li>Include the tracking information in your seller dashboard</li>
          <li>Once received and verified, your product will go live on the marketplace</li>
        </ol>
      </div>
      
      <p style="color: #666;">
        <strong>Shipping Address:</strong><br>
        [Warehouse Address will be provided separately]
      </p>
      
      <p style="margin-top: 30px;">
        <a href="${process.env.NEXTAUTH_URL || 'https://fashionmarketplace.store'}/seller/boutique" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Your Products
        </a>
      </p>
      
      <p style="color: #999; font-size: 12px; margin-top: 40px;">
        If you have any questions, please contact our support team.
      </p>
    </div>
  `

  const notificationTitle = 'Content Approved - Action Required'
  const notificationMessage = `Your product "${productTitle}" is approved. Ship it within 7 days to complete the process.`

  const [emailSent, notificationCreated] = await Promise.all([
    sendSellerEmail(sellerEmail, emailSubject, emailHtml),
    createPlatformNotification(
      sellerId,
      BOUTIQUE_NOTIFICATION_TYPES.CONTENT_APPROVED,
      notificationTitle,
      notificationMessage,
      {
        productId,
        productTitle,
        action: 'SHIP_PRODUCT',
        deadlineText: 'Ship within 7 days',
      }
    ),
  ])

  return { emailSent, notificationCreated }
}

/**
 * Notify seller that content has been rejected
 */
export async function notifyContentRejected(
  productId: string,
  productTitle: string,
  sellerEmail: string,
  sellerName: string,
  sellerId: string,
  rejectionReason: string,
  rejectionNotes?: string
): Promise<{ emailSent: boolean; notificationCreated: boolean }> {
  const emailSubject = `Action Needed: Your product "${productTitle}" needs revision`
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d9534f;">Content Review: Revision Needed</h2>
      <p>Hi <strong>${sellerName}</strong>,</p>
      
      <p>Unfortunately, your boutique product <strong>"${productTitle}"</strong> did not pass our content review. Please address the following issues and resubmit:</p>
      
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <strong style="color: #333;">Rejection Reason:</strong>
        <p style="color: #333; margin: 10px 0;">${rejectionReason}</p>
        ${rejectionNotes ? `<p style="color: #666; font-size: 14px; margin: 10px 0;"><strong>Additional Notes:</strong> ${rejectionNotes}</p>` : ''}
      </div>
      
      <p style="color: #666;">
        Please make the necessary changes and resubmit your product for review. You can upload revised images or update the product details directly in your dashboard.
      </p>
      
      <p style="margin-top: 30px;">
        <a href="${process.env.NEXTAUTH_URL || 'https://fashionmarketplace.store'}/seller/boutique" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Edit Product
        </a>
      </p>
      
      <p style="color: #999; font-size: 12px; margin-top: 40px;">
        If you have questions about the feedback, please contact our support team.
      </p>
    </div>
  `

  const notificationTitle = 'Content Review: Revision Needed'
  const notificationMessage = `Your product "${productTitle}" needs revision. Reason: ${rejectionReason}`

  const [emailSent, notificationCreated] = await Promise.all([
    sendSellerEmail(sellerEmail, emailSubject, emailHtml),
    createPlatformNotification(
      sellerId,
      BOUTIQUE_NOTIFICATION_TYPES.CONTENT_REJECTED,
      notificationTitle,
      notificationMessage,
      {
        productId,
        productTitle,
        reason: rejectionReason,
        notes: rejectionNotes,
        action: 'EDIT_PRODUCT',
      }
    ),
  ])

  return { emailSent, notificationCreated }
}

/**
 * Get pending actions count for seller dashboard badge
 * Returns count of products awaiting seller action
 */
export async function getPendingActionsCount(sellerId: string): Promise<number> {
  try {
    // Count products that need seller action:
    // 1. CONTENT_APPROVED - awaiting shipment
    // 2. REJECTED - awaiting revision/resubmission
    const count = await prisma.boutiqueProduct.count({
      where: {
        sellerId,
        status: {
          in: ['CONTENT_APPROVED', 'REJECTED'],
        },
      },
    })
    return count
  } catch (error) {
    console.error('Failed to get pending actions count:', error)
    return 0
  }
}

/**
 * Get list of products awaiting seller action
 */
export async function getPendingActions(
  sellerId: string,
  limit: number = 5
): Promise<Array<{
  id: string
  title: string
  status: string
  action: string
  deadline?: string
}>> {
  try {
    const products = await prisma.boutiqueProduct.findMany({
      where: {
        sellerId,
        status: {
          in: ['CONTENT_APPROVED', 'REJECTED'],
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        contentReviewedAt: true,
        rejectionReason: true,
      },
      orderBy: { contentReviewedAt: 'desc' },
      take: limit,
    })

    return products.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      action:
        p.status === 'CONTENT_APPROVED'
          ? 'SHIP_PRODUCT'
          : 'EDIT_PRODUCT',
      deadline:
        p.status === 'CONTENT_APPROVED' && p.contentReviewedAt
          ? new Date(
              p.contentReviewedAt.getTime() + 7 * 24 * 60 * 60 * 1000
            ).toISOString()
          : undefined,
    }))
  } catch (error) {
    console.error('Failed to get pending actions:', error)
    return []
  }
}

/**
 * Comprehensive product status change notification
 * Handles all status transitions with appropriate email and platform notifications
 */
export async function notifyProductStatusChange(
  productId: string,
  productTitle: string,
  sellerEmail: string,
  sellerName: string,
  sellerId: string,
  oldStatus: string,
  newStatus: string,
  metadata?: Record<string, unknown>
): Promise<{ emailSent: boolean; notificationCreated: boolean }> {
  const statusInfo = STATUS_DESCRIPTIONS[newStatus] || STATUS_DESCRIPTIONS.DRAFT
  
  let notificationType: string = BOUTIQUE_NOTIFICATION_TYPES.STATUS_CHANGED
  
  // Generate status-specific email and notification content
  let emailSubject = ''
  let emailHtml = ''
  let notificationTitle = ''
  let notificationMessage = ''

  switch (newStatus) {
    case 'PENDING_CONTENT_REVIEW':
      emailSubject = `Your product "${productTitle}" is under review`
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">📋 Content Review In Progress</h2>
          <p>Hi <strong>${sellerName}</strong>,</p>
          <p>Your product <strong>"${productTitle}"</strong> has been submitted for content review.</p>
          <p style="color: #666;">Our team will review your images and videos to ensure quality standards. This typically takes 24-48 hours.</p>
          <p>We'll notify you as soon as the review is complete!</p>
        </div>
      `
      notificationTitle = `${statusInfo.emoji} Content Review Started`
      notificationMessage = `Your product is under review. We'll notify you of the result within 24-48 hours.`
      break

    case 'SHIPPED_TO_ADMIN':
      emailSubject = `Shipment received: ${productTitle}`
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">📦 Shipment Tracking</h2>
          <p>Hi <strong>${sellerName}</strong>,</p>
          <p>Thank you for shipping your product to our warehouse!</p>
          <p>Once we receive and verify your shipment, we'll notify you and your product will be ready to go live.</p>
          <p style="color: #666; font-size: 14px;">Tracking: ${metadata?.trackingNumber || 'Not provided'}</p>
        </div>
      `
      notificationTitle = `${statusInfo.emoji} Shipment Sent`
      notificationMessage = 'Your product is on its way to our warehouse.'
      break

    case 'RECEIVED_BY_ADMIN':
      emailSubject = `Your product arrived at our warehouse!`
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">🏢 Warehouse Received</h2>
          <p>Hi <strong>${sellerName}</strong>,</p>
          <p>Great news! We've received your shipment of <strong>"${productTitle}"</strong> at our warehouse.</p>
          <p style="color: #666;">Our team will now inspect and verify the items. This usually takes 1-2 business days.</p>
        </div>
      `
      notificationTitle = `${statusInfo.emoji} Product Received`
      notificationMessage = 'Your product has been received at our warehouse and is being inspected.'
      notificationType = BOUTIQUE_NOTIFICATION_TYPES.SHIPMENT_RECEIVED
      break

    case 'VERIFICATION_PASSED':
      emailSubject = `Verification passed! ${productTitle} is ready`
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #27ae60;">✅ Verification Passed</h2>
          <p>Hi <strong>${sellerName}</strong>,</p>
          <p>Excellent! Your product <strong>"${productTitle}"</strong> has passed our physical verification.</p>
          <p style="color: #27ae60; font-weight: bold;">Your product will go live on the marketplace shortly!</p>
        </div>
      `
      notificationTitle = `${statusInfo.emoji} Ready for Launch`
      notificationMessage = `Your product is verified and ready! It will be live on the marketplace soon.`
      notificationType = BOUTIQUE_NOTIFICATION_TYPES.VERIFICATION_PASSED
      break

    case 'LIVE':
      emailSubject = `🚀 Your product is LIVE: ${productTitle}`
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #27ae60;">🚀 Product Live!</h2>
          <p>Hi <strong>${sellerName}</strong>,</p>
          <p style="font-size: 18px; font-weight: bold; color: #27ae60;">Your product <strong>"${productTitle}"</strong> is now live on the marketplace!</p>
          <p style="color: #666;">Buyers can now see and purchase your product. Check your dashboard to monitor sales and inventory.</p>
          <p>
            <a href="${process.env.NEXTAUTH_URL || 'https://fashionmarketplace.store'}/seller/boutique" style="display: inline-block; background-color: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Your Product
            </a>
          </p>
        </div>
      `
      notificationTitle = `${statusInfo.emoji} Product Live!`
      notificationMessage = `🎉 Your product is now live and available for purchase!`
      notificationType = BOUTIQUE_NOTIFICATION_TYPES.PRODUCT_LIVE
      break

    case 'OUT_OF_STOCK':
      emailSubject = `${productTitle} is out of stock`
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">📊 Out of Stock</h2>
          <p>Hi <strong>${sellerName}</strong>,</p>
          <p>Great news! All units of <strong>"${productTitle}"</strong> have been sold out.</p>
          <p style="color: #666;">You can add more inventory or upload new products to continue selling.</p>
        </div>
      `
      notificationTitle = `${statusInfo.emoji} Sold Out`
      notificationMessage = 'Congratulations! All units of your product have been sold.'
      break

    case 'REJECTED':
      emailSubject = `⚠️ Your product was rejected: ${productTitle}`
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d9534f;">❌ Product Rejected</h2>
          <p>Hi <strong>${sellerName}</strong>,</p>
          <p>Unfortunately, your product <strong>"${productTitle}"</strong> did not pass our verification.</p>
          <p style="background-color: #ffe6e6; padding: 10px; border-left: 4px solid #d9534f; color: #333;">
            <strong>Reason:</strong> ${metadata?.rejectionReason || 'Quality issues detected'}
          </p>
          <p>You can edit and resubmit your product for another review.</p>
        </div>
      `
      notificationTitle = `${statusInfo.emoji} Product Rejected`
      notificationMessage = `Your product needs revision: ${metadata?.rejectionReason || 'Quality issues detected'}`
      notificationType = BOUTIQUE_NOTIFICATION_TYPES.VERIFICATION_FAILED
      break

    case 'CANCELLED':
      emailSubject = `⏱️ Your product listing was cancelled: ${productTitle}`
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d9534f;">⏱️ Listing Cancelled</h2>
          <p>Hi <strong>${sellerName}</strong>,</p>
          <p>Your product <strong>"${productTitle}"</strong> was cancelled because the shipment deadline passed.</p>
          <p style="color: #666;">You can resubmit this product anytime.</p>
        </div>
      `
      notificationTitle = `${statusInfo.emoji} Listing Cancelled`
      notificationMessage = 'Your product was cancelled due to shipment deadline.'
      notificationType = BOUTIQUE_NOTIFICATION_TYPES.PRODUCT_CANCELLED
      break

    case 'RETURNED_TO_SELLER':
      emailSubject = `Your product is being returned: ${productTitle}`
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">↩️ Product Returned</h2>
          <p>Hi <strong>${sellerName}</strong>,</p>
          <p>Your product <strong>"${productTitle}"</strong> is being returned to you.</p>
          <p style="color: #666;">Check your dashboard for shipping details.</p>
        </div>
      `
      notificationTitle = `${statusInfo.emoji} Product Returned`
      notificationMessage = 'Your product is being returned to you.'
      break

    default:
      // Generic status change
      emailSubject = `Your product status updated: ${productTitle}`
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${statusInfo.emoji} Status Update</h2>
          <p>Hi <strong>${sellerName}</strong>,</p>
          <p>Your product <strong>"${productTitle}"</strong> status has been updated to <strong>${statusInfo.label}</strong>.</p>
        </div>
      `
      notificationTitle = `${statusInfo.emoji} ${statusInfo.label}`
      notificationMessage = statusInfo.description
  }

  // Send email and notification in parallel
  const [emailSent, notificationCreated] = await Promise.all([
    sendSellerEmail(sellerEmail, emailSubject, emailHtml),
    createPlatformNotification(
      sellerId,
      notificationType,
      notificationTitle,
      notificationMessage,
      {
        productId,
        productTitle,
        oldStatus,
        newStatus,
        ...metadata,
      }
    ),
  ])

  return { emailSent, notificationCreated }
}
