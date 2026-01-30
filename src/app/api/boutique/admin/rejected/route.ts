import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    const where: Record<string, any> = {
      status: 'REJECTED',
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { 'seller.name': { contains: search, mode: 'insensitive' } },
        { 'seller.email': { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.boutiqueProduct.findMany({
        where,
        select: {
          id: true,
          title: true,
          basePrice: true,
          status: true,
          rejectionReason: true,
          rejectionDate: true,
          createdAt: true,
          seller: {
            select: { 
              id: true, 
              name: true, 
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.boutiqueProduct.count({ where }),
    ])

    // Get shipment details for each product if available
    const productsWithShipments = await Promise.all(
      products.map(async (product) => {
        const shipment = await prisma.sellerToAdminShipment.findFirst({
          where: {
            productIds: { has: product.id },
          },
          select: {
            id: true,
            itemsMissing: true,
            itemsDamaged: true,
            disputeNotes: true,
          },
        })

        return {
          ...product,
          shipment,
        }
      })
    )

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      products: productsWithShipments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Error fetching rejected products:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch rejected products' },
      { status: 500 }
    )
  }
}
