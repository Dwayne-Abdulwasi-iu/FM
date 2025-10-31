import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's design statistics
    const [designsCount, ordersData, sellerEarnings] = await Promise.all([
      // Total designs uploaded by user
      prisma.design.count({
        where: { designerId: session.user.id }
      }),
      
      // Sales data from orders
      prisma.orderItem.findMany({
        where: {
          design: {
            designerId: session.user.id
          }
        },
        include: {
          order: {
            select: {
              totalAmount: true,
              createdAt: true
            }
          }
        }
      }),

      // Seller earnings
      prisma.sellerEarning.findMany({
        where: {
          sellerId: session.user.id
        },
        select: {
          sellerAmount: true,
          platformCommission: true,
          createdAt: true
        }
      })
    ])

  // Calculate stats
  const totalSales = ordersData.length
  // Narrow the incoming shapes from Prisma for safer reductions
  type OrderItemShape = { order: { totalAmount: number } }
  type SellerEarningShape = { sellerAmount: number; platformCommission: number; createdAt: string | Date }

  const totalRevenue = (ordersData as OrderItemShape[]).reduce((sum, orderItem) => sum + (orderItem.order?.totalAmount ?? 0), 0)
  const totalEarnings = (sellerEarnings as SellerEarningShape[]).reduce((sum, earning) => sum + (earning.sellerAmount ?? 0), 0)
  const platformCommission = (sellerEarnings as SellerEarningShape[]).reduce((sum, earning) => sum + (earning.platformCommission ?? 0), 0)

    // Calculate monthly earnings for the chart
    const currentDate = new Date()
    const monthlyEarnings = []
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1)
      
      const monthEarnings = (sellerEarnings as SellerEarningShape[])
        .filter((earning) => {
          const earningDate = new Date(earning.createdAt)
          return earningDate >= month && earningDate < nextMonth
        })
        .reduce((sum, earning) => sum + (earning.sellerAmount ?? 0), 0)

      monthlyEarnings.push({
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        earnings: monthEarnings
      })
    }

    const stats = {
      totalDesigns: designsCount,
      totalSales,
      totalRevenue,
      totalEarnings,
      platformCommission,
      monthlyEarnings
    }

    return NextResponse.json({ stats })

  } catch (error) {
    void error
    console.error('Profile stats error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}