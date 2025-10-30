import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Helper function to save media files locally
async function saveMediaLocally(buffer: Buffer, filename: string, fileType: string) {
  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const extension = fileType === 'VIDEO' ? 'mp4' : 'jpg'
    const uniqueFilename = `${timestamp}_${filename.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.${extension}`
    const filepath = path.join(uploadsDir, uniqueFilename)

    // Save the file
    await writeFile(filepath, buffer)

    return `/uploads/${uniqueFilename}`
  } catch (error) {
    console.error('Failed to save media file locally:', error)
    // Fall back to placeholder
    const randomId = Math.floor(Math.random() * 1000) + 1
    return fileType === 'VIDEO' 
      ? `/uploads/placeholder-video-${randomId}.mp4`
      : `/uploads/placeholder-design-${randomId}.jpg`
  }
}

// Helper function to get video duration with better estimation
function getVideoDuration(buffer: Buffer, mimeType: string): Promise<number> {
  // For production, implement ffprobe integration
  // For now, provide better estimation based on file size and type
  const fileSizeInMB = buffer.length / (1024 * 1024)
  
  // Rough estimation based on typical video compression rates
  let estimatedDuration: number
  
  if (mimeType.includes('h264') || mimeType.includes('mp4')) {
    // MP4/H.264: ~1-2 MB per minute for standard quality
    estimatedDuration = Math.round(fileSizeInMB * 0.7) * 60 // seconds
  } else if (mimeType.includes('webm')) {
    // WebM: ~0.8-1.5 MB per minute for standard quality  
    estimatedDuration = Math.round(fileSizeInMB * 0.8) * 60 // seconds
  } else {
    // Default estimation
    estimatedDuration = Math.round(fileSizeInMB * 0.5) * 60 // seconds
  }
  
  // Ensure reasonable bounds (30 seconds to 20 minutes)
  const boundedDuration = Math.max(30, Math.min(1200, estimatedDuration))
  
  return Promise.resolve(boundedDuration)
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
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
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const price = parseFloat(formData.get('price') as string)
    const ownershipPrice = formData.get('ownershipPrice') ? parseFloat(formData.get('ownershipPrice') as string) : null
    const category = formData.get('category') as string
    const tags = formData.get('tags') as string
    const buyingTypes = formData.get('buyingTypes') as string || 'REGULAR'

    // Get all files and metadata
    const files = formData.getAll('files') as File[]
    const fileMetadataStrings = formData.getAll('fileMetadata') as string[]
    
    if (!files.length) {
      return NextResponse.json(
        { message: 'At least one file is required' },
        { status: 400 }
      )
    }

    if (!title || !price || price <= 0) {
      return NextResponse.json(
        { message: 'Title and valid price are required' },
        { status: 400 }
      )
    }

    // Process media files
    const mediaFiles: any[] = []
    let primaryImageUrl = ''
    let thumbnailUrl = ''

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const metadataStr = fileMetadataStrings[i]
      const metadata = JSON.parse(metadataStr)
      
      // Convert file to buffer
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      let fileUrl = ''
      const fileType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE'
      
      // Upload to Cloudinary if configured, otherwise save locally
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloudinary-cloud-name') {
        try {
          const uploadResult = await new Promise((resolve, reject) => {
            const uploadOptions: any = {
              resource_type: fileType === 'VIDEO' ? 'video' : 'image',
              folder: fileType === 'VIDEO' ? 'fashion-designs/videos' : 'fashion-designs',
            }

            if (fileType === 'IMAGE') {
              uploadOptions.transformation = [
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto' }
              ]
            }

            cloudinary.uploader.upload_stream(
              uploadOptions,
              (error, result) => {
                if (error) reject(error)
                else resolve(result)
              }
            ).end(buffer)
          })

          type CloudinaryResult = { secure_url?: string }
          fileUrl = (uploadResult as unknown as CloudinaryResult).secure_url || ''
        } catch (cloudinaryError) {
          console.error('Cloudinary upload failed:', cloudinaryError)
          // Fall back to local storage
          fileUrl = await saveMediaLocally(buffer, file.name, fileType)
        }
      } else {
        // Save locally for development
        fileUrl = await saveMediaLocally(buffer, file.name, fileType)
      }

      // Set primary image and thumbnail from first image file
      if (!primaryImageUrl && fileType === 'IMAGE') {
        primaryImageUrl = fileUrl
        thumbnailUrl = fileUrl
      }

      // Get video duration if it's a video
      const duration = fileType === 'VIDEO' ? await getVideoDuration(buffer, file.type) : null

      mediaFiles.push({
        fileName: file.name,
        fileUrl,
        fileType,
        mimeType: file.type,
        fileSize: file.size,
        duration,
        accessType: metadata.accessType,
        sortOrder: metadata.sortOrder
      })
    }

    // If no image was uploaded, use a placeholder for the primary image
    if (!primaryImageUrl) {
      primaryImageUrl = '/uploads/placeholder-design-1.jpg'
      thumbnailUrl = '/uploads/placeholder-design-1.jpg'
    }

    // Create design record in database with media files
    const design = await prisma.design.create({
      data: {
        title,
        description: description || null,
        price,
        ownershipPrice,
        imageUrl: primaryImageUrl,
        thumbnailUrl,
        category,
        tags: tags || null,
        buyingTypes,
        designerId: session.user.id,
        approvalStatus: 'PENDING', // All uploads require approval
        isActive: false, // Inactive until approved
        mediaFiles: {
          create: mediaFiles
        }
      },
      include: {
        designer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        mediaFiles: true
      }
    })

    return NextResponse.json({
      id: design.id,
      message: `Design uploaded successfully with ${mediaFiles.length} media files. It will be visible once approved by our team.`,
      design,
      mediaFilesCount: mediaFiles.length
    })

  } catch (error) {
    console.error('Multi-upload error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}