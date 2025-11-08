import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import type { Prisma } from '@prisma/client'

type OrderSortBy = 'date' | 'total' | 'customer' | 'orderNumber'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const buyer = (url.searchParams.get('buyer') || '').trim() // customer name/email contains
    const orderNum = (url.searchParams.get('order') || '').trim()
    const status = (url.searchParams.get('status') || '').trim().toUpperCase() // PENDING|COMPLETED|FAILED
    const from = url.searchParams.get('from') || ''
    const to = url.searchParams.get('to') || ''
    const minTotal = url.searchParams.get('minTotal')
    const maxTotal = url.searchParams.get('maxTotal')
    const purchaseType = (url.searchParams.get('purchaseType') || '').trim().toUpperCase() // REGULAR|OWNERSHIP or empty
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10) || 1, 1)
    const pageSize = Math.min(Math.max(parseInt(url.searchParams.get('pageSize') || '50', 10) || 50, 1), 200)
    const sortBy = (url.searchParams.get('sortBy') || 'date') as OrderSortBy
    const sortOrder = ((url.searchParams.get('sortOrder') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'

  const where: Prisma.OrderWhereInput = {}

    if (buyer) {
      where.customer = {
        OR: [
          { name: { contains: buyer, mode: 'insensitive' } },
          { email: { contains: buyer, mode: 'insensitive' } },
        ],
      }
    }

    if (orderNum) {
      where.orderNumber = { contains: orderNum, mode: 'insensitive' }
    }

    if (status) {
      where.status = status
    }

    if (from || to) {
      const createdAt: { gte?: Date; lte?: Date } = {}
      if (from) createdAt.gte = new Date(from + 'T00:00:00.000Z')
      if (to) createdAt.lte = new Date(to + 'T23:59:59.999Z')
      where.createdAt = createdAt
    }

    if (minTotal || maxTotal) {
      const totalFilter: { gte?: number; lte?: number } = {}
      const min = minTotal ? parseFloat(minTotal) : NaN
      const max = maxTotal ? parseFloat(maxTotal) : NaN
      if (!Number.isNaN(min)) totalFilter.gte = min
      if (!Number.isNaN(max)) totalFilter.lte = max
      if (totalFilter.gte !== undefined || totalFilter.lte !== undefined) {
        where.totalAmount = totalFilter
      }
    }

    // Filter by any order containing items with the given purchaseType
    if (purchaseType === 'REGULAR' || purchaseType === 'OWNERSHIP') {
      where.items = { some: { purchaseType } }
    }

    // Map sort fields to Prisma orderBy
    const orderBy = (() => {
      switch (sortBy) {
        case 'total':
          return { totalAmount: sortOrder }
        case 'customer':
          return { customer: { name: sortOrder } }
        case 'orderNumber':
          return { orderNumber: sortOrder }
        case 'date':
        default:
          return { createdAt: sortOrder }
      }
    })()

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          customer: {
            select: {
              name: true,
              email: true
            }
          },
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              purchaseType: true,
              design: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }
        }
      })
    ])

    return NextResponse.json({ orders, meta: { total, page, pageSize } })
  } catch (error) {
    console.error('Error fetching orders:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable, please try again later.')
    if (prismaResp) return prismaResp
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}