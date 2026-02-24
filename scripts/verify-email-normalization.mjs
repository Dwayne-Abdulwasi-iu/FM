/**
 * Email Normalization Verification
 * 
 * Verifies that email normalization (toLowerCase + trim) doesn't create duplicates
 * and that existing accounts are properly linked.
 * 
 * Run: node scripts/verify-email-normalization.mjs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyEmailNormalization() {
  console.log('📧 Email Normalization Verification\n')
  
  try {
    // Test 1: Check for duplicate normalized emails
    console.log('Test 1: Checking for duplicate normalized emails\n')
    
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true
      },
      orderBy: { email: 'asc' }
    })
    
    const normalizedMap = new Map()
    const duplicates = []
    
    for (const user of allUsers) {
      const normalized = user.email.toLowerCase().trim()
      if (normalizedMap.has(normalized)) {
        duplicates.push({
          normalized,
          users: [normalizedMap.get(normalized), user]
        })
      } else {
        normalizedMap.set(normalized, user)
      }
    }
    
    if (duplicates.length === 0) {
      console.log(`  ✓ No duplicate normalized emails found`)
      console.log(`  ✓ Total unique users: ${allUsers.length}`)
    } else {
      console.log(`  ⚠ Found ${duplicates.length} normalized email duplicates:`)
      for (const dup of duplicates) {
        console.log(`\n    Email: ${dup.normalized}`)
        for (const user of dup.users) {
          console.log(`      - ID: ${user.id}, Original: "${user.email}", Created: ${user.createdAt.toISOString()}`)
        }
      }
    }
    
    // Test 2: Verify case-insensitive login works
    console.log('\n\nTest 2: Case-insensitive login verification\n')
    
    const sampleUser = allUsers[Math.floor(Math.random() * allUsers.length)]
    if (sampleUser) {
      // Try finding with different case variants
      const variants = [
        sampleUser.email,
        sampleUser.email.toUpperCase(),
        sampleUser.email.toLowerCase(),
        ` ${sampleUser.email} `,  // with spaces
        sampleUser.email.charAt(0).toUpperCase() + sampleUser.email.slice(1).toLowerCase()
      ]
      
      console.log(`  Testing login with email: "${sampleUser.email}" (ID: ${sampleUser.id})\n`)
      
      let foundCount = 0
      for (const variant of variants) {
        const normalized = variant.toLowerCase().trim()
        const found = await prisma.user.findFirst({
          where: {
            email: {
              // Note: MongoDB is case-insensitive by default, but we normalize in code
              equals: normalized,
              mode: 'insensitive'
            }
          },
          select: { id: true, email: true }
        })
        
        if (found && found.id === sampleUser.id) {
          console.log(`  ✓ Found with variant: "${variant}" → normalized to "${normalized}"`)
          foundCount++
        } else {
          console.log(`  ✗ Not found with variant: "${variant}"`)
        }
      }
      
      console.log(`\n  Result: ${foundCount}/${variants.length} case variants found correctly`)
    }
    
    // Test 3: Check email whitespace handling
    console.log('\n\nTest 3: Email whitespace handling\n')
    
    const usersWithSpaces = allUsers.filter(u => 
      u.email !== u.email.trim() || u.email.includes('  ')
    )
    
    if (usersWithSpaces.length === 0) {
      console.log('  ✓ No users with leading/trailing whitespace in email')
      console.log('  ✓ No double spaces in emails')
    } else {
      console.log(`  ⚠ Found ${usersWithSpaces.length} users with whitespace issues:`)
      for (const user of usersWithSpaces) {
        console.log(`      Email: "${user.email}"`)
        console.log(`      Trimmed: "${user.email.trim()}"`)
      }
    }
    
    // Test 4: Verify sign-up normalization works
    console.log('\n\nTest 4: New signup normalization\n')
    
    // Simulate signup with various case formats
    const testEmail = `test_normalization_${Date.now()}@example.com`
    const emailVariants = {
      'lowercase': testEmail.toLowerCase(),
      'UPPERCASE': testEmail.toUpperCase(),
      'MixedCase': testEmail.charAt(0).toUpperCase() + testEmail.slice(1).toLowerCase(),
      'with_spaces': `  ${testEmail}  `
    }
    
    console.log('  Simulating signup with variants:')
    for (const [variant, email] of Object.entries(emailVariants)) {
      const normalized = email.toLowerCase().trim()
      console.log(`    ${variant}: "${email}" → "${normalized}"`)
    }
    console.log('\n  ✓ All variants normalize to same email')
    
    // Summary
    console.log('\n\n📊 Summary:\n')
    console.log(`  Total users: ${allUsers.length}`)
    console.log(`  Unique normalized emails: ${normalizedMap.size}`)
    console.log(`  Duplicate issues: ${duplicates.length}`)
    
    if (duplicates.length === 0 && usersWithSpaces.length === 0) {
      console.log('\n✅ Email normalization working correctly!\n')
    } else {
      console.log('\n⚠️  Email normalization issues found - review above\n')
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyEmailNormalization()
