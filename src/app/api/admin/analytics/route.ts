import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - days)

    const previousPeriodStart = new Date(dateFrom)
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days)

    // Overview Stats
    const [
      totalRevenue,
      previousRevenue,
      totalOrders,
      previousOrders,
      totalUsers,
      previousUsers,
      totalSellers,
      totalDesigns,
      platformEarnings,
    ] = await Promise.all([
      // Current period revenue
      prisma.order.aggregate({
        where: {
          status: { in: ['PAID', 'COMPLETED'] },
          createdAt: { gte: dateFrom },
        },
        _sum: { totalAmount: true },
      }),
      // Previous period revenue
      prisma.order.aggregate({
        where: {
          status: { in: ['PAID', 'COMPLETED'] },
          createdAt: { gte: previousPeriodStart, lt: dateFrom },
        },
        _sum: { totalAmount: true },
      }),
      // Current period orders
      prisma.order.count({
        where: { createdAt: { gte: dateFrom } },
      }),
      // Previous period orders
      prisma.order.count({
        where: { createdAt: { gte: previousPeriodStart, lt: dateFrom } },
      }),
      // Current users
      prisma.user.count({
        where: { createdAt: { gte: dateFrom } },
      }),
      // Previous users
      prisma.user.count({
        where: { createdAt: { gte: previousPeriodStart, lt: dateFrom } },
      }),
      // Total sellers
      prisma.user.count({
        where: { role: 'SELLER' },
      }),
      // Total designs
      prisma.design.count(),
      // Platform earnings
      prisma.order.aggregate({
        where: {
          status: { in: ['PAID', 'COMPLETED'] },
          createdAt: { gte: dateFrom },
        },
        _sum: { platformFee: true },
      }),
    ])

    // Calculate percentage changes
    const currentRev = totalRevenue._sum.totalAmount || 0
    const prevRev = previousRevenue._sum.totalAmount || 0
    const revenueChange = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : 0

    const ordersChange = previousOrders > 0 ? ((totalOrders - previousOrders) / previousOrders) * 100 : 0
    const usersChange = previousUsers > 0 ? ((totalUsers - previousUsers) / previousUsers) * 100 : 0

    // Top selling designs
    const topDesignsRaw = await prisma.orderItem.groupBy({
      by: ['designId'],
      where: {
        order: {
          status: { in: ['PAID', 'COMPLETED'] },
          createdAt: { gte: dateFrom },
        },
      },
      _count: { designId: true },
      _sum: { price: true },
      orderBy: { _sum: { price: 'desc' } },
      take: 5,
    })

    const topDesignIds = topDesignsRaw.map((d) => d.designId).filter(Boolean) as string[]
    const topDesignDetails = await prisma.design.findMany({
      where: { id: { in: topDesignIds } },
      select: {
        id: true,
        title: true,
        designer: { select: { name: true } },
      },
    })

    const topDesigns = topDesignsRaw.map((d) => {
      const design = topDesignDetails.find((dd) => dd.id === d.designId)
      return {
        id: d.designId || '',
        title: design?.title || 'Unknown',
        sales: d._count.designId,
        revenue: d._sum.price || 0,
        designer: design?.designer?.name || 'Unknown',
      }
    })

    // Top sellers
    const topSellersRaw = await prisma.sellerEarning.groupBy({
      by: ['sellerId'],
      where: { createdAt: { gte: dateFrom } },
      _count: { id: true },
      _sum: { sellerAmount: true },
      orderBy: { _sum: { sellerAmount: 'desc' } },
      take: 5,
    })

    const topSellerIds = topSellersRaw.map((s) => s.sellerId)
    const topSellerDetails = await prisma.user.findMany({
      where: { id: { in: topSellerIds } },
      select: {
        id: true,
        name: true,
        email: true,
        _count: { select: { designs: true } },
      },
    })

    const topSellers = topSellersRaw.map((s) => {
      const seller = topSellerDetails.find((sd) => sd.id === s.sellerId)
      return {
        id: s.sellerId,
        name: seller?.name || null,
        email: seller?.email || '',
        sales: s._count?.id || 0,
        revenue: s._sum?.sellerAmount || 0,
        designs: seller?._count.designs || 0,
      }
    })

    // Orders by status
    const ordersByStatusRaw = await prisma.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte: dateFrom } },
      _count: { id: true },
    })

    const ordersByStatus = ordersByStatusRaw.map((o) => ({
      status: o.status,
      count: o._count.id,
    }))

    // Revenue by category
    const revenueByCategoryRaw = await prisma.orderItem.groupBy({
      by: ['designId'],
      where: {
        order: {
          status: { in: ['PAID', 'COMPLETED'] },
          createdAt: { gte: dateFrom },
        },
      },
      _sum: { price: true },
      _count: { id: true },
    })

    // Get category for each design
    const designIdsForCategory = revenueByCategoryRaw.map((r) => r.designId).filter(Boolean) as string[]
    const designCategories = await prisma.design.findMany({
      where: { id: { in: designIdsForCategory } },
      select: { id: true, category: true },
    })

    const categoryMap = new Map<string, { revenue: number; count: number }>()
    revenueByCategoryRaw.forEach((item) => {
      const design = designCategories.find((d) => d.id === item.designId)
      const category = design?.category || 'Uncategorized'
      const existing = categoryMap.get(category) || { revenue: 0, count: 0 }
      categoryMap.set(category, {
        revenue: existing.revenue + (item._sum.price || 0),
        count: existing.count + item._count.id,
      })
    })

    const revenueByCategory = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        revenue: data.revenue,
        count: data.count,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Total users count
    const allUsersCount = await prisma.user.count()

    return NextResponse.json({
      overview: {
        totalRevenue: currentRev,
        platformEarnings: platformEarnings._sum.platformFee || 0,
        totalOrders,
        totalUsers: allUsersCount,
        totalSellers,
        totalDesigns,
        revenueChange,
        ordersChange,
        usersChange,
      },
      topDesigns,
      topSellers,
      ordersByStatus,
      revenueByCategory,
      daily: [], // Could add daily breakdown if needed
      userGrowth: [], // Could add user growth if needed
    })
  } catch (error) {
    console.error('Failed to fetch analytics:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
