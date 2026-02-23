#!/usr/bin/env node

/**
 * Admin Script: Update seller's commission split in Paystack
 * 
 * Updates the percentage_charge on a seller's Paystack subaccount based on their current earnings tier.
 * Usage: node scripts/update-seller-commission.mjs <userId_or_email>
 */

import { PrismaClient } from '@prisma/client'
import axios from 'axios'

const prisma = new PrismaClient()

// Commission tier structure (matches src/lib/commission-tiers.ts)
const commissionTiers = [
  { min: 0, max: 99, rate: 0.1, name: 'STARTER' },
  { min: 100, max: 499, rate: 10, name: 'NEW' },
  { min: 500, max: 1999, rate: 9.5, name: 'BRONZE' },
  { min: 2000, max: 4999, rate: 9, name: 'SILVER' },
  { min: 5000, max: 9999, rate: 8.5, name: 'GOLD' },
  { min: 10000, max: 24999, rate: 8, name: 'PLATINUM' },
  { min: 25000, max: Infinity, rate: 7, name: 'DIAMOND' }
]

function getCommissionRate(earnings, hasProSubscription = false, hasVipSubscription = false) {
  let tier = commissionTiers.find(t => earnings >= t.min && earnings <= t.max)
  if (!tier) tier = commissionTiers[0]

  let rate = tier.rate
  
  // Apply subscription discounts
  if (hasVipSubscription) {
    rate = Math.max(rate - 2, 6) // VIP: 2% off, min 6%
  } else if (hasProSubscription) {
    rate = Math.max(rate - 1, 6) // Pro: 1% off, min 6%
  }

  return {
    rate,
    tier: tier.name,
    commissionRate: rate
  }
}

function getAuthHeaders() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) throw new Error('PAYSTACK_SECRET_KEY not set')
  return {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  }
}

async function updatePaystackSubaccount(subaccountCode, percentageCharge) {
  const response = await axios.put(
    `https://api.paystack.co/subaccount/${subaccountCode}`,
    { percentage_charge: percentageCharge },
    { headers: getAuthHeaders() }
  )
  return response.data
}

const userIdentifier = process.argv[2]

if (!userIdentifier) {
  console.error('❌ Missing argument: userId or email')
  console.error('Usage: node scripts/update-seller-commission.mjs <userId_or_email>')
  process.exit(1)
}

async function main() {
  try {
    console.log(`\n📋 Updating commission split for: ${userIdentifier}\n`)

    // Find user by ID or email
    let user = null
    if (userIdentifier.includes('@')) {
      user = await prisma.user.findUnique({
        where: { email: userIdentifier }
      })
    } else {
      user = await prisma.user.findUnique({
        where: { id: userIdentifier }
      })
    }

    if (!user) {
      console.error(`❌ User not found: ${userIdentifier}`)
      process.exit(1)
    }

    console.log(`✓ Found user: ${user.name || user.email}`)
    console.log(`  User ID: ${user.id}`)
    console.log(`  Total Earnings: $${user.totalEarnings || 0}`)

    // Get seller account
    const sellerAccount = await prisma.sellerAccount.findFirst({
      where: { userId: user.id }
    })

    if (!sellerAccount) {
      console.error(`❌ No seller account found for user`)
      process.exit(1)
    }

    if (!sellerAccount.subaccountCode) {
      console.error(`❌ Seller has no Paystack subaccount yet`)
      process.exit(1)
    }

    console.log(`✓ Seller Account found`)
    console.log(`  Subaccount Code: ${sellerAccount.subaccountCode}`)

    // Calculate new commission rate
    const commission = getCommissionRate(
      user.totalEarnings || 0,
      user.designerTier === 'PRO',
      user.designerTier === 'VIP'
    )

    console.log(`\n📊 Commission Calculation:`)
    console.log(`  Earnings Tier: ${commission.tier}`)
    console.log(`  New Platform Fee: ${commission.commissionRate}%`)
    console.log(`  Seller Gets: ${100 - commission.commissionRate}%`)

    // Update Paystack
    console.log(`\n🔄 Updating Paystack subaccount...`)
    const result = await updatePaystackSubaccount(
      sellerAccount.subaccountCode,
      commission.commissionRate
    )

    if (result.status === true) {
      console.log(`\n✅ SUCCESS!`)
      console.log(`  Platform Fee Updated: ${commission.commissionRate}%`)
      console.log(`  Seller Now Receives: ${100 - commission.commissionRate}%`)
    } else {
      console.error(`❌ Paystack update failed:`, result)
      process.exit(1)
    }

  } catch (error) {
    console.error(`❌ Error:`)
    if (error.response?.data) {
      console.error(error.response.data)
    } else {
      console.error(error instanceof Error ? error.message : String(error))
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
