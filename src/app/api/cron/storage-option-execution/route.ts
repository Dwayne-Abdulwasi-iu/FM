import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendLiquidationStartedEmail, sendReturnProcessingEmail } from '@/lib/emails/boutique'

/**
 * Cron job to execute storage options at day 180
 * Runs daily at 00:00 UTC
 * 
 * Actions:
 * - FULL_RETURN: Mark for return, generate return label
 * - PARTIAL_LIQUIDATION: Mark as LIQUIDATED, set 50% off price, track sale
 * - FLEXIBLE_STORAGE: Check if still paid, extend or liquidate
 */
export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedAuth) {
    console.warn('Invalid CRON_SECRET attempt to storage-option-execution')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let processed = 0
    let errors = 0

    // ========== LIQUIDATION EXECUTION ==========
    // Products that chose liquidation and expired today
    const productsToLiquidate = await prisma.boutiqueProduct.findMany({
      where: {
        storageOption: 'PARTIAL_LIQUIDATION',
        warehouseExpiresAt: { lte: today },
        liquidationStartedAt: null,
      },
      include: { seller: true },
    })

    for (const product of productsToLiquidate) {
      try {
        const liquidationPrice = product.basePrice * 0.5

        await prisma.boutiqueProduct.update({
          where: { id: product.id },
          data: {
            status: 'LIQUIDATED',
            liquidationEnabled: true,
            liquidationStartedAt: today,
            salePrice: liquidationPrice,
          },
        })

        // Send email to seller
        await sendLiquidationStartedEmail(
          product.seller.email || '',
          product.title,
          liquidationPrice
        )

        processed++
      } catch (error) {
        console.error(`Failed to liquidate product ${product.id}:`, error)
        errors++
      }
    }

    // ========== RETURN PROCESSING ==========
    // Products that chose full return and expired
    const productsToReturn = await prisma.boutiqueProduct.findMany({
      where: {
        storageOption: 'FULL_RETURN',
        warehouseExpiresAt: { lte: today },
        fullReturnEnabled: false,
      },
      include: { seller: true },
    })

    for (const product of productsToReturn) {
      try {
        // Mark as ready for return
        const _updatedProduct = await prisma.boutiqueProduct.update({
          where: { id: product.id },
          data: {
            fullReturnEnabled: true,
            returnRequestedAt: today,
            status: 'RETURNED_TO_SELLER',
          },
        })

        // Send email to seller confirming return is processing
        await sendReturnProcessingEmail(
          product.seller.email || '',
          product.title,
          product.id // Use product ID as shipment reference
        )

        processed++
      } catch (error) {
        console.error(`Failed to process return for product ${product.id}:`, error)
        errors++
      }
    }

    // ========== FLEXIBLE STORAGE CHECK ==========
    // Products with flexible storage that need to check payment status
    const flexibleStorageProducts = await prisma.boutiqueProduct.findMany({
      where: {
        storageOption: 'FLEXIBLE_STORAGE',
        flexibleStorageEnabled: true,
        warehouseExpiresAt: { lte: today },
      },
      include: { seller: true },
    })

    for (const product of flexibleStorageProducts) {
      try {
        // Check if seller paid for extension
        if (!product.storagePaidUntil || new Date(product.storagePaidUntil) < today) {
          // No payment, convert to liquidation
          const liquidationPrice = product.basePrice * 0.5

          await prisma.boutiqueProduct.update({
            where: { id: product.id },
            data: {
              status: 'LIQUIDATED',
              liquidationEnabled: true,
              liquidationStartedAt: today,
              salePrice: liquidationPrice,
              flexibleStorageEnabled: false,
            },
          })

          processed++
        } else {
          // Payment found, extend warehouse timeline
          const newExpirationDate = new Date(product.warehouseExpiresAt!)
          newExpirationDate.setDate(newExpirationDate.getDate() + 30)

          await prisma.boutiqueProduct.update({
            where: { id: product.id },
            data: {
              warehouseExpiresAt: newExpirationDate,
              storageExtensionCount: (product.storageExtensionCount || 0) + 1,
            },
          })

          processed++
        }
      } catch (error) {
        console.error(`Failed to process flexible storage for product ${product.id}:`, error)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      errors,
      message: `Storage options executed: ${processed} products updated, ${errors} errors`,
    })
  } catch (error) {
    console.error('Fatal error in storage-option-execution cron:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 })
  }
}
