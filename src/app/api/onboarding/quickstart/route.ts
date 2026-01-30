import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

interface OnboardingRequest {
  storeName: string
  category: string
  product: {
    title: string
    description: string
    basePrice: number
    photos: string[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body: OnboardingRequest = await request.json()
    const { storeName, category, product } = body

    // Validation
    if (!storeName?.trim() || !category || !product?.title || !product?.basePrice) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (product.photos.length < 3) {
      return NextResponse.json(
        { success: false, message: 'At least 3 photos are required' },
        { status: 400 }
      )
    }

    // Find category
    const categoryRecord = await prisma.boutiqueCategory.findFirst({
      where: {
        name: {
          equals: category,
          mode: 'insensitive',
        },
      },
    })

    if (!categoryRecord) {
      return NextResponse.json(
        { success: false, message: 'Invalid category' },
        { status: 400 }
      )
    }

    // Generate slug from product title
    const slug = product.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 100)

    // Create boutique product
    const boutiqueProduct = await prisma.boutiqueProduct.create({
      data: {
        title: product.title,
        slug,
        description: product.description,
        basePrice: product.basePrice,
        categoryId: categoryRecord.id,
        sellerId: session.user.id,
        status: 'PENDING_APPROVAL',
        fulfillmentMethod: 'ADMIN_STOCK',
        media: {
          create: product.photos.map((photoUrl: string, idx: number) => ({
            type: 'IMAGE',
            url: photoUrl,
            mimeType: 'image/jpeg',
            fileName: `product-${idx}.jpg`,
            fileSize: 0,
            sortOrder: idx,
            isPrimary: idx === 0,
          })),
        },
        // Create at least one variant (required for boutique products)
        variants: {
          create: [
            {
              sku: `${slug}-default`,
              size: 'One Size',
              color: 'Default',
              colorHex: '#000000',
              quantity: 100,
              priceAdjustment: 0,
            },
          ],
        },
      },
      include: {
        media: true,
        variants: true,
        seller: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    // Update user profile with store name
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        displayName: storeName,
      },
    })

    // TODO: Send confirmation email to seller
    // TODO: Send notification to admin for review

    return NextResponse.json(
      {
        success: true,
        message: 'Store created! Admin will review within 24 hours.',
        productId: boutiqueProduct.id,
        data: {
          productId: boutiqueProduct.id,
          title: boutiqueProduct.title,
          slug: boutiqueProduct.slug,
          status: boutiqueProduct.status,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Onboarding Quickstart] Error:', error)

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to create store',
      },
      { status: 500 }
    )
  }
}
