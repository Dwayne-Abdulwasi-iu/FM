#!/usr/bin/env node

/**
 * Admin Script: List all sellers with bank accounts
 * 
 * Shows which sellers have Paystack subaccounts and their current commission tiers
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log(`\n📋 Fetching all sellers with bank accounts...\n`)

    const sellers = await prisma.sellerAccount.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            totalEarnings: true,
            designerTier: true
          }
        }
      }
    })

    if (sellers.length === 0) {
      console.log(`No sellers found with bank accounts`)
      process.exit(0)
    }

    console.log(`Found ${sellers.length} seller(s):\n`)
    console.log('┌─────────────────────────────────────────────────────────────────────────────────────┐')
    console.log('│ Email                          │ Earnings  │ Tier    │ Bank Account │ Subaccount   │')
    console.log('├─────────────────────────────────────────────────────────────────────────────────────┤')

    sellers.forEach((seller, idx) => {
      const getTier = (earnings) => {
        if (earnings >= 25000) return 'DIAMOND'
        if (earnings >= 10000) return 'PLATINUM'
        if (earnings >= 5000) return 'GOLD'
        if (earnings >= 2000) return 'SILVER'
        if (earnings >= 500) return 'BRONZE'
        if (earnings >= 100) return 'NEW'
        return 'STARTER'
      }

      const tier = getTier(seller.user.totalEarnings || 0)
      const email = seller.user.email.padEnd(30)
      const earnings = `$${(seller.user.totalEarnings || 0).toFixed(0)}`.padEnd(9)
      const tierStr = tier.padEnd(7)
      const verified = seller.isVerified ? '✓' : '✗'
      const subaccount = seller.subaccountCode ? '✓' : '✗'

      console.log(`│ ${email} │ ${earnings} │ ${tierStr} │ ${verified}        │ ${subaccount}          │`)
    })

    console.log('└─────────────────────────────────────────────────────────────────────────────────────┘')

    console.log(`\n💡 To update a seller's commission split, run:`)
    console.log(`   node scripts/update-seller-commission.mjs <email_or_userId>\n`)

  } catch (error) {
    console.error(`Error:`, error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
