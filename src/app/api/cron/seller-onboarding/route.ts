import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import prisma from '@/lib/prisma'
import { sendSellerOnboardingEmail } from '@/lib/seller-onboarding-emails'
import { prismaErrorResponse } from '@/lib/prismaError'

// Days when onboarding emails should be sent
const ONBOARDING_DAYS = [1, 2, 3, 5, 7]

/**
 * GET /api/cron/seller-onboarding
 * 
 * Cron job to send seller onboarding emails to new sellers
 * Sends on days 1, 2, 3, 5, 7 after signup
 * 
 * Should be called daily by a cron service (e.g., Render cron, Vercel cron)
 * 
 * Authorization: Bearer <CRON_SECRET>
 * 
 * Example:
 * curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
 *   http://localhost:3000/api/cron/seller-onboarding
 */
export async function GET(request: NextRequest) {
  // Verify cron secret using unified auth
  const auth = await verifyCronSecret(request)
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.reason },
      { status: 401 }
    )
  }

  try {
    const now = new Date()
    const results: { day: number; sent: number; errors: number }[] = []

    for (const day of ONBOARDING_DAYS) {
      // Calculate the target signup date (users who signed up exactly `day` days ago)
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() - day)
      
      // Get start and end of that day
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)

      // Find sellers who:
      // 1. Signed up on the target date
      // 2. Have not unsubscribed from onboarding emails
      // 3. Have an email address
      const sellers = await prisma.user.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
          // User has at least one design (they're a seller)
          designs: {
            some: {},
          },
          // Has email
          email: {
            not: undefined,
          },
          // Not unsubscribed from emails (assuming this field exists or can be added)
          // emailPreferences: {
          //   onboarding: true,
          // },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })

      let sent = 0
      let errors = 0

      for (const seller of sellers) {
        if (!seller.email) continue
        
        try {
          const success = await sendSellerOnboardingEmail(
            {
              sellerId: seller.id,
              sellerName: seller.name || 'Designer',
              sellerEmail: seller.email,
            },
            day
          )
          
          if (success) {
            sent++
            console.log(`[Seller Onboarding] Day ${day} email sent to ${seller.email}`)
          }
        } catch (error) {
          errors++
          console.error(`[Seller Onboarding] Failed to send day ${day} email to ${seller.email}:`, error)
        }
      }

      results.push({ day, sent, errors })
    }

    // Also check for new sellers who just signed up (Day 0)
    // These get the welcome email immediately, but in case it was missed
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const newSellers = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: yesterday,
          lte: now,
        },
        // First design uploaded
        designs: {
          some: {},
        },
        email: {
          not: undefined,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      take: 100, // Limit to prevent overwhelming
    })

    // Log summary
    const totalSent = results.reduce((sum, r) => sum + r.sent, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0)

    return NextResponse.json({
      success: true,
      summary: {
        totalSent,
        totalErrors,
        newSellersFound: newSellers.length,
      },
      details: results,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('[Seller Onboarding Cron] Error:', error)
    
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    )
  }
}
