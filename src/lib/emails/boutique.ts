/**
 * Boutique email templates and sending functions
 * These emails are triggered by warehouse operations
 */

export async function sendStorageOptionConfirmationEmail(
  sellerEmail: string,
  productName: string,
  option: string
): Promise<void> {
  // TODO: Implement email sending via SendGrid/SMTP
  console.log(`[EMAIL] Storage option confirmation sent to ${sellerEmail} for ${productName}: ${option}`)
}

export async function sendLiquidationStartedEmail(
  sellerEmail: string,
  productName: string,
  totalUnits: number
): Promise<void> {
  // TODO: Implement email sending via SendGrid/SMTP
  console.log(`[EMAIL] Liquidation started for ${sellerEmail}: ${productName} (${totalUnits} units)`)
}

export async function sendReturnProcessingEmail(
  sellerEmail: string,
  productName: string,
  shipmentId: string
): Promise<void> {
  // TODO: Implement email sending via SendGrid/SMTP
  console.log(`[EMAIL] Return processing for ${sellerEmail}: ${productName} (Shipment: ${shipmentId})`)
}

export async function sendWarehouseWarningEmail(
  sellerEmail: string,
  productName: string,
  daysRemaining: number
): Promise<void> {
  // TODO: Implement email sending via SendGrid/SMTP
  console.log(`[EMAIL] Warehouse warning to ${sellerEmail}: ${productName} - ${daysRemaining} days remaining`)
}
