/**
 * Fix Subaccount Percentage
 * 
 * This script updates existing Paystack subaccounts that were incorrectly created
 * with percentage_charge: 95 (platform keeps 95%) to percentage_charge: 10 (platform keeps 10%)
 * 
 * Run with: node scripts/fix-subaccount-percentage.js
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (!line || line.startsWith('#')) return
    
    const equalIndex = line.indexOf('=')
    if (equalIndex === -1) return
    
    const key = line.substring(0, equalIndex).trim()
    let value = line.substring(equalIndex + 1).trim()
    
    // Remove surrounding quotes (single or double)
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    
    if (key && !process.env[key]) {
      process.env[key] = value
    }
  })
  console.log('✅ Loaded environment from .env.local\n')
} else {
  console.log('⚠️  No .env.local found, using existing environment variables\n')
}

const prisma = new PrismaClient()

async function fixSubaccounts() {
  console.log('🔧 Fixing subaccount percentages...\n')
  
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY
  if (!PAYSTACK_SECRET) {
    console.error('❌ PAYSTACK_SECRET_KEY not set')
    process.exit(1)
  }
  
  // Get all seller accounts with subaccount codes
  const sellerAccounts = await prisma.sellerAccount.findMany({
    where: {
      subaccountCode: { not: null }
    },
    include: {
      user: {
        select: { name: true, email: true }
      }
    }
  })
  
  console.log(`Found ${sellerAccounts.length} seller accounts with subaccounts\n`)
  
  for (const account of sellerAccounts) {
    console.log(`Processing: ${account.user?.name || account.user?.email} (${account.subaccountCode})`)
    
    try {
      // Update subaccount percentage via Paystack API
      const response = await fetch(`https://api.paystack.co/subaccount/${account.subaccountCode}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          percentage_charge: 10 // Platform keeps 10%, seller gets 90%
        })
      })
      
      const result = await response.json()
      
      if (result.status) {
        console.log(`  ✅ Updated to 10% platform fee (seller gets 90%)`)
      } else {
        console.log(`  ❌ Failed: ${result.message}`)
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
    }
  }
  
  console.log('\n✅ Done!')
}

fixSubaccounts()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
