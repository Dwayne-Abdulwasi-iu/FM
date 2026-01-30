#!/usr/bin/env node

/**
 * FLAW FIX #14: Maintenance Script
 * Validates and repairs design ownership state inconsistencies
 * 
 * Usage:
 *   node scripts/repair-ownership-state.mjs [--dry-run] [--designId=UUID]
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const designIdArg = args.find(a => a.startsWith('--designId='))?.split('=')[1]

async function validateAndRepairOwnershipState() {
  console.log('🔍 Ownership State Validation & Repair\n')
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify data)'}\n`)

  try {
    // Get all designs or specific design
    const designs = await prisma.design.findMany({
      where: designIdArg ? { id: designIdArg } : { isOwned: true },
      select: {
        id: true,
        title: true,
        isOwned: true
      }
    })

    console.log(`Found ${designs.length} design(s) to check\n`)

    let issuesFound = 0
    let issuesFixed = 0

    for (const design of designs) {
      // Count active contracts for this design
      const contracts = await prisma.ownershipContract.count({
        where: {
          ownershipDocument: {
            designId: design.id
          },
          status: { not: 'CANCELLED' },
          isReleased: false
        }
      })

      const expectedOwned = contracts > 0
      const isConsistent = design.isOwned === expectedOwned

      if (!isConsistent) {
        issuesFound++
        console.log(`❌ ISSUE: Design "${design.title}"`)
        console.log(`   ID: ${design.id}`)
        console.log(`   Current state: isOwned=${design.isOwned}`)
        console.log(`   Expected state: isOwned=${expectedOwned}`)
        console.log(`   Active contracts: ${contracts}`)

        if (!isDryRun) {
          // Fix the inconsistency
          await prisma.design.update({
            where: { id: design.id },
            data: { isOwned: expectedOwned }
          })
          issuesFixed++
          console.log(`   ✅ FIXED: isOwned set to ${expectedOwned}`)
        } else {
          console.log(`   [DRY RUN] Would fix: isOwned → ${expectedOwned}`)
        }
        console.log()
      } else {
        console.log(`✅ PASS: Design "${design.title}" (${contracts} active contracts)`)
      }
    }

    console.log('\n📊 Summary:')
    console.log(`   Total issues found: ${issuesFound}`)
    console.log(`   Issues fixed: ${issuesFixed}`)

    if (isDryRun && issuesFound > 0) {
      console.log(`\n💡 Run without --dry-run to apply fixes:`)
      console.log(`   node scripts/repair-ownership-state.mjs`)
    }
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

validateAndRepairOwnershipState()
