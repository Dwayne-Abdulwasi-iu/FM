#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixFeaturedPrices() {
  try {
    console.log('🔍 Finding all featured boutique products...')
    
    const featuredItems = await prisma.adminFeaturedItem.findMany({
      where: { itemType: 'BOUTIQUE_PRODUCT' },
      include: {
        // We'll fetch the product separately
      }
    })

    console.log(`Found ${featuredItems.length} featured boutique products`)

    const issues = []

    for (const item of featuredItems) {
      const product = await prisma.boutiqueProduct.findUnique({
        where: { id: item.itemId },
        select: { 
          id: true, 
          title: true, 
          slug: true,
          basePrice: true,
          submittedPrice: true,
          submittedCurrency: true
        }
      })

      if (!product) {
        console.warn(`⚠️  Product ${item.itemId} not found`)
        continue
      }

      console.log(`\n📦 ${product.title}`)
      console.log(`   Slug: ${product.slug}`)
      console.log(`   Base Price: ₦${product.basePrice.toLocaleString()}`)
      console.log(`   Submitted Price: ${product.submittedPrice ? `${product.submittedPrice} ${product.submittedCurrency || 'NGN'}` : 'not set'}`)

      // Check if price looks suspicious (extremely high)
      if (product.basePrice > 500000) {
        issues.push({
          id: product.id,
          title: product.title,
          currentPrice: product.basePrice,
          slug: product.slug
        })
        console.log(`   ⚠️  SUSPICIOUS: Price is very high (₦${product.basePrice.toLocaleString()})`)
      }
    }

    if (issues.length > 0) {
      console.log(`\n\n🚨 Found ${issues.length} products with suspicious prices:`)
      issues.forEach((p, i) => {
        console.log(`${i + 1}. ${p.title} (${p.slug}) - ₦${p.currentPrice.toLocaleString()}`)
      })

      console.log('\n💡 Manual check required - please verify these prices in the database')
      console.log('   Check the product detail page to see the correct price')
      console.log('   Then update the basePrice field in the BoutiqueProduct table')
    } else {
      console.log('\n✅ All featured products have reasonable prices')
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixFeaturedPrices()
