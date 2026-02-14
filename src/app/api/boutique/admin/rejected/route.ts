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
          thumbnailUrl: true,
          description: true,
          originalStock: true,
          currentStock: true,
          variants: {
            select: {
              id: true,
              quantity: true,
              size: true,
              color: true,
            },
          },
          media: {
            select: {
              id: true,
              url: true,
              type: true,
              sortOrder: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
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
            status: true,
          },
        })

        // Determine return status
        let returnStatus = 'none' // 'none' | 'in_progress' | 'completed'
        if (shipment) {
          if (['DELIVERED', 'RETURNED', 'COMPLETED', 'RESOLVED'].includes(shipment.status)) {
            returnStatus = 'completed'
          } else if (['PENDING', 'RETURN_SCHEDULED', 'SHIPPED', 'IN_TRANSIT'].includes(shipment.status)) {
            returnStatus = 'in_progress'
          }
        }

        // Calculate total quantity from variants
        const totalRejectedQty = product.variants?.reduce((sum, v) => sum + (v.quantity || 0), 0) || 0

        return {
          ...product,
          shipment,
          returnStatus,
          totalRejectedQty,
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
