import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { v2 as cloudinary } from 'cloudinary'
import { revalidatePath } from 'next/cache'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// No local fallback: Cloudinary is required for uploads

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('Session:', session)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })
    
    if (!user) {
      console.log('User not found in database:', session.user.id)
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has a verified bank account - REQUIRED for uploads
    const sellerAccount = await prisma.sellerAccount.findUnique({
      where: { userId: session.user.id }
    })

    if (!sellerAccount) {
      return NextResponse.json(
        { 
          message: 'Bank account required to upload designs. Please add your bank account details first.',
          requiresBankAccount: true,
          redirectTo: '/profile#bank-account'
        },
        { status: 403 }
      )
    }

    if (!sellerAccount.isVerified) {
      return NextResponse.json(
        { 
          message: 'Your bank account needs to be verified before you can upload designs. Please verify your account first.',
          requiresVerification: true,
          bankAccountExists: true,
          redirectTo: '/profile#bank-verification'
        },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const price = parseFloat(formData.get('price') as string)
    const ownershipPrice = formData.get('ownershipPrice') ? parseFloat(formData.get('ownershipPrice') as string) : null
    const category = formData.get('category') as string
  const tagsRaw = formData.get('tags') as string
    const buyingTypes = formData.get('buyingTypes') as string || 'REGULAR'

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      )
    }

    if (!title || !price || price <= 0) {
      return NextResponse.json(
        { message: 'Title and valid price are required' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let imageUrl = ''
    let thumbnailUrl = ''

    // Require Cloudinary configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'your-cloudinary-cloud-name') {
      return NextResponse.json({ message: 'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.' }, { status: 500 })
    }

    try {
        // Upload original image
        const uploadResult = await new Promise<unknown>((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: 'fashion-designs',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto' }
              ]
            },
            (error, result) => {
              if (error) reject(error)
              else resolve(result)
            }
          ).end(buffer)
        })

        // Upload thumbnail
        const thumbnailResult = await new Promise<unknown>((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: 'fashion-designs/thumbnails',
              transformation: [
                { width: 400, height: 400, crop: 'fill', quality: 'auto' }
              ]
            },
            (error, result) => {
              if (error) reject(error)
              else resolve(result)
            }
          ).end(buffer)
        })

        imageUrl = (uploadResult as { secure_url?: string } | null)?.secure_url || ''
        thumbnailUrl = (thumbnailResult as { secure_url?: string } | null)?.secure_url || ''
    } catch (cloudinaryError) {
      console.error('Cloudinary upload failed:', cloudinaryError)
      return NextResponse.json(
        { message: 'Cloudinary upload failed. Please try again later.' },
        { status: 500 }
      )
    }

    // Normalize tags to string[]
    const tags: string[] = (tagsRaw || '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .filter((t, i, arr) => arr.indexOf(t) === i)

    // Create design record in database
    const design = await prisma.design.create({
      data: {
        title,
        description: description || null,
        price,
        ownershipPrice,
        imageUrl,
        thumbnailUrl,
        category,
        tags,
        buyingTypes,
        designerId: session.user.id,
        approvalStatus: 'PENDING', // All uploads require approval
        isActive: false, // Inactive until approved
      },
      include: {
        designer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    try {
      revalidatePath('/')
      revalidatePath('/designs')
    } catch {}

    return NextResponse.json({
      id: design.id,
      message: 'Design uploaded successfully. It will be visible once approved by our team.',
      design
    })

  } catch (error) {
    console.error('Upload error:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable, please try again later.')
    if (prismaResp) return prismaResp
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}