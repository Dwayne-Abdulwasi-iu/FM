/**
 * Featured Items Validation Helper
 * Handles rate limiting, duplicate prevention, and audit logging
 */

interface RateLimitKey {
  userId: string
  endpoint: 'featured-designs' | 'featured-boutique-products'
  action: 'POST' | 'DELETE'
}

// In-memory rate limiting store (resets on server restart)
// For production, use Redis
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT_CONFIG = {
  'featured-designs': {
    POST: { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
    DELETE: { maxRequests: 10, windowMs: 60000 } // 10 deletes per minute
  },
  'featured-boutique-products': {
    POST: { maxRequests: 5, windowMs: 60000 },
    DELETE: { maxRequests: 10, windowMs: 60000 }
  }
}

export function checkRateLimit(
  userId: string,
  endpoint: 'featured-designs' | 'featured-boutique-products',
  action: 'POST' | 'DELETE'
): { allowed: boolean; remainingRequests?: number; resetTime?: number } {
  const key = `${userId}:${endpoint}:${action}`
  const now = Date.now()
  const config = RATE_LIMIT_CONFIG[endpoint][action]
  
  const currentLimit = rateLimitStore.get(key)
  
  if (!currentLimit || currentLimit.resetTime < now) {
    // New window or expired window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    })
    return {
      allowed: true,
      remainingRequests: config.maxRequests - 1,
      resetTime: now + config.windowMs
    }
  }
  
  if (currentLimit.count < config.maxRequests) {
    currentLimit.count++
    return {
      allowed: true,
      remainingRequests: config.maxRequests - currentLimit.count,
      resetTime: currentLimit.resetTime
    }
  }
  
  return {
    allowed: false,
    resetTime: currentLimit.resetTime
  }
}

export interface AuditLogEntry {
  userId: string
  action: 'FEATURED_ADDED' | 'FEATURED_REMOVED'
  itemType: 'DESIGN' | 'BOUTIQUE_PRODUCT'
  itemId: string
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  success: boolean
  errorCode?: string
}

// In-memory audit log (in production, persist to DB)
const auditLog: AuditLogEntry[] = []

export function logAuditEntry(entry: AuditLogEntry) {
  auditLog.push(entry)
  // Keep only last 1000 entries in memory
  if (auditLog.length > 1000) {
    auditLog.shift()
  }
}

export function getAuditLog(userId: string, limit: number = 50): AuditLogEntry[] {
  return auditLog
    .filter(entry => entry.userId === userId)
    .slice(-limit)
}

/**
 * Validate that item still exists and is valid for featuring
 */
export async function validateItemForFeaturing(
  itemId: string,
  itemType: 'DESIGN' | 'BOUTIQUE_PRODUCT',
  prisma: any,
  userId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (itemType === 'DESIGN') {
      const design = await prisma.design.findUnique({
        where: { id: itemId },
        select: { 
          id: true,
          designerId: true,
          approvalStatus: true,
          isActive: true,
          featured: true
        }
      })
      
      if (!design) {
        return { valid: false, error: 'Design not found' }
      }
      
      if (design.designerId !== userId) {
        return { valid: false, error: 'You do not own this design' }
      }
      
      if (design.approvalStatus !== 'APPROVED') {
        return { valid: false, error: 'Design must be approved to feature' }
      }
      
      if (!design.isActive) {
        return { valid: false, error: 'Design must be active to feature' }
      }
      
      return { valid: true }
    } else {
      // BOUTIQUE_PRODUCT
      const product = await prisma.boutiqueProduct.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          sellerId: true,
          status: true
        }
      })
      
      if (!product) {
        return { valid: false, error: 'Product not found' }
      }
      
      if (product.sellerId !== userId) {
        return { valid: false, error: 'You do not own this product' }
      }
      
      if (product.status !== 'LIVE') {
        return { valid: false, error: 'Product must be live to feature' }
      }
      
      return { valid: true }
    }
  } catch (error) {
    console.error('[ValidationError]', error)
    return { valid: false, error: 'Validation error occurred' }
  }
}

/**
 * Check if item is already featured by this user
 */
export async function isItemAlreadyFeatured(
  itemId: string,
  itemType: 'DESIGN' | 'BOUTIQUE_PRODUCT',
  userId: string,
  prisma: any
): Promise<boolean> {
  try {
    if (itemType === 'DESIGN') {
      const featured = await prisma.featuredDesign.findUnique({
        where: { sellerId_designId: { sellerId: userId, designId: itemId } }
      })
      return !!featured
    } else {
      const featured = await prisma.featuredBoutiqueProduct.findUnique({
        where: { sellerId_productId: { sellerId: userId, productId: itemId } }
      })
      return !!featured
    }
  } catch (error) {
    console.error('[AlreadyFeaturedCheck]', error)
    return false
  }
}

export function getIpAddress(request: any): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
}
