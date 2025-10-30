import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get stats
    const [
      totalUsers,
      totalDesigns,
      totalOrders,
      totalRevenue,
      platformEarnings,
      activeUsers,
      recentSignups
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Total designs
      prisma.design.count(),
      
      // Total orders
      prisma.order.count(),
      
      // Total revenue
      prisma.order.aggregate({
        _sum: {
          totalAmount: true,
        },
      }),
      
      // Platform earnings (5% commission)
      prisma.order.aggregate({
        _sum: {
          platformFee: true,
        },
      }),
      
      // Active users (users with designs)
      prisma.user.count({
        where: {
          designs: {
            some: {}
          }
        }
      }),
      
      // Recent signups (last 7 days)
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ])

    const stats = {
      totalUsers,
      totalDesigns,
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      platformEarnings: platformEarnings._sum.platformFee || 0,
      activeUsers,
      recentSignups
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}