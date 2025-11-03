import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

type PurchaseWhere = {
  purchaseType: 'OWNERSHIP'
  user?: { OR: Array<{ name?: { contains: string; mode: 'insensitive' }; email?: { contains: string; mode: 'insensitive' } }> }
  design?: { designer: { OR: Array<{ name?: { contains: string; mode: 'insensitive' }; email?: { contains: string; mode: 'insensitive' } }> } }
  createdAt?: { gte?: Date; lte?: Date }
  purchasePrice?: { gte?: number; lte?: number }
  order?: { orderNumber: { contains: string; mode: 'insensitive' } }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const buyer = (url.searchParams.get('buyer') || '').trim()
    const seller = (url.searchParams.get('seller') || '').trim()
    const from = url.searchParams.get('from') || ''
    const to = url.searchParams.get('to') || ''
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10) || 1, 1)
    const pageSize = Math.min(Math.max(parseInt(url.searchParams.get('pageSize') || '50', 10) || 50, 1), 200)
    const sortBy = (url.searchParams.get('sortBy') || 'date') as 'date' | 'price' | 'buyer' | 'seller' | 'title'
    const sortOrder = ((url.searchParams.get('sortOrder') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
  const minPrice = url.searchParams.get('minPrice')
  const maxPrice = url.searchParams.get('maxPrice')
  const orderQuery = (url.searchParams.get('order') || '').trim()

  const where: PurchaseWhere = { purchaseType: 'OWNERSHIP' }

    if (buyer) {
      where.user = {
        OR: [
          { name: { contains: buyer, mode: 'insensitive' } },
          { email: { contains: buyer, mode: 'insensitive' } },
        ],
      }
    }

    if (seller) {
      where.design = {
        designer: {
          OR: [
            { name: { contains: seller, mode: 'insensitive' } },
            { email: { contains: seller, mode: 'insensitive' } },
          ],
        },
      }
    }

    if (orderQuery) {
      where.order = {
        orderNumber: { contains: orderQuery, mode: 'insensitive' }
      }
    }

    if (from || to) {
      const createdAt: { gte?: Date; lte?: Date } = {}
      if (from) createdAt.gte = new Date(from + 'T00:00:00.000Z')
      if (to) createdAt.lte = new Date(to + 'T23:59:59.999Z')
      where.createdAt = createdAt
    }

    if (minPrice || maxPrice) {
      const priceFilter: { gte?: number; lte?: number } = {}
      const min = minPrice ? parseFloat(minPrice) : NaN
      const max = maxPrice ? parseFloat(maxPrice) : NaN
      if (!Number.isNaN(min)) priceFilter.gte = min
      if (!Number.isNaN(max)) priceFilter.lte = max
      if (priceFilter.gte !== undefined || priceFilter.lte !== undefined) {
        where.purchasePrice = priceFilter
      }
    }

    // Map sort fields to Prisma orderBy
    const orderBy = (() => {
      switch (sortBy) {
        case 'price':
          return { purchasePrice: sortOrder }
        case 'buyer':
          return { user: { name: sortOrder } }
        case 'seller':
          return { design: { designer: { name: sortOrder } } }
        case 'title':
          return { design: { title: sortOrder } }
        case 'date':
        default:
          return { createdAt: sortOrder }
      }
    })()

    const [total, purchases] = await Promise.all([
      prisma.purchase.count({ where }),
      prisma.purchase.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, name: true, email: true } },
          design: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              isActive: true,
              ownedBy: true,
              designer: { select: { id: true, name: true, email: true } }
            }
          },
        }
      })
    ])

    // Fetch orders map to include orderNumber and createdAt
    const orderIds = Array.from(new Set(purchases.map(p => p.orderId))).filter(Boolean)
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds as string[] } },
      select: { id: true, orderNumber: true, createdAt: true }
    })
    const orderMap = new Map(orders.map(o => [o.id, o]))

    const exclusiveSales = purchases.map(p => ({
      id: p.id,
      createdAt: p.createdAt,
      purchasePrice: p.purchasePrice,
      buyer: p.user,
      design: p.design,
      order: orderMap.get(p.orderId) || null,
    }))

    return NextResponse.json({ exclusiveSales, meta: { total, page, pageSize } })
  } catch (error) {
    console.error('Error fetching exclusive sales:', error)
    return NextResponse.json({ error: 'Failed to fetch exclusive sales' }, { status: 500 })
  }
}
