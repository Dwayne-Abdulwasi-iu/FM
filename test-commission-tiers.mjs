#!/usr/bin/env node

/**
 * Test Script: Commission Tier System
 * Tests the getCommissionRate() function with various earnings levels
 * and validates the Paystack percentage conversion
 */

const commissionTiers = {
  STARTER: { threshold: 0, rate: 0.001, name: 'Starter (0.1%)', nextTier: 'NEW', nextThreshold: 100 },
  NEW: { threshold: 100, rate: 0.10, name: 'New Seller', nextTier: 'BRONZE', nextThreshold: 500 },
  BRONZE: { threshold: 500, rate: 0.095, name: 'Bronze', nextTier: 'SILVER', nextThreshold: 2000 },
  SILVER: { threshold: 2000, rate: 0.09, name: 'Silver', nextTier: 'GOLD', nextThreshold: 5000 },
  GOLD: { threshold: 5000, rate: 0.085, name: 'Gold', nextTier: 'PLATINUM', nextThreshold: 10000 },
  PLATINUM: { threshold: 10000, rate: 0.08, name: 'Platinum', nextTier: 'DIAMOND', nextThreshold: 25000 },
  DIAMOND: { threshold: 25000, rate: 0.07, name: 'Diamond', nextTier: null, nextThreshold: null },
}

const PAYSTACK_MINIMUM_RATE = 0.001
const PRO_SUBSCRIBER_DISCOUNT = 0.01
const VIP_SUBSCRIBER_DISCOUNT = 0.02
const MINIMUM_COMMISSION_RATE = 0.06

/**
 * Get commission tier based on total earnings
 */
function getCommissionTier(totalEarnings) {
  if (totalEarnings >= commissionTiers.DIAMOND.threshold) return 'DIAMOND'
  if (totalEarnings >= commissionTiers.PLATINUM.threshold) return 'PLATINUM'
  if (totalEarnings >= commissionTiers.GOLD.threshold) return 'GOLD'
  if (totalEarnings >= commissionTiers.SILVER.threshold) return 'SILVER'
  if (totalEarnings >= commissionTiers.BRONZE.threshold) return 'BRONZE'
  if (totalEarnings >= commissionTiers.NEW.threshold) return 'NEW'
  return 'STARTER'
}

/**
 * Get commission rate for a seller
 */
function getCommissionRate(totalEarnings, subscriptionTierOrBool = null, isProSubscriber = false) {
  const tier = getCommissionTier(totalEarnings)
  const baseRate = commissionTiers[tier].rate
  
  // Starter tier uses Paystack minimum (0.1%)
  if (tier === 'STARTER') {
    return PAYSTACK_MINIMUM_RATE
  }
  
  let discount = 0
  
  // Handle new tier-based system (string)
  if (typeof subscriptionTierOrBool === 'string') {
    if (subscriptionTierOrBool === 'VIP') {
      discount = VIP_SUBSCRIBER_DISCOUNT
    } else if (subscriptionTierOrBool === 'PRO' || subscriptionTierOrBool === 'STARTER') {
      discount = PRO_SUBSCRIBER_DISCOUNT
    }
  } 
  // Handle legacy boolean system
  else if (typeof subscriptionTierOrBool === 'boolean' && subscriptionTierOrBool) {
    discount = PRO_SUBSCRIBER_DISCOUNT
  } else if (isProSubscriber) {
    discount = PRO_SUBSCRIBER_DISCOUNT
  }
  
  if (discount > 0) {
    return Math.max(baseRate - discount, MINIMUM_COMMISSION_RATE)
  }
  
  return baseRate
}

/**
 * Convert rate to Paystack percentage
 * Formula: Math.round(commissionRate * 100 * 10) / 10
 */
function convertToPaystackPercentage(commissionRate) {
  return Math.round(commissionRate * 100 * 10) / 10
}

// Test cases
const testCases = [
  // [earnings, subscriptionTier, description]
  [0, null, 'New seller, no earnings, no subscription (STARTER)'],
  [50, null, 'New seller, $50 earnings, no subscription (STARTER)'],
  [99, null, 'New seller, $99 earnings, no subscription (STARTER edge)'],
  [100, null, 'New seller, $100 earnings, no subscription (NEW)'],
  [150, null, 'New seller, $150 earnings, no subscription'],
  [500, null, 'Seller, $500 earnings, no subscription (BRONZE)'],
  [2000, null, 'Seller, $2000 earnings, no subscription (SILVER)'],
  [5000, null, 'Seller, $5000 earnings, no subscription (GOLD)'],
  [10000, null, 'Seller, $10000 earnings, no subscription (PLATINUM)'],
  [25000, null, 'Seller, $25000 earnings, no subscription (DIAMOND)'],
  
  // With subscriptions
  [100, 'PRO', 'New seller, $100, PRO subscription'],
  [500, 'PRO', 'BRONZE seller, $500, PRO subscription'],
  [5000, 'VIP', 'GOLD seller, $5000, VIP subscription'],
]

console.log('\n╔══════════════════════════════════════════════════════════════════╗')
console.log('║         COMMISSION TIER SYSTEM TEST                               ║')
console.log('╚══════════════════════════════════════════════════════════════════╝\n')

console.log('Testing commission rate calculations...\n')

let allPassed = true
let results = []

testCases.forEach(([earnings, sub, desc]) => {
  const commissionRate = getCommissionRate(earnings, sub)
  const tier = getCommissionTier(earnings)
  const paystackPercentage = convertToPaystackPercentage(commissionRate)
  
  const sellerPercentage = 100 - paystackPercentage
  
  // Validate
  const isValid = paystackPercentage >= 0.1 && paystackPercentage <= 10
  const status = isValid ? '✓' : '✗'
  
  if (!isValid) allPassed = false
  
  results.push({
    earnings,
    tier,
    desc,
    sub,
    commissionRate: (commissionRate * 100).toFixed(2) + '%',
    paystackPercentage: paystackPercentage.toFixed(1) + '%',
    sellerPercentage: sellerPercentage.toFixed(1) + '%',
    valid: isValid
  })
  
  console.log(`${status} ${desc.padEnd(45)} | Tier: ${tier.padEnd(9)} | Platform: ${String(paystackPercentage).padStart(4)}% | Seller: ${String(sellerPercentage).padStart(5)}%`)
})

console.log('\n╔══════════════════════════════════════════════════════════════════╗')
console.log('║                    DETAILED RESULTS                              ║')
console.log('╚══════════════════════════════════════════════════════════════════╝\n')

results.forEach(r => {
  console.log(`Earnings: $${r.earnings.toString().padStart(6)} | Tier: ${r.tier.padEnd(9)} | Sub: ${(r.sub || 'none').padEnd(5)} |`)
  console.log(`  ${r.desc}`)
  console.log(`  Commission Rate: ${r.commissionRate.padEnd(7)} → Paystack: ${r.paystackPercentage.padEnd(6)} → Seller Gets: ${r.sellerPercentage}`)
  console.log()
})

// Validation checks
console.log('\n╔══════════════════════════════════════════════════════════════════╗')
console.log('║                   VALIDATION CHECKS                              ║')
console.log('╚══════════════════════════════════════════════════════════════════╝\n')

const validationChecks = [
  {
    name: 'STARTER tier rate is 0.1%',
    test: () => commissionTiers.STARTER.rate === 0.001,
  },
  {
    name: 'NEW tier rate is 10%',
    test: () => commissionTiers.NEW.rate === 0.10,
  },
  {
    name: 'Paystack percentage conversion (0.10 → 10)',
    test: () => convertToPaystackPercentage(0.10) === 10,
  },
  {
    name: 'Paystack percentage conversion (0.001 → 0.1)',
    test: () => convertToPaystackPercentage(0.001) === 0.1,
  },
  {
    name: 'Paystack percentage conversion (0.095 → 9.5)',
    test: () => convertToPaystackPercentage(0.095) === 9.5,
  },
  {
    name: 'Seller at $99 gets STARTER rate (0.1%)',
    test: () => getCommissionRate(99) === 0.001,
  },
  {
    name: 'Seller at $100 gets NEW rate (10%)',
    test: () => getCommissionRate(100) === 0.10,
  },
  {
    name: 'VIP seller at $5000 gets discount (6.5%, above minimum)',
    test: () => getCommissionRate(5000, 'VIP') === 0.065,
  },
  {
    name: 'PRO seller at $500 gets discount (8.5%)',
    test: () => getCommissionRate(500, 'PRO') === 0.085,
  },
  {
    name: 'Non-existent tier defaults to STARTER',
    test: () => getCommissionTier(-100) === 'STARTER',
  },
]

let passedChecks = 0
let failedChecks = 0

validationChecks.forEach(check => {
  const passed = check.test()
  const status = passed ? '✓' : '✗'
  
  if (passed) {
    passedChecks++
  } else {
    failedChecks++
    allPassed = false
  }
  
  console.log(`${status} ${check.name}`)
})

// Summary
console.log('\n╔══════════════════════════════════════════════════════════════════╗')
console.log('║                        TEST SUMMARY                              ║')
console.log('╚══════════════════════════════════════════════════════════════════╝\n')

console.log(`Total validation checks: ${validationChecks.length}`)
console.log(`Passed: ${passedChecks}`)
console.log(`Failed: ${failedChecks}`)
console.log(`\nOverall status: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`)
console.log()

process.exit(allPassed ? 0 : 1)
