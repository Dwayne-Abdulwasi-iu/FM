import { NextRequest, NextResponse } from 'next/server'
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

    // Fetch all designs purchased by the user
    const purchases = await prisma.purchase.findMany({
      where: {
        userId: session.user.id,
        accessGranted: true
      },
      include: {
        design: {
          include: {
            designer: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            mediaFiles: {
              select: {
                id: true,
                fileUrl: true,
                fileName: true,
                fileType: true,
                createdAt: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Map purchases to a cleaner structure
    const purchasedDesigns = purchases.map(purchase => ({
      id: purchase.id,
      purchaseId: purchase.id,
      purchaseDate: purchase.createdAt,
      purchaseType: purchase.purchaseType,
      purchasePrice: purchase.purchasePrice,
      design: {
        id: purchase.design.id,
        title: purchase.design.title,
        category: purchase.design.category,
        imageUrl: purchase.design.imageUrl,
        price: purchase.design.price,
        ownershipPrice: purchase.design.ownershipPrice,
        description: purchase.design.description,
        mediaFiles: purchase.design.mediaFiles,
        tags: purchase.design.tags,
        designer: {
          id: purchase.design.designer.id,
          name: purchase.design.designer.name,
          email: purchase.design.designer.email
        }
      }
    }))

    return NextResponse.json({
      purchases: purchasedDesigns,
      count: purchasedDesigns.length
    })

  } catch (error) {
    console.error('Get purchases error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
