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
 * Check if any email method is configured (SMTP only)
 */
export function isEmailConfigured(): boolean {
  return isSMTPConfigured();
}
