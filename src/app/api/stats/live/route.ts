import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/stats/live - Get live platform statistics for social proof
 * Public endpoint - no auth required
 */
export async function GET() {
  try {
    // Get real counts from database
    const [
      designerCount,
      designCount,
      orderCount,
      totalEarnings,
    ] = await Promise.all([
      // Active designers (users who have uploaded at least one design)
      prisma.user.count({
        where: {
          designs: {
            some: {
              approvalStatus: 'APPROVED'
            }
          }
        }
      }),
      // Total approved designs
      prisma.design.count({
        where: { approvalStatus: 'APPROVED' }
      }),
      // Total completed orders (designs sold)
      prisma.orderItem.count({
        where: {
          order: {
            status: 'COMPLETED'
          }
        }
      }),
      // Total earnings by designers
      prisma.sellerEarning.aggregate({
        _sum: {
          sellerAmount: true
        },
      }),
    ])

    const earnings = totalEarnings._sum?.sellerAmount || 0
    const countries = 50 // Estimate - can be tracked via analytics in production

    // Format numbers with appropriate suffixes
    const formatNumber = (num: number): string => {
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M+`
      if (num >= 1000) return `${(num / 1000).toFixed(0)}K+`
      return `${num}+`
    }

    const formatCurrency = (amount: number): string => {
      if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M+`
      if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K+`
      return `$${amount.toFixed(0)}+`
    }

    return NextResponse.json({
      stats: [
        { 
          number: formatNumber(designerCount), 
          label: 'Active Designers',
          raw: designerCount 
        },
        { 
          number: formatNumber(orderCount), 
          label: 'Designs Sold',
          raw: orderCount 
        },
        { 
          number: `${countries}+`, 
          label: 'Countries',
          raw: countries 
        },
        { 
          number: formatCurrency(earnings), 
          label: 'Earned by Designers',
          raw: earnings 
        }
      ],
      // Additional stats for detailed views
      details: {
        totalDesigns: designCount,
        activeDesigners: designerCount,
        designsSold: orderCount,
        totalEarnings: earnings,
        countriesReached: countries
      },
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching live stats:', error)
    // Return fallback stats on error
    return NextResponse.json({
      stats: [
        { number: '1,000+', label: 'Active Designers', raw: 1000 },
        { number: '5,000+', label: 'Designs Sold', raw: 5000 },
        { number: '50+', label: 'Countries', raw: 50 },
        { number: '$100K+', label: 'Earned by Designers', raw: 100000 }
      ],
      details: null,
      updatedAt: new Date().toISOString(),
      fallback: true
    })
  }
}
