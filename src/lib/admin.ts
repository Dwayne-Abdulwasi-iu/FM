/**
 * Admin utilities for checking permissions and roles
 */

/**
 * Check if the given email belongs to the main/super admin
 * Main admin is identified by the ADMIN_EMAIL environment variable
 * Comparison is case-insensitive to handle email normalization differences
 */
export function isMainAdmin(email: string | null | undefined): boolean {
  const mainAdminEmail = process.env.ADMIN_EMAIL
  if (!mainAdminEmail || !email) return false
  return email.toLowerCase() === mainAdminEmail.toLowerCase()
}

/**
 * Get the main admin email from environment
 */
export function getMainAdminEmail(): string | undefined {
  return process.env.ADMIN_EMAIL
}
