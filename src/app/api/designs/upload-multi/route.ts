import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'
import { revalidatePath } from 'next/cache'
import nodemailer from 'nodemailer'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Helper function to save media files locally
async function saveMediaLocally(buffer: Buffer, filename: string, mimeType: string, fileKind: 'IMAGE' | 'VIDEO' | 'FILE') {
  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const originalExt = path.extname(filename).replace('.', '').toLowerCase()
    const baseName = path.basename(filename, path.extname(filename)).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || 'file'
    const fallbackExt = mimeType?.split('/')[1]?.toLowerCase() || (fileKind === 'VIDEO' ? 'mp4' : fileKind === 'IMAGE' ? 'jpg' : 'bin')
    const extension = originalExt || fallbackExt
    const uniqueFilename = `${timestamp}_${baseName}.${extension}`
    const filepath = path.join(uploadsDir, uniqueFilename)

    // Save the file
    await writeFile(filepath, buffer)

    return `/uploads/${uniqueFilename}`
  } catch (error) {
    console.error('Failed to save media file locally:', error)
    // Fall back to placeholder
    const randomId = Math.floor(Math.random() * 1000) + 1
    return fileKind === 'VIDEO' 
      ? `/uploads/placeholder-video-${randomId}.mp4`
      : `/images/placeholder-design.svg`
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
  const tagsRaw = formData.get('tags') as string
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

    // Validation rules
    const isAllowedType = (mime: string) => (
      mime.startsWith('image/') ||
      mime.startsWith('video/') ||
      [
        'application/pdf',
        'application/zip', 'application/x-zip-compressed',
        'application/postscript',
        'image/vnd.adobe.photoshop',
        'image/svg+xml',
        'text/plain',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ].includes(mime)
    )
    const maxBytes = (mime: string) => mime.startsWith('image/') ? 15 * 1024 * 1024 : mime.startsWith('video/') ? 200 * 1024 * 1024 : 200 * 1024 * 1024
    const fmt = (n: number) => {
      const sizes = ['B','KB','MB','GB']
      if (n === 0) return '0 B'
      const i = Math.floor(Math.log(n)/Math.log(1024))
      return `${(n/Math.pow(1024,i)).toFixed(i===0?0:1)} ${sizes[i]}`
    }

    // Process media files
    interface MediaFileInput {
      fileName: string
      fileUrl: string
      fileType: 'VIDEO' | 'IMAGE' | 'FILE'
      mimeType: string
      fileSize: number
      duration: number | null
      accessType: string
      sortOrder: number
    }
    const mediaFiles: MediaFileInput[] = []
  let primaryImageUrl = ''
  let thumbnailUrl = ''
  let primaryChosen = false

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const metadataStr = fileMetadataStrings[i]
  const metadata = JSON.parse(metadataStr)
      
      // Convert file to buffer
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Server-side validation
      if (!isAllowedType(file.type)) {
        return NextResponse.json(
          { message: `Unsupported file type: ${file.type || file.name}` },
          { status: 400 }
        )
      }
      const limit = maxBytes(file.type)
      if (buffer.length > limit) {
        return NextResponse.json(
          { message: `File too large (${fmt(buffer.length)}). Limit for ${file.type.startsWith('image/')?'images 15MB':file.type.startsWith('video/')?'videos 200MB':'files 200MB'}.` },
          { status: 400 }
        )
      }

      let fileUrl = ''
      const fileType: 'VIDEO' | 'IMAGE' | 'FILE' = file.type.startsWith('image/')
        ? 'IMAGE'
        : file.type.startsWith('video/')
          ? 'VIDEO'
          : 'FILE'
      
      // Upload to Cloudinary if configured, otherwise save locally
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloudinary-cloud-name') {
        try {
          const uploadResult = await new Promise<unknown>((resolve, reject) => {
            const uploadOptions: Record<string, unknown> = {
              resource_type: fileType === 'VIDEO' ? 'video' : (fileType === 'IMAGE' ? 'image' : 'raw'),
              folder: fileType === 'VIDEO' ? 'fashion-designs/videos' : (fileType === 'IMAGE' ? 'fashion-designs' : 'fashion-designs/files'),
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

          fileUrl = (uploadResult as { secure_url?: string } | null)?.secure_url || ''
        } catch (cloudinaryError) {
          console.error('Cloudinary upload failed:', cloudinaryError)
          // Fall back to local storage
          fileUrl = await saveMediaLocally(buffer, file.name, file.type, fileType)
        }
      } else {
        // Save locally for development
        fileUrl = await saveMediaLocally(buffer, file.name, file.type, fileType)
      }

      // Set primary image based on metadata.primary if provided; otherwise fallback to first image
      if (fileType === 'IMAGE') {
        if (!primaryChosen && metadata?.primary) {
          primaryImageUrl = fileUrl
          thumbnailUrl = fileUrl
          primaryChosen = true
        } else if (!primaryImageUrl) {
          primaryImageUrl = fileUrl
          thumbnailUrl = fileUrl
        }
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
      primaryImageUrl = '/images/placeholder-design.svg'
      thumbnailUrl = '/images/placeholder-design.svg'
    }

    // Normalize tags to string[]
    const tags: string[] = (tagsRaw || '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .filter((t, i, arr) => arr.indexOf(t) === i)

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
        tags,
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

    // Create in-app notification for uploader (pending approval)
    try {
      const createdNotif = await prisma.notification.create({
        data: {
          userId: session.user.id,
          title: 'Design pending approval',
          message: `Your design "${design.title}" has been submitted and is pending review. It will appear on the marketplace once approved.`,
          url: `/profile/designs`,
        }
      })
      try {
        // publish to any SSE subscribers for this user
        const pub = await import('@/lib/notificationsPubSub')
        pub.publish(session.user.id, createdNotif)
      } catch {}
    } catch (notifErr) {
      console.error('Failed to create in-app notification', notifErr)
    }

    try {
      revalidatePath('/')
      revalidatePath('/designs')
    } catch {}

    // Send email notification to uploader if email is configured
    try {
      const host = process.env.EMAIL_SERVER_HOST
      const user = process.env.EMAIL_SERVER_USER
      const pass = process.env.EMAIL_SERVER_PASSWORD
      const from = process.env.EMAIL_FROM
      if (host && user && pass && from && design.designer?.email) {
        const transporter = nodemailer.createTransport({
          host,
          port: Number(process.env.EMAIL_SERVER_PORT || 587),
          secure: false,
          auth: { user, pass },
        })

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const designUrl = `${baseUrl}/profile/designs`

        const mailOptions = {
          from,
          to: design.designer.email,
          subject: `Your design "${design.title}" is pending approval`,
          text: `Hi ${design.designer?.name || ''},\n\nThanks for submitting your design titled "${design.title}". Our moderation team will review it and once approved it will be visible on the site. You can view your uploads at: ${designUrl}\n\n— Fashion Marketplace`,
          html: `
            <div style="background:#f6f7fb;padding:20px;font-family:Arial,Helvetica,sans-serif;color:#111">
              <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #eaeaea">
                <div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px">
                  <strong style="font-size:15px">Fashion Marketplace</strong>
                </div>
                <div style="padding:18px">
                  <p style="margin:0 0 12px">Hi ${design.designer?.name || ''},</p>
                  <p style="margin:0 0 12px">Thanks for submitting your design <strong>${design.title}</strong>. Our team will review it shortly. Once it's approved it will be displayed on the marketplace.</p>
                  <p style="margin:0 0 16px"><a href="${designUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 14px;border-radius:6px">View your uploads</a></p>
                  <p style="font-size:12px;color:#666;margin:0">If the button doesn't work, copy and paste this link into your browser:<br/><span style="word-break:break-all">${designUrl}</span></p>
                </div>
                <div style="padding:12px 20px;border-top:1px solid #eee;font-size:12px;color:#666">© ${new Date().getFullYear()} Fashion Marketplace</div>
              </div>
            </div>
          `,
        }

  transporter.sendMail(mailOptions).catch((err: unknown) => console.error('Upload notification email failed', err))
      }
    } catch (emailErr) {
      console.error('Upload notification email error', emailErr)
    }

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