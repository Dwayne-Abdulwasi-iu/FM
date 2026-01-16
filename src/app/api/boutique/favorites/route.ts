import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/boutique/favorites - Get user's favorites
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const [favorites, total] = await Promise.all([
      prisma.boutiqueFavorite.findMany({
        where: { userId: session.user.id },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              basePrice: true,
              salePrice: true,
              thumbnailUrl: true,
              status: true,
              avgRating: true,
              seller: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.boutiqueFavorite.count({
        where: { userId: session.user.id },
      }),
    ])

    // Filter to only show active products
    const activeFavorites = favorites.filter(f => f.product.status === 'LIVE')

    return NextResponse.json({
      success: true,
      favorites: activeFavorites,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching favorites:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch favorites' },
      { status: 500 }
    )
  }
}

// POST /api/boutique/favorites - Add to favorites
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { productId } = await request.json()

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Check if product exists and is live
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: productId },
      select: { id: true, status: true },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if already favorited
    const existing = await prisma.boutiqueFavorite.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Already in favorites',
        favorite: existing,
      })
    }

    // Create favorite
    const favorite = await prisma.boutiqueFavorite.create({
      data: {
        userId: session.user.id,
        productId,
      },
    })

    // Increment favorite count on product
    await prisma.boutiqueProduct.update({
      where: { id: productId },
      data: { favoriteCount: { increment: 1 } },
    })

    return NextResponse.json({
      success: true,
      message: 'Added to favorites',
      favorite,
    })
  } catch (error) {
    console.error('Error adding favorite:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to add to favorites' },
      { status: 500 }
    )
  }
}

// DELETE /api/boutique/favorites - Remove from favorites
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Check if favorite exists
    const existing = await prisma.boutiqueFavorite.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
    })

    if (!existing) {
      return NextResponse.json({
        success: true,
        message: 'Not in favorites',
      })
    }

    // Delete favorite
    await prisma.boutiqueFavorite.delete({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
    })

    // Decrement favorite count on product
    await prisma.boutiqueProduct.update({
      where: { id: productId },
      data: { favoriteCount: { decrement: 1 } },
    })

    return NextResponse.json({
      success: true,
      message: 'Removed from favorites',
    })
  } catch (error) {
    console.error('Error removing favorite:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to remove from favorites' },
      { status: 500 }
    )
  }
}
