import { NextResponse } from 'next/server'

/**
 * Standardized API response helpers
 * Use these across all API endpoints for consistent response format
 * 
 * All error responses use: { error: string, code?: string }
 * All success responses use: { success: boolean, data?: T } or custom shape
 */

export function apiError(message: string, status: number = 400, code?: string) {
  return NextResponse.json(
    { 
      error: message,
      ...(code && { code })
    },
    { status }
  )
}

export function apiUnauthorized(message = 'Authentication required') {
  return apiError(message, 401, 'UNAUTHORIZED')
}

export function apiForbidden(message = 'Access denied') {
  return apiError(message, 403, 'FORBIDDEN')
}

export function apiNotFound(message = 'Resource not found') {
  return apiError(message, 404, 'NOT_FOUND')
}

export function apiTooManyRequests(message = 'Too many requests. Please try again later.', retryAfter?: Date) {
  const response = NextResponse.json(
    { 
      error: message,
      code: 'RATE_LIMITED',
      ...(retryAfter && { retryAfter: retryAfter.toISOString() })
    },
    { status: 429 }
  )
  
  if (retryAfter) {
    const seconds = Math.ceil((retryAfter.getTime() - Date.now()) / 1000)
    response.headers.set('Retry-After', String(Math.max(1, seconds)))
  }
  
  return response
}

export function apiServerError(message = 'Internal server error', error?: Error) {
  if (error) {
    console.error('Server error:', error)
  }
  return apiError(message, 500, 'INTERNAL_ERROR')
}

export function apiSuccess<T = unknown>(data?: T, status: number = 200) {
  return NextResponse.json(data ?? null, { status })
}

/**
 * Validate required fields in request body
 * Returns error response if any fields are missing
 */
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): { valid: boolean; error?: ReturnType<typeof apiError> } {
  const missing = requiredFields.filter(field => data[field] === undefined || data[field] === null)
  
  if (missing.length > 0) {
    return {
      valid: false,
      error: apiError(
        `Missing required fields: ${missing.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      )
    }
  }
  
  return { valid: true }
}

/**
 * Parse JSON with error handling
 */
export async function safeParseJson<T>(text: string): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = JSON.parse(text) as T
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON'
    }
  }
}
