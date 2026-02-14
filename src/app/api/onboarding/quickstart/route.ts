import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

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

    // Send confirmation email to seller
    const baseUrl = process.env.NEXTAUTH_URL || 'https://fashionmarketplace.example.com'
    const adminEmail = process.env.ADMIN_EMAIL
    
    if (session.user.email) {
      const sellerEmailHtml = `
        <h2>Welcome to the Fashion Marketplace!</h2>
        <p>Hello ${session.user.name || 'Seller'},</p>
        <p>Your store <strong>${storeName}</strong> has been successfully created.</p>
        
        <h3>Store Details</h3>
        <ul>
          <li><strong>Store Name:</strong> ${storeName}</li>
          <li><strong>Category:</strong> ${body.category}</li>
          <li><strong>First Product:</strong> ${boutiqueProduct.title}</li>
        </ul>
        
        <p>Our admin team is reviewing your store and first product submission. You will receive an email notification within 24 hours with the review results.</p>
        
        <p>In the meantime, you can:</p>
        <ul>
          <li>Complete your seller profile</li>
          <li>Add more products</li>
          <li>Set up your payment preferences</li>
        </ul>
        
        <p>
          <a href="${baseUrl}/seller/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
            Go to Dashboard
          </a>
        </p>
      `;

      await sendEmail({
        to: session.user.email,
        subject: `Welcome ${storeName}!`,
        html: sellerEmailHtml,
      });
    }

    // Notify admin for review
    if (adminEmail) {
      const adminEmailHtml = `
        <h2>New Seller Store for Review</h2>
        <p>A new seller has submitted their store and first product for review.</p>
        
        <h3>Store Details</h3>
        <ul>
          <li><strong>Store Name:</strong> ${storeName}</li>
          <li><strong>Seller Name:</strong> ${session.user.name || 'Unknown'}</li>
          <li><strong>Seller Email:</strong> ${session.user.email || 'N/A'}</li>
          <li><strong>Category:</strong> ${body.category}</li>
          <li><strong>Submitted:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        
        <h3>First Product</h3>
        <ul>
          <li><strong>Title:</strong> ${boutiqueProduct.title}</li>
          <li><strong>Description:</strong> ${body.product.description}</li>
          <li><strong>Price:</strong> $${body.product.basePrice}</li>
          <li><strong>Product ID:</strong> ${boutiqueProduct.id}</li>
        </ul>
        
        <p>Please review the store and product for compliance and quality.</p>
        
        <p>
          <a href="${baseUrl}/admin/onboarding" style="display: inline-block; padding: 12px 24px; background-color: #FF6B6B; color: white; text-decoration: none; border-radius: 8px;">
            Review Store
          </a>
        </p>
      `;

      await sendEmail({
        to: adminEmail,
        subject: `New Store for Review: ${storeName}`,
        html: adminEmailHtml,
      });
    }

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
