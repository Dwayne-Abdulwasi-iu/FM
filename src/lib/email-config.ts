/**
 * Email Configuration Helpers
 * 
 * Synchronous utility functions to check email service configuration.
 * No server-only dependencies - can be imported by client code if needed.
 */

/**
 * Check if SMTP is configured (only email service)
 */
export function isSMTPConfigured(): boolean {
  const host = process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST;
  const port = process.env.SMTP_PORT || process.env.EMAIL_SERVER_PORT;
  const user = process.env.SMTP_USER || process.env.EMAIL_SERVER_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_SERVER_PASSWORD;

  return !!(
    host &&
    port &&
    user &&
    pass
  );
}

/**
 * Check if Gmail SMTP is configured
 */
export function isGmailConfigured(): boolean {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  return !!(user && pass);
}

/**
 * Check if any email method is configured (SendGrid, Gmail SMTP, or generic SMTP)
 */
export function isEmailConfigured(): boolean {
  return !!(process.env.SENDGRID_API_KEY || isGmailConfigured() || isSMTPConfigured());
}
