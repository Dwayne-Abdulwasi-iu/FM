import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { v2 as cloudinary } from 'cloudinary'
import { revalidatePath } from 'next/cache'
import nodemailer from 'nodemailer'
// removed local file helpers — Cloudinary is required for uploads
import { generatePlaceholderSVG } from '@/lib/placeholders'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})



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
  let price = parseFloat(formData.get('price') as string)
  let ownershipPrice = formData.get('ownershipPrice') ? parseFloat(formData.get('ownershipPrice') as string) : null
  const currencyRaw = (formData.get('currency') as string) || 'USD'
    const allowedCurrencies = ['USD','EUR','GBP','NGN','GHS','KES']
    let currency = allowedCurrencies.includes(currencyRaw.toUpperCase()) ? currencyRaw.toUpperCase() : 'USD'

    // Normalize incoming price to USD for storage if user submitted in another currency.
    // This ensures the database price value is consistently in USD and avoids UI confusion
    // where other parts of the app format amounts using USD assumptions.
    if (currency !== 'USD' && typeof price === 'number' && !Number.isNaN(price)) {
      try {
        const mod = await import('@/lib/currency')
        const rateRes = await mod.getConversionRate(currency, 'USD')
        const rate = rateRes?.rate
        if (rate && typeof rate === 'number') {
          price = mod.applyRate(price, rate)
          if (ownershipPrice && !Number.isNaN(ownershipPrice)) ownershipPrice = mod.applyRate(ownershipPrice, rate)
          // store normalized currency as USD
          currency = 'USD'
        }
      } catch (e) {
        // If conversion fails we keep the submitted values; conversion is best-effort
        console.warn('Price normalization to USD failed:', e)
      }
    }
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
      
      // Require Cloudinary to be configured — do not fall back to local storage.
      if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'your-cloudinary-cloud-name') {
        return NextResponse.json({ message: 'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.' }, { status: 500 })
      }

      // Upload to Cloudinary
      let _publicId: string | undefined = undefined
      let _publicVersion: number | undefined = undefined
      if (process.env.CLOUDINARY_CLOUD_NAME) {
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
          const _pubId = (uploadResult as { public_id?: string } | null)?.public_id
          const _pubVersion = (uploadResult as { version?: number } | null)?.version
          _publicId = _pubId
          _publicVersion = _pubVersion
          // If this was a video upload, also attempt to generate a Cloudinary-hosted thumbnail/poster
          try {
            const pubId = (uploadResult as { public_id?: string } | null)?.public_id
            if (fileType === 'VIDEO' && pubId) {
              try {
                const poster = cloudinary.url(pubId, {
                  resource_type: 'video',
                  format: 'jpg',
                  transformation: [
                    { width: 1280, height: 720, crop: 'fill', start_offset: '1', quality: 'auto' }
                  ]
                })
                // Use the generated poster as thumbnail if we don't already have one
                if (!thumbnailUrl) thumbnailUrl = poster
              } catch {
                // log poster generation errors for easier debugging in production
                console.error('Cloudinary poster generation failed for public_id:', pubId)
            // Persist publicId/version in the mediaFiles object (used later by worker/backfills)
            // We'll attach these to the mediaFiles array objects below when creating DB records.
            ;(uploadResult as Record<string, unknown>)['_publicId'] = _pubId
            ;(uploadResult as Record<string, unknown>)['_publicVersion'] = _pubVersion
                try {
                  // attempt a second, more permissive poster generation (different offset)
                  const poster2 = cloudinary.url(pubId, {
                    resource_type: 'video',
                    format: 'jpg',
                    transformation: [
                      { width: 1280, height: 720, crop: 'fill', start_offset: '0.5', quality: 'auto' }
                    ]
                  })
                  if (!thumbnailUrl) thumbnailUrl = poster2
                } catch (e) {
                  console.error('Cloudinary poster secondary attempt failed for public_id:', pubId, e)
                }
              }
            }
          } catch {
            // ignore any poster-related errors
          }
        } catch (cloudinaryError) {
          console.error('Cloudinary upload failed:', cloudinaryError)
          return NextResponse.json(
            { message: 'Cloudinary upload failed. Please try again later.' },
            { status: 500 }
          )
        }
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mediaFiles.push({
        fileName: file.name,
        fileUrl,
        publicId: _publicId,
        publicVersion: _publicVersion,
        fileType,
        mimeType: file.type,
        fileSize: file.size,
        duration,
        accessType: metadata.accessType,
        sortOrder: metadata.sortOrder
      } as unknown as MediaFileInput)
    }

    // If no image was uploaded, use a placeholder for the primary image.
    // If the uploaded media contains a video, generate a video-specific SVG placeholder
    // so the video poster shows a clear "VIDEO"/play-style thumbnail instead of the generic design SVG.
    const hasVideo = mediaFiles.some(m => m.fileType === 'VIDEO')
    if (!primaryImageUrl) {
      if (hasVideo) {
        // Use a data-uri SVG sized for an aspect-video poster
        primaryImageUrl = generatePlaceholderSVG(1280, 720, 'VIDEO')
        thumbnailUrl = primaryImageUrl
      } else {
        primaryImageUrl = '/images/placeholder-design.svg'
        thumbnailUrl = '/images/placeholder-design.svg'
      }
    }

    // Normalize tags to string[]
    const tags: string[] = (tagsRaw || '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .filter((t, i, arr) => arr.indexOf(t) === i)

  // Preserve seller-submitted price/currency for audit/display, then normalize and store price as USD
  const submittedPriceVal = price
  const submittedCurrencyVal = currency

  // Create design record in database with media files and currency
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const design = await prisma.design.create({
      // cast data as any because generated client types may not be fully in sync in this environment
      data: {
        title,
        description: description || null,
        price,
        ownershipPrice,
        currency,
        submittedPrice: submittedPriceVal,
        submittedCurrency: submittedCurrencyVal,
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
      } as any,
      include: {
        mediaFiles: true
      }
    })
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Enqueue thumbnail generation jobs for any locally-stored videos
    try {
      const { enqueueThumbnailJobsForDesign } = await import('@/lib/thumbnailQueue')
      enqueueThumbnailJobsForDesign(design).catch(() => {})
    } catch {
      // best-effort only
    }

    // Create in-app notification for uploader (pending approval)
    try {
        const createdNotif = await prisma.notification.create({
        data: {
          userId: session.user.id,
          title: 'Design pending approval',
          message: `Your design "${design.title}" has been submitted and is pending review. It will appear on the marketplace once approved.`,
          // profile is a single page with tabs — link to the profile page and the designs tab
          url: `/profile#designs`,
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
        const emailUser = process.env.EMAIL_SERVER_USER
        const pass = process.env.EMAIL_SERVER_PASSWORD
        const from = process.env.EMAIL_FROM
    if (host && emailUser && pass && from && user?.email) {
          const transporter = nodemailer.createTransport({
            host,
            port: Number(process.env.EMAIL_SERVER_PORT || 587),
            secure: false,
            auth: { user: emailUser, pass },
          })

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  // Link to the profile page with the designs tab anchor so the client route exists
  const designUrl = `${baseUrl}/profile#designs`

        const mailOptions = {
          from,
          to: user.email,
          subject: `Your design "${design.title}" is pending approval`,
          text: `Hi ${user?.name || ''},\n\nThanks for submitting your design titled "${design.title}". Our moderation team will review it and once approved it will be visible on the site. You can view your uploads at: ${designUrl}\n\n— Fashion Marketplace`,
          html: `
            <div style="background:#f6f7fb;padding:20px;font-family:Arial,Helvetica,sans-serif;color:#111">
              <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #eaeaea">
                <div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px">
                  <strong style="font-size:15px">Fashion Marketplace</strong>
                </div>
                <div style="padding:18px">
                  <p style="margin:0 0 12px">Hi ${user?.name || ''},</p>
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
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable, please try again later.')
    if (prismaResp) return prismaResp
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}