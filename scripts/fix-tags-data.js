/**
 * Fix Tags Data Type
 * 
 * This script fixes designs where 'tags' was incorrectly stored as an array
 * instead of a string.
 * 
 * Run with: node scripts/fix-tags-data.js
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

async function fixTags() {
  console.log('🔧 Fixing tags data type issues...\n')
  
  try {
    // Find designs with array tags using raw MongoDB command
    const result = await prisma.$runCommandRaw({
      find: 'designs',
      filter: { tags: { $type: 'array' } }
    })
    
    const designs = result.cursor?.firstBatch || []
    console.log(`Found ${designs.length} designs with array tags\n`)
    
    for (const design of designs) {
      const newTags = Array.isArray(design.tags) ? design.tags.join(', ') : (design.tags || '')
      console.log(`Fixing: ${design.title} (${design._id})`)
      console.log(`  Old: ${JSON.stringify(design.tags)} -> New: "${newTags}"`)
      
      await prisma.$runCommandRaw({
        update: 'designs',
        updates: [{
          q: { _id: design._id },
          u: { $set: { tags: newTags } }
        }]
      })
    }
    
    if (designs.length > 0) {
      console.log('\n✅ Fixed all designs!')
    } else {
      console.log('✅ No designs needed fixing.')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixTags()
