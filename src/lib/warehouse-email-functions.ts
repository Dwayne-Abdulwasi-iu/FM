import { sendEmail } from '@/lib/email'

/**
 * Send warehouse return rejection notification to seller
 * Called by admin when rejecting a pending return request
 */
export async function sendWarehouseReturnRejectedNotification(data: {
  sellerName: string;
  sellerEmail: string;
  productTitle: string;
  productId: string;
  reason?: string;
}): Promise<boolean> {
  const dashboardUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/seller/boutique/warehouse-inventory`;

  return sendEmail({
    to: data.sellerEmail,
    subject: `Warehouse Return Request Rejected - ${data.productTitle}`,
    text: `Your warehouse return request for "${data.productTitle}" has been rejected.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #DC2626; margin-top: 0;">⚠️ Return Request Rejected</h2>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hi <strong>${data.sellerName}</strong>,
          </p>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Your warehouse return request for <strong>"${data.productTitle}"</strong> has been reviewed and rejected.
          </p>
          
          <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #7F1D1D; font-weight: bold;">What This Means:</p>
            <ul style="color: #7F1D1D; margin: 10px 0 0 0; padding-left: 20px;">
              <li>Your product <strong>remains in the warehouse</strong></li>
              <li>No fee has been charged</li>
              <li>Your product continues its standard storage cycle</li>
            </ul>
          </div>
          
          ${data.reason ? `
            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400E; font-weight: bold;">Reason for Rejection:</p>
              <p style="color: #92400E; margin: 8px 0 0 0;">${data.reason}</p>
            </div>
          ` : ''}
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            You can always submit another return request in the future. 
            If you believe this was a mistake or have questions, please contact support.
          </p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              View Inventory
            </a>
          </div>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
            This is an automated notification from Fashion Marketplace
          </p>
        </div>
      </div>
    `,
  });
}

/**
 * Send variant discrepancy verification notification to seller
 * Called by admin when marking variant acceptance status (ACCEPTED, RETURNING, PARTIAL)
 */
export async function sendVariantDiscrepancyNotification(data: {
  sellerName: string;
  sellerEmail: string;
  productTitle: string;
  variantDetails: string; // e.g., "Red Polo, Size L"
  quantityExpected: number;
  quantityReceived: number;
  quantityDamaged: number;
  acceptanceStatus: 'ACCEPTED' | 'RETURNING' | 'PARTIAL';
  unitsAccepted?: number;
  unitsReturning?: number;
  condition?: string; // e.g., "DAMAGED", "EXCELLENT"
  reason?: string; // Why items were rejected
}): Promise<boolean> {
  const dashboardUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/seller/boutique/warehouse-inventory`;

  let statusColor = '#4F46E5'; // Default purple
  let statusEmoji = '⏳';
  let statusMessage = '';
  let actionSummary = '';

  if (data.acceptanceStatus === 'ACCEPTED') {
    statusColor = '#059669'; // Green
    statusEmoji = '✅';
    statusMessage = `All ${data.quantityReceived} units have been accepted and approved for the marketplace.`;
    actionSummary = `<p style="color: #065F46; margin: 10px 0 0 0;"><strong>${data.quantityReceived} units</strong> approved for marketplace launch</p>`;
  } else if (data.acceptanceStatus === 'RETURNING') {
    statusColor = '#DC2626'; // Red
    statusEmoji = '↩️';
    const unitsBeingReturned = Math.max(0, (data.quantityExpected || data.quantityReceived) - 1);
    statusMessage = `All units are being returned to you. Note: ${unitsBeingReturned} units will be returned (one unit retained for verification).`;
    actionSummary = `<p style="color: #7F1D1D; margin: 10px 0 0 0;"><strong>${unitsBeingReturned} units</strong> will be returned within 5 business days (1 retained for verification)</p>`;
  } else if (data.acceptanceStatus === 'PARTIAL') {
    statusColor = '#F59E0B'; // Amber
    statusEmoji = '⚠️';
    const totalReturning = data.unitsReturning || 0;
    const actualReturned = Math.max(0, totalReturning - 1);
    statusMessage = `${data.unitsAccepted} units accepted for marketplace, ${actualReturned} units will be returned (1 retained for verification).`;
    actionSummary = `
      <p style="color: #92400E; margin: 10px 0 0 0;"><strong>${data.unitsAccepted} units</strong> approved for marketplace ✅</p>
      <p style="color: #92400E; margin: 5px 0 0 0;"><strong>${actualReturned} units</strong> will be returned ↩️ (1 retained for verification)</p>
    `;
  }

  return sendEmail({
    to: data.sellerEmail,
    subject: `${statusEmoji} Quality Verification Complete - ${data.productTitle}`,
    text: statusMessage,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: ${statusColor}; margin-top: 0;">${statusEmoji} Quality Verification Complete</h2>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hi <strong>${data.sellerName}</strong>,
          </p>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Your shipment for <strong>"${data.productTitle}"</strong> has been received and quality verified by our warehouse team.
          </p>
          
          <div style="background-color: #f3f4f6; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; color: #1f2937; font-weight: bold;">📦 Shipment Details:</p>
            <p style="color: #374151; margin: 5px 0;"><strong>Variant:</strong> ${data.variantDetails}</p>
            <p style="color: #374151; margin: 5px 0;"><strong>Expected Quantity:</strong> ${data.quantityExpected} units</p>
            <p style="color: #374151; margin: 5px 0;"><strong>Received:</strong> ${data.quantityReceived} units</p>
            ${data.quantityDamaged > 0 ? `<p style="color: #DC2626; margin: 5px 0;"><strong>Damaged:</strong> ${data.quantityDamaged} units</p>` : ''}
            ${data.condition ? `<p style="color: #374151; margin: 5px 0;"><strong>Condition:</strong> ${data.condition}</p>` : ''}
          </div>
          
          <div style="background-color: ${statusColor === '#059669' ? '#D1FAE5' : statusColor === '#DC2626' ? '#FEE2E2' : '#FEF3C7'}; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; color: ${statusColor === '#059669' ? '#065F46' : statusColor === '#DC2626' ? '#7F1D1D' : '#92400E'}; font-weight: bold;">🔍 Verification Result:</p>
            ${actionSummary}
          </div>
          
          ${data.reason ? `
            <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #7F1D1D; font-weight: bold;">Reason for Rejection:</p>
              <p style="color: #7F1D1D; margin: 8px 0 0 0;">${data.reason}</p>
            </div>          ` : ''}
          
          ${(data.acceptanceStatus === 'RETURNING' || data.acceptanceStatus === 'PARTIAL') ? `
            <div style="background-color: #F3E8FF; border-left: 4px solid #A855F7; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #581C87; font-weight: bold;">📌 Important: Return Policy Detail</p>
              <p style="color: #581C87; margin: 8px 0 0 0;">
                ${data.acceptanceStatus === 'RETURNING' 
                  ? `<strong>${Math.max(0, (data.quantityExpected || data.quantityReceived) - 1)} units will be returned to you</strong> (1 unit retained by warehouse for quality verification records). This ensures we maintain accurate records of the discrepancy.` 
                  : `<strong>${Math.max(0, (data.unitsReturning || 0) - 1)} of the rejected units will be returned to you</strong> (1 unit retained by warehouse for quality verification records). This ensures we maintain accurate records of the discrepancy.`}
              </p>
            </div>          ` : ''}
          
          <div style="background-color: #DBEAFE; border-left: 4px solid #0284C7; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #0C4A6E; font-weight: bold;">What Happens Next:</p>
            <ul style="color: #0C4A6E; margin: 10px 0 0 0; padding-left: 20px;">
              ${data.acceptanceStatus === 'ACCEPTED' ? `
                <li>Your product will be listed on the marketplace shortly</li>
                <li>All ${data.quantityReceived} units are now available for purchase</li>
                <li>You'll earn commissions on all sales</li>
              ` : data.acceptanceStatus === 'RETURNING' ? `
                <li>A return shipment will be scheduled within 5 business days</li>
                <li><strong>${Math.max(0, (data.quantityExpected || data.quantityReceived) - 1)} units will be returned</strong> - one unit is retained for verification records</li>
                <li>You'll receive tracking information via email</li>
                <li>Please arrange for pickup or provide return address</li>
              ` : `
                <li>${data.unitsAccepted} units will be live on the marketplace</li>
                <li><strong>${Math.max(0, (data.unitsReturning || 0) - 1)} units will be returned</strong> - one unit is retained for verification records</li>
                <li>Return shipments will begin within 5 business days</li>
                <li>You'll receive separate tracking for the return shipment</li>
              `}
            </ul>
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 28px; background-color: ${statusColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              View Details
            </a>
          </div>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            If you have questions about this verification, please contact our support team. We're here to help!
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
            This is an automated notification from Fashion Marketplace
          </p>
        </div>
      </div>
    `,
  });
}
/**
 * Send warehouse return shipped notification to seller
 * Called by admin when shipping the product back to seller
 */
export async function sendWarehouseReturnShippedNotification(data: {
  sellerName: string;
  sellerEmail: string;
  productTitle: string;
  productId: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
}): Promise<boolean> {
  const trackingUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/seller/boutique/returns`;

  return sendEmail({
    to: data.sellerEmail,
    subject: `Your Product is Shipping - ${data.productTitle}`,
    text: `Your warehouse return for "${data.productTitle}" is now shipping back to you.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #059669; margin-top: 0;">📦 Your Product is Shipping</h2>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hi <strong>${data.sellerName}</strong>,
          </p>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Great news! Your warehouse return for <strong>"${data.productTitle}"</strong> has been approved and is now shipping back to you.
          </p>
          
          <div style="background-color: #D1FAE5; border-left: 4px solid #059669; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; color: #065F46; font-weight: bold;">📋 Shipment Details:</p>
            ${data.carrier ? `<p style="color: #065F46; margin: 5px 0;"><strong>Carrier:</strong> ${data.carrier}</p>` : ''}
            ${data.trackingNumber ? `<p style="color: #065F46; margin: 5px 0;"><strong>Tracking:</strong> ${data.trackingNumber}</p>` : ''}
            ${data.estimatedDelivery ? `<p style="color: #065F46; margin: 5px 0;"><strong>Est. Delivery:</strong> ${data.estimatedDelivery}</p>` : ''}
          </div>
          
          <div style="background-color: #DBEAFE; border-left: 4px solid #0284C7; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #0C4A6E; font-weight: bold;">What to Expect:</p>
            <ul style="color: #0C4A6E; margin: 10px 0 0 0; padding-left: 20px;">
              <li>Your package is on its way</li>
              <li>A shipping fee was charged as per warehouse policy</li>
              <li>You'll receive tracking updates if applicable</li>
              <li>Please confirm receipt when it arrives</li>
            </ul>
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${trackingUrl}" style="display: inline-block; padding: 14px 28px; background-color: #059669; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Track Return
            </a>
          </div>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Once your product arrives, please mark it as received in the platform. 
            If you have any questions about your return, contact support.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
            This is an automated notification from Fashion Marketplace
          </p>
        </div>
      </div>
    `,
  });
}
