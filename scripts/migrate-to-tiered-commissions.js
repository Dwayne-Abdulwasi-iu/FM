/**
 * Migrate Existing Sellers to Tiered Commission System
 * 
 * This script updates all existing Paystack subaccounts to use the correct
 * commission rate based on each seller's tier.
 * 
 * Run with: node scripts/migrate-to-tiered-commissions.js
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    if (!line || line.startsWith('#')) return
    const equalIndex = line.indexOf('=')
    if (equalIndex === -1) return
    const key = line.substring(0, equalIndex).trim()
    let value = line.substring(equalIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key && !process.env[key]) {
      process.env[key] = value
    }
  })
  console.log('✅ Loaded environment from .env.local\n')
}

const prisma = new PrismaClient()

// Commission tiers with thresholds (matching commission-tiers.ts)
// Paystack minimum is 0.1%, so STARTER uses that instead of 0%
const PAYSTACK_MINIMUM_RATE = 0.001 // 0.1%

const COMMISSION_TIERS = {
  STARTER: { threshold: 0, rate: 0.001, name: 'Starter (0.1%)' },
  NEW: { threshold: 100, rate: 0.10, name: 'New Seller' },
  BRONZE: { threshold: 500, rate: 0.095, name: 'Bronze' },
  SILVER: { threshold: 2500, rate: 0.09, name: 'Silver' },
  GOLD: { threshold: 10000, rate: 0.085, name: 'Gold' },
  PLATINUM: { threshold: 50000, rate: 0.08, name: 'Platinum' },
  DIAMOND: { threshold: 100000, rate: 0.07, name: 'Diamond' },
}

const PRO_SUBSCRIBER_DISCOUNT = 0.01
const MINIMUM_COMMISSION_RATE = 0.06

function getCommissionTier(totalEarnings) {
  if (totalEarnings >= COMMISSION_TIERS.DIAMOND.threshold) return 'DIAMOND'
  if (totalEarnings >= COMMISSION_TIERS.PLATINUM.threshold) return 'PLATINUM'
  if (totalEarnings >= COMMISSION_TIERS.GOLD.threshold) return 'GOLD'
  if (totalEarnings >= COMMISSION_TIERS.SILVER.threshold) return 'SILVER'
  if (totalEarnings >= COMMISSION_TIERS.BRONZE.threshold) return 'BRONZE'
  if (totalEarnings >= COMMISSION_TIERS.NEW.threshold) return 'NEW'
  return 'STARTER'
}

function getCommissionRate(totalEarnings, isProSubscriber = false) {
  const tier = getCommissionTier(totalEarnings)
  const baseRate = COMMISSION_TIERS[tier].rate
  
  // STARTER tier uses Paystack minimum (0.1%)
  if (tier === 'STARTER') return PAYSTACK_MINIMUM_RATE
  
  if (isProSubscriber) {
    return Math.max(baseRate - PRO_SUBSCRIBER_DISCOUNT, MINIMUM_COMMISSION_RATE)
  }
  
  return baseRate
}

function rateToPaystackPercentage(rate) {
  return Math.round(rate * 100 * 10) / 10
}

async function migrateToTieredCommissions() {
  console.log('🔄 Migrating sellers to tiered commission system...\n')
  
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY
  if (!PAYSTACK_SECRET) {
    console.error('❌ PAYSTACK_SECRET_KEY not set')
    process.exit(1)
  }

  // Get all sellers with subaccounts
  const sellers = await prisma.user.findMany({
    where: {
      sellerAccount: {
        subaccountCode: { not: null }
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      totalEarnings: true,
      designerTier: true,
      sellerAccount: {
        select: { subaccountCode: true }
      }
    }
  })

  console.log(`Found ${sellers.length} sellers with subaccounts\n`)
  console.log('─'.repeat(80))

  const results = {
    updated: 0,
    skipped: 0,
    errors: 0
  }

  for (const seller of sellers) {
    const tier = getCommissionTier(seller.totalEarnings)
    const isProSubscriber = seller.designerTier === 'VIP_DESIGNER' || seller.designerTier === 'VVIP_DESIGNER'
    const rate = getCommissionRate(seller.totalEarnings, isProSubscriber)
    const name = seller.name || seller.email || seller.id

    console.log(`\nSeller: ${name}`)
    console.log(`  Total Earnings: $${seller.totalEarnings.toFixed(2)}`)
    console.log(`  Tier: ${COMMISSION_TIERS[tier].name}`)
    console.log(`  Pro Subscriber: ${isProSubscriber ? 'Yes' : 'No'}`)
    console.log(`  Commission Rate: ${(rate * 100).toFixed(1)}%`)

    try {
      const paystackPercentage = rateToPaystackPercentage(rate)
      
      const response = await fetch(`https://api.paystack.co/subaccount/${seller.sellerAccount.subaccountCode}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          percentage_charge: paystackPercentage
        })
      })

      const result = await response.json()

      if (result.status) {
        console.log(`  ✅ Updated to ${paystackPercentage}% platform fee`)
        results.updated++
      } else {
        console.log(`  ❌ Failed: ${result.message}`)
        results.errors++
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
      results.errors++
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log('\n' + '─'.repeat(80))
  console.log('\n📊 Migration Summary:')
  console.log(`   Updated: ${results.updated}`)
  console.log(`   Errors:  ${results.errors}`)
  console.log('\n✅ Migration complete!')
}

migrateToTieredCommissions()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
