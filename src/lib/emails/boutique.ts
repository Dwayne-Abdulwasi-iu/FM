/**
 * Boutique email templates and sending functions
 * These emails are triggered by warehouse operations
 */

import { sendEmail } from '../email';

const DASHBOARD_URL = process.env.NEXTAUTH_URL || 'https://fashionmarketplace.example.com';

/**
 * Send storage option confirmation email to seller
 */
export async function sendStorageOptionConfirmationEmail(
  sellerEmail: string,
  productName: string,
  option: string
): Promise<boolean> {
  const storageText = option === 'return' ? 'Return to Seller' : 'Liquidation';
  
  return sendEmail({
    to: sellerEmail,
    subject: `Storage Option Confirmation: ${productName}`,
    html: `
      <h2>Storage Option Selected</h2>
      <p>Hello,</p>
      <p>You have selected a storage option for your product <strong>${productName}</strong>.</p>
      
      <h3>Storage Option</h3>
      <p><strong>${storageText}</strong></p>
      
      ${option === 'return' ? `
        <p>Your product will be returned to you once the warehouse holding period expires. Please ensure you have a valid return address on file.</p>
      ` : `
        <p>Your product will be liquidated at the end of the storage period. You will receive compensation based on the liquidation proceeds.</p>
      `}
      
      <p>
        <a href="${DASHBOARD_URL}/seller/boutique/products" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
          View Product
        </a>
      </p>
      
      <p>If you have any questions, please contact our support team.</p>
    `,
  });
}

/**
 * Notify seller when liquidation begins
 */
export async function sendLiquidationStartedEmail(
  sellerEmail: string,
  productName: string,
  totalUnits: number
): Promise<boolean> {
  return sendEmail({
    to: sellerEmail,
    subject: `Liquidation Started: ${productName}`,
    html: `
      <h2>Liquidation Process Started</h2>
      <p>Hello,</p>
      <p>The liquidation process has begun for your product <strong>${productName}</strong>.</p>
      
      <h3>Liquidation Details</h3>
      <ul>
        <li><strong>Product:</strong> ${productName}</li>
        <li><strong>Units:</strong> ${totalUnits}</li>
        <li><strong>Status:</strong> Liquidation in progress</li>
      </ul>
      
      <p>We will update you regularly on the liquidation progress and final settlement amount. You can check the status anytime from your dashboard.</p>
      
      <p>
        <a href="${DASHBOARD_URL}/seller/boutique/products" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
          View Details
        </a>
      </p>
    `,
  });
}

/**
 * Notify seller when return processing starts
 */
export async function sendReturnProcessingEmail(
  sellerEmail: string,
  productName: string,
  shipmentId: string
): Promise<boolean> {
  return sendEmail({
    to: sellerEmail,
    subject: `Return Processing Started: ${productName}`,
    html: `
      <h2>Return Processing Initiated</h2>
      <p>Hello,</p>
      <p>Your product <strong>${productName}</strong> is being prepared for return.</p>
      
      <h3>Shipment Information</h3>
      <ul>
        <li><strong>Product:</strong> ${productName}</li>
        <li><strong>Shipment ID:</strong> ${shipmentId}</li>
        <li><strong>Status:</strong> Return processing</li>
      </ul>
      
      <p>We will prepare your product for shipment and notify you with tracking information once it's shipped.</p>
      
      <p>
        <a href="${DASHBOARD_URL}/seller/boutique/shipments" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
          Track Shipment
        </a>
      </p>
    `,
  });
}

/**
 * Send warehouse storage deadline warning to seller
 */
export async function sendWarehouseWarningEmail(
  sellerEmail: string,
  productName: string,
  daysRemaining: number
): Promise<boolean> {
  return sendEmail({
    to: sellerEmail,
    subject: `Warehouse Storage Deadline Warning: ${productName}`,
    html: `
      <h2>Warehouse Storage Deadline Approaching</h2>
      <p>Hello,</p>
      <p>Your product <strong>${productName}</strong> is approaching its warehouse storage deadline.</p>
      
      <h3>Deadline Information</h3>
      <ul>
        <li><strong>Product:</strong> ${productName}</li>
        <li><strong>Days Remaining:</strong> <strong>${daysRemaining} days</strong></li>
      </ul>
      
      <p>Please take action to select your storage option (return or liquidation) before the deadline expires.</p>
      
      <p>
        <a href="${DASHBOARD_URL}/seller/boutique/products" style="display: inline-block; padding: 12px 24px; background-color: #FF6B6B; color: white; text-decoration: none; border-radius: 8px;">
          Select Storage Option Now
        </a>
      </p>
      
      <p>If the deadline passes without action, the product may be liquidated automatically.</p>
    `,
  });
}
