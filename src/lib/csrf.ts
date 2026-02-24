import crypto from 'crypto';

/**
 * CSRF Protection Utilities
 * Implements double-submit cookie pattern for CSRF protection
 */

const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_TOKEN_COOKIE = '_csrf_token';

/**
 * Generate a new CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate CSRF token from request headers/cookies
 * @param headerToken - Token from request header (x-csrf-token)
 * @param cookieToken - Token from request cookies (_csrf_token)
 * @returns true if tokens exist and match, false otherwise
 */
export function validateCsrfToken(headerToken: string | null, cookieToken: string | null): boolean {
  // Both must be present and identical
  if (!headerToken || !cookieToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return constantTimeEqual(headerToken, cookieToken);
}

/**
 * Constant-time string comparison (prevents timing attacks)
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Extract CSRF token from request headers
 */
export function getCsrfTokenFromRequest(headers: Headers): string | null {
  return headers.get(CSRF_TOKEN_HEADER);
}

/**
 * Extract CSRF token from cookies (format: "key=value; key=value")
 */
export function getCsrfTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === CSRF_TOKEN_COOKIE && value) {
      return decodeURIComponent(value);
    }
  }

  return null;
}
