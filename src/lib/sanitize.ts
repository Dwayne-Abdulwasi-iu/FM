/**
 * Basic HTML sanitization for displaying user/admin-generated content
 * 
 * This strips potentially dangerous HTML tags and attributes while
 * preserving safe formatting elements.
 * 
 * For full XSS protection in production, consider using DOMPurify:
 * npm install dompurify @types/dompurify
 */

// Allowed tags and their allowed attributes
const _ALLOWED_TAGS: Record<string, string[]> = {
  // Text formatting
  'b': [],
  'i': [],
  'u': [],
  'strong': [],
  'em': [],
  'mark': [],
  'small': [],
  'sub': [],
  'sup': [],
  's': [],
  'strike': [],
  
  // Structure
  'p': ['class'],
  'br': [],
  'hr': [],
  'div': ['class'],
  'span': ['class'],
  
  // Lists
  'ul': ['class'],
  'ol': ['class', 'type', 'start'],
  'li': ['class'],
  
  // Links (href is sanitized separately)
  'a': ['href', 'title', 'target', 'rel'],
  
  // Headers
  'h1': ['class'],
  'h2': ['class'],
  'h3': ['class'],
  'h4': ['class'],
  'h5': ['class'],
  'h6': ['class'],
  
  // Block quotes
  'blockquote': ['class'],
  'pre': ['class'],
  'code': ['class'],
}

// Dangerous protocols for href
const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:']

/**
 * Sanitize an HTML string by removing dangerous tags and attributes
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''
  
  // Convert newlines to <br> for plain text content
  let sanitized = html
  
  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  // Remove style tags and their content  
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  
  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*(['"])[^'"]*\1/gi, '')
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '')
  
  // Remove javascript: and other dangerous protocols from href/src
  sanitized = sanitized.replace(/(?:href|src)\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'href="#"')
  sanitized = sanitized.replace(/(?:href|src)\s*=\s*(['"])\s*data:[^'"]*\1/gi, 'href="#"')
  sanitized = sanitized.replace(/(?:href|src)\s*=\s*(['"])\s*vbscript:[^'"]*\1/gi, 'href="#"')
  
  // Remove iframe, object, embed, form
  sanitized = sanitized.replace(/<(iframe|object|embed|form|input|button|textarea)[^>]*>/gi, '')
  sanitized = sanitized.replace(/<\/(iframe|object|embed|form|input|button|textarea)>/gi, '')
  
  // Remove base tags (can redirect all links)
  sanitized = sanitized.replace(/<base[^>]*>/gi, '')
  
  // Remove link and meta tags
  sanitized = sanitized.replace(/<(link|meta)[^>]*>/gi, '')
  
  // Add rel="noopener noreferrer" to external links for security
  sanitized = sanitized.replace(
    /<a\s+([^>]*href\s*=\s*['"]https?:\/\/[^'"]*['"][^>]*)>/gi,
    (match, attrs) => {
      if (!attrs.includes('rel=')) {
        return `<a ${attrs} rel="noopener noreferrer" target="_blank">`
      }
      return match
    }
  )
  
  return sanitized
}

/**
 * Escape HTML entities to prevent XSS in plain text contexts
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') return ''
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Check if a URL is safe (not javascript:, data:, etc.)
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  
  const trimmed = url.trim().toLowerCase()
  
  for (const protocol of DANGEROUS_PROTOCOLS) {
    if (trimmed.startsWith(protocol)) {
      return false
    }
  }
  
  return true
}
