#!/usr/bin/env node
import 'dotenv/config.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyRepostStatus() {
  try {
    // Check the repost request
    const repostRequest = await prisma.boutiqueRepostRequest.findFirst({
      where: { productId: 'cmln27av3000196sxirez4hds' },
      include: {
        product: { select: { title: true, currentStock: true, isStockLocked: true } },
        seller: { select: { email: true } }
      }
    })

    if (repostRequest) {
      console.log('✅ Repost Request Found:')
      console.log('  Status:', repostRequest.status)
      console.log('  Created:', repostRequest.createdAt.toLocaleString())
      console.log('  Seller:', repostRequest.seller.email)
      console.log('  Product:', repostRequest.product.title)
      console.log('  Original Stock:', repostRequest.originalStock)
      console.log('  Requested Stock:', repostRequest.requestedStock)
      console.log('  Approved Stock:', repostRequest.approvedStock || 'N/A')
      console.log('  Review Status:', repostRequest.status === 'PENDING' ? '⏳ Awaiting admin approval' : '✅ Approved!')
      
      if (repostRequest.status === 'APPROVED') {
        console.log('\n🎉 Repost Approval Successful!')
        console.log('  - Stock has been deducted')
        console.log('  - 180-day countdown reset')
        console.log('  - Product remains LIVE')
      }
    } else {
      console.log('⏳ No repost request found yet - submit one first')
    }

    // Check product status
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: 'cmln27av3000196sxirez4hds' },
      select: { 
        title: true,
        currentStock: true,
        isStockLocked: true,
        lastRepostDate: true,
        repostCount: true,
        status: true
      }
    })

    if (product) {
      console.log('\n✅ Product Status:')
      console.log('  Title:', product.title)
      console.log('  Current Stock:', product.currentStock)
      console.log('  Stock Locked:', product.isStockLocked ? 'Yes' : 'No')
      console.log('  Status:', product.status)
      console.log('  Repost Count:', product.repostCount)
      console.log('  Last Repost:', product.lastRepostDate ? new Date(product.lastRepostDate).toLocaleString() : 'Never')
    }
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

verifyRepostStatus()
