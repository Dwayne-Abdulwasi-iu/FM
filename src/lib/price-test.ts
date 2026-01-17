/**
 * A/B Price Test Utility
 * 
 * Handles "sticky" variant assignment for price testing.
 * Once a user is assigned to a variant, they always see that variant.
 */

const STORAGE_KEY_PREFIX = 'ab_price_'

interface VariantAssignment {
  variant: 'A' | 'B'
  assignedAt: number
  designId: string
}

/**
 * Get the price to display for a design with an active A/B test
 * 
 * This ensures:
 * 1. Same user always sees same price (sticky assignment)
 * 2. New users get randomly assigned 50/50
 * 3. Assignment persists in localStorage
 */
export function getTestPrice(
  designId: string,
  originalPrice: number,
  variantPrice: number,
  userId?: string | null
): { price: number; variant: 'A' | 'B' } {
  // Check if user already has an assignment
  const existingAssignment = getStoredAssignment(designId, userId)
  
  if (existingAssignment) {
    // User already assigned - return their assigned price
    return {
      price: existingAssignment.variant === 'A' ? originalPrice : variantPrice,
      variant: existingAssignment.variant,
    }
  }
  
  // New user - randomly assign variant
  const variant = assignVariant(designId, userId)
  
  return {
    price: variant === 'A' ? originalPrice : variantPrice,
    variant,
  }
}

/**
 * Get stored assignment for a design
 */
function getStoredAssignment(
  designId: string, 
  userId?: string | null
): VariantAssignment | null {
  if (typeof window === 'undefined') return null
  
  try {
    // First check by user ID (for logged-in users)
    if (userId) {
      const userKey = `${STORAGE_KEY_PREFIX}user_${userId}_${designId}`
      const stored = localStorage.getItem(userKey)
      if (stored) {
        return JSON.parse(stored)
      }
    }
    
    // Fall back to device-based assignment (for guests)
    const deviceKey = `${STORAGE_KEY_PREFIX}device_${designId}`
    const stored = localStorage.getItem(deviceKey)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // localStorage not available or parse error
  }
  
  return null
}

/**
 * Assign a variant and store it
 */
function assignVariant(
  designId: string,
  userId?: string | null
): 'A' | 'B' {
  // Random 50/50 assignment
  const variant: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B'
  
  const assignment: VariantAssignment = {
    variant,
    designId,
    assignedAt: Date.now(),
  }
  
  if (typeof window !== 'undefined') {
    try {
      // Store by user ID if logged in
      if (userId) {
        const userKey = `${STORAGE_KEY_PREFIX}user_${userId}_${designId}`
        localStorage.setItem(userKey, JSON.stringify(assignment))
      }
      
      // Also store by device (for when user logs out or different device)
      const deviceKey = `${STORAGE_KEY_PREFIX}device_${designId}`
      localStorage.setItem(deviceKey, JSON.stringify(assignment))
    } catch {
      // localStorage not available
    }
  }
  
  return variant
}

/**
 * React hook for A/B price testing
 */
import { useState, useEffect } from 'react'

interface PriceTestResult {
  price: number
  variant: 'A' | 'B'
  isTestActive: boolean
}

interface PriceTestConfig {
  designId: string
  originalPrice: number
  variantPrice?: number | null
  isTestActive?: boolean
}

export function usePriceTest(
  config: PriceTestConfig,
  userId?: string | null
): PriceTestResult {
  const [result, setResult] = useState<PriceTestResult>({
    price: config.originalPrice,
    variant: 'A',
    isTestActive: false,
  })
  
  useEffect(() => {
    // If no test is active, just show original price
    if (!config.isTestActive || !config.variantPrice) {
      setResult({
        price: config.originalPrice,
        variant: 'A',
        isTestActive: false,
      })
      return
    }
    
    // Get the sticky price for this user
    const { price, variant } = getTestPrice(
      config.designId,
      config.originalPrice,
      config.variantPrice,
      userId
    )
    
    setResult({
      price,
      variant,
      isTestActive: true,
    })
  }, [config.designId, config.originalPrice, config.variantPrice, config.isTestActive, userId])
  
  return result
}

/**
 * Track which variant a user saw (for analytics)
 */
export async function trackVariantView(
  designId: string,
  variant: 'A' | 'B'
): Promise<void> {
  try {
    await fetch('/api/seller/price-test/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designId, variant, event: 'view' }),
    })
  } catch {
    // Silently fail - analytics shouldn't break the page
  }
}

/**
 * Track a purchase with variant info
 */
export async function trackVariantPurchase(
  designId: string,
  variant: 'A' | 'B',
  price: number
): Promise<void> {
  try {
    await fetch('/api/seller/price-test/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designId, variant, event: 'purchase', price }),
    })
  } catch {
    // Silently fail
  }
}
