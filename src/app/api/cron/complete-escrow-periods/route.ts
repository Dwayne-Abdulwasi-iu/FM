import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { ESCROW_PERIOD_MS, completeEscrowPeriod } from '@/lib/ownership-escrow'

/**
 * GET /api/cron/complete-escrow-periods
 * Mark ownership contracts as COMPLETED after escrow period expires (7 days)
 * Should be called daily via Vercel Cron
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if set
    const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '')
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find all SIGNED contracts where escrow period has expired
    const now = new Date()
    const escrowExpiredBefore = new Date(now.getTime() - ESCROW_PERIOD_MS)

    const expiredContracts = await prisma.ownershipContract.findMany({
      where: {
        status: 'SIGNED',
        purchaseDate: {
          lt: escrowExpiredBefore
        }
      },
      include: {
        buyer: {
          select: {
            email: true,
            name: true
          }
        },
        ownershipDocument: {
          select: {
            design: {
              select: {
                title: true
              }
            }
          }
        }
      }
    })

    if (expiredContracts.length === 0) {
      return NextResponse.json({
        message: 'No expired escrow periods to complete',
        completedCount: 0,
        timestamp: new Date().toISOString()
      })
    }

    // FLAW FIX #15: Use atomic transaction version for each contract
    const results: { contractNumber: string; success: boolean; error?: string }[] = []
    
    for (const contract of expiredContracts) {
      try {
        const purchase = await prisma.purchase.findUnique({
          where: { id: contract.purchaseId }
        })
        
        if (purchase) {
          // Use atomic completeEscrowPeriod function
          await completeEscrowPeriod(purchase.id)
          results.push({
            contractNumber: contract.contractNumber,
            success: true
          })
        }
      } catch (error) {
        console.error(`Failed to complete escrow for contract ${contract.contractNumber}:`, error)
        results.push({
          contractNumber: contract.contractNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log(`[Escrow Cron] Completed ${results.filter(r => r.success).length}/${results.length} escrow periods atomically`)

    // Send completion emails only to successfully completed contracts
    const { sendEmail } = await import('@/lib/email')
    
    for (const contract of expiredContracts) {
      const completed = results.find(r => r.contractNumber === contract.contractNumber)?.success
      if (!completed) continue
      
      try {
        const designTitle = contract.ownershipDocument?.design?.title || 'Your Design'
        await sendEmail({
          to: contract.buyer.email,
          subject: `Ownership Transfer Complete: ${designTitle}`,
          html: `
            <h2>Design Ownership Transfer Complete</h2>
            <p>Hi ${contract.buyer.name || 'Buyer'},</p>
            <p>The 7-day inspection period for <strong>${designTitle}</strong> has expired.</p>
            <p>You now have permanent, exclusive ownership of this design. The transfer is complete and irreversible.</p>
            <p><strong>Contract Number:</strong> ${contract.contractNumber}</p>
            <p>You can download and print your ownership certificate at any time from your dashboard.</p>
            <hr />
            <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
          `
        })
      } catch (emailError) {
        console.error(`Failed to send escrow completion email to ${contract.buyer.email}:`, emailError)
        // Don't fail the cron if email fails
      }
    }

    return NextResponse.json({
      message: `Successfully completed ${results.filter(r => r.success).length}/${results.length} escrow periods atomically`,
      completedCount: results.filter(r => r.success).length,
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Escrow Cron] Error completing escrow periods:', error)

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        {
          message: 'Database error',
          error: error.message,
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        message: 'Failed to complete escrow periods',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
