import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateWatermarkedUrl, generateLowResPreview, generateBlurredPreview } from '@/lib/watermark'

/**
 * Protected Media Access API
 * 
 * Provides access-controlled URLs for design media based on user permissions:
 * - Non-purchasers: Watermarked low-res preview
 * - Purchasers: Full resolution (for purchased access type)
 * - Owners/Designers: Full resolution always
 * - Admins: Full resolution for moderation
 */

interface MediaAccessResponse {
  mediaId: string
  url: string
  accessLevel: 'full' | 'preview' | 'watermarked' | 'blurred'
  canDownload: boolean
  message?: string
}

interface MediaFile {
  id: string
  url: string
  publicId?: string | null
  accessType: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const designId = searchParams.get('designId')
    const mediaId = searchParams.get('mediaId')
    
    if (!designId) {
      return NextResponse.json(
        { message: 'Design ID required' },
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    const isAdmin = session?.user?.role === 'ADMIN'

    // Fetch design with media
    const design = await prisma.design.findUnique({
      where: { id: designId },
      include: {
        mediaFiles: true,
      }
    })

    if (!design) {
      return NextResponse.json(
        { message: 'Design not found' },
        { status: 404 }
      )
    }

    // Check if user has purchased
    let hasPurchased = false
    if (userId) {
      const purchase = await prisma.purchase.findFirst({
        where: { userId, designId }
      })
      hasPurchased = !!purchase
    }

    const isDesigner = design.designerId === userId
    const hasFullAccess = isDesigner || isAdmin || hasPurchased

    // If specific media requested
    if (mediaId) {
      const media = design.mediaFiles.find((m: { id: string }) => m.id === mediaId)
      if (!media) {
        return NextResponse.json(
          { message: 'Media not found' },
          { status: 404 }
        )
      }

      const accessResponse = getMediaAccess({
        id: media.id,
        url: media.fileUrl,
        publicId: null,
        accessType: media.accessType
      }, hasFullAccess, isDesigner, isAdmin)
      return NextResponse.json(accessResponse)
    }

    // Return access info for all media
    const mediaAccess: MediaAccessResponse[] = design.mediaFiles.map((media: { id: string; fileUrl: string; accessType: string }) => 
      getMediaAccess({
        id: media.id,
        url: media.fileUrl,
        publicId: null,
        accessType: media.accessType
      }, hasFullAccess, isDesigner, isAdmin)
    )

    return NextResponse.json({
      designId,
      hasFullAccess,
      isDesigner,
      isAdmin,
      hasPurchased,
      mediaFiles: mediaAccess,
    })

  } catch (error) {
    console.error('Protected media access error:', error)
    return NextResponse.json(
      { message: 'Failed to access media' },
      { status: 500 }
    )
  }
}

function getMediaAccess(
  media: { id: string; url: string; publicId?: string | null; accessType: string },
  hasFullAccess: boolean,
  isDesigner: boolean,
  isAdmin: boolean
): MediaAccessResponse {
  const publicId = media.publicId || extractPublicId(media.url)
  
  // Full access users get original
  if (hasFullAccess) {
    return {
      mediaId: media.id,
      url: media.url,
      accessLevel: 'full',
      canDownload: true,
    }
  }

  // Premium content for non-purchasers
  if (media.accessType === 'PREMIUM') {
    return {
      mediaId: media.id,
      url: publicId ? generateBlurredPreview(publicId) : media.url,
      accessLevel: 'blurred',
      canDownload: false,
      message: 'Purchase this design to access premium content',
    }
  }

  // Free preview with watermark
  return {
    mediaId: media.id,
    url: publicId ? generateWatermarkedUrl(publicId, {
      text: 'PREVIEW ONLY',
      position: 'tile',
      opacity: 25,
    }) : media.url,
    accessLevel: 'watermarked',
    canDownload: false,
    message: 'Purchase to download without watermark',
  }
}

function extractPublicId(url: string): string | null {
  // Extract Cloudinary public ID from URL
  // Example: https://res.cloudinary.com/xxx/image/upload/v123/folder/file.jpg
  const match = url.match(/\/v\d+\/(.+?)\.[a-z]+$/i)
  return match ? match[1] : null
}

/**
 * POST - Report unauthorized use of design
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { designId, reportedUrl, description } = await request.json()

    if (!designId || !reportedUrl) {
      return NextResponse.json(
        { message: 'Design ID and reported URL required' },
        { status: 400 }
      )
    }

    // Verify the reporter owns the design
    const design = await prisma.design.findFirst({
      where: {
        id: designId,
        designerId: session.user.id,
      },
    })

    if (!design) {
      return NextResponse.json(
        { message: 'You can only report infringement for your own designs' },
        { status: 403 }
      )
    }

    // Create infringement report
    // Note: This would need a ContentViolation or similar model
    // For now, we'll create a contact message for admin review
    await prisma.contactMessage.create({
      data: {
        userId: session.user.id,
        name: session.user.name || 'Designer',
        email: session.user.email || '',
        subject: `Copyright Infringement Report - Design ${designId}`,
        message: `
Reported URL: ${reportedUrl}

Designer: ${session.user.name || session.user.email}
Design: ${design.title}

Description: ${description || 'No additional details provided'}

This is an automated copyright infringement report. Please investigate.
        `.trim(),
        status: 'OPEN',
        priority: 'high',
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Infringement report submitted. Our team will review it within 24-48 hours.',
    })

  } catch (error) {
    console.error('Infringement report error:', error)
    return NextResponse.json(
      { message: 'Failed to submit report' },
      { status: 500 }
    )
  }
}
