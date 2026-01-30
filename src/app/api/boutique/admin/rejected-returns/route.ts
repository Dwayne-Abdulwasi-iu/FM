import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
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

    // Build search filter
    const searchFilter: Prisma.BoutiqueProductWhereInput | undefined = search
      ? {
          OR: [
            { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { seller: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
            { id: { contains: search } },
          ],
        }
      : undefined

    // Fetch rejected products that are in return workflow
    const products = await prisma.boutiqueProduct.findMany({
      where: {
        ...(searchFilter || {}),
        status: {
          in: ['RETURN_IN_PROGRESS', 'SELLER_RECEIVED', 'ADMIN_CONFIRMED', 'RETURNED_SUCCESSFUL'],
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        thumbnailUrl: true,
        basePrice: true,
        rejectionReason: true,
        createdAt: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    // Fetch shipments for these products
    const productIds = products.map(p => p.id)
    const shipments = await prisma.sellerToAdminShipment.findMany({
      where: {
        productIds: {
          hasSome: productIds,
        },
      },
      select: {
        id: true,
        productIds: true,
        status: true,
        createdAt: true,
        itemsExpected: true,
        itemsReceived: true,
        disputeNotes: true,
      },
    })

    // Map shipments to products
    const productsWithShipments = products.map(product => ({
      ...product,
      shipment: shipments.find(s => s.productIds.includes(product.id)),
    }))

    // Get total count
    const total = await prisma.boutiqueProduct.count({
      where: {
        status: {
          in: ['RETURN_IN_PROGRESS', 'SELLER_RECEIVED', 'ADMIN_CONFIRMED', 'RETURNED_SUCCESSFUL'],
        },
        ...searchFilter,
      },
    })

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      products: productsWithShipments,
      total,
      totalPages,
      page,
    })
  } catch (error) {
    console.error('Error fetching rejected returns:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch returns' },
      { status: 500 }
    )
  }
}
