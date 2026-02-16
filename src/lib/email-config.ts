/**
 * Email Configuration Helpers
 * 
 * Synchronous utility functions to check email service configuration.
 * No server-only dependencies - can be imported by client code if needed.
 */

/**
 * Check if SendGrid is configured (preferred email service)
 */
export function isSendGridConfigured(): boolean {
  return !!(process.env.SENDGRID_API_KEY);
}

/**
 * Check if SMTP is configured (fallback email service)
 */
export function isSMTPConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

/**
 * Check if any email method is configured (SendGrid or SMTP)
 */
export function isEmailConfigured(): boolean {
  return isSendGridConfigured() || isSMTPConfigured();
}
