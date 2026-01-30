import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { canAccessDesignDuringEscrow } from '@/lib/ownership-escrow'

/**
 * GET /api/downloads
 * Get current user's download history
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'You must be signed in to view downloads' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)
    const designId = searchParams.get('designId')

    interface DownloadWhere {
      userId: string
      designId?: string
    }

    const where: DownloadWhere = { userId }
    if (designId) {
      where.designId = designId
    }

    const [downloads, total] = await Promise.all([
      prisma.designDownload.findMany({
        where,
        orderBy: { downloadedAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.designDownload.count({ where })
    ])

    return NextResponse.json({
      downloads,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Get downloads error:', error)
    return NextResponse.json(
      { message: 'Failed to get download history' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/downloads
 * Track a new download and return download URL
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'You must be signed in to download' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { designId, downloadType, ownershipDocId } = await request.json()

    if (!designId || typeof designId !== 'string') {
      return NextResponse.json(
        { message: 'Design ID is required' },
        { status: 400 }
      )
    }

    // FLAW FIX #9: Allow sellers to view their own preview file
    // Check if this is a seller viewing their own preview
    if (ownershipDocId) {
      const ownershipDoc = await prisma.ownershipDocument.findUnique({
        where: { id: ownershipDocId },
        select: {
          id: true,
          sellerId: true,
          previewFileUrl: true,
          previewFileType: true,
          previewFileName: true,
          previewDescription: true,
          status: true
        }
      })

      if (!ownershipDoc) {
        return NextResponse.json(
          { message: 'Ownership document not found' },
          { status: 404 }
        )
      }

      // Only seller can view their own preview
      if (ownershipDoc.sellerId !== userId) {
        return NextResponse.json(
          { message: 'Unauthorized - not your document' },
          { status: 403 }
        )
      }

      if (!ownershipDoc.previewFileUrl) {
        return NextResponse.json(
          { message: 'Preview file not yet uploaded' },
          { status: 404 }
        )
      }

      // Return the preview file URL for seller to download/view
      return NextResponse.json(
        {
          message: 'Preview file retrieved',
          previewFileUrl: ownershipDoc.previewFileUrl,
          previewFileType: ownershipDoc.previewFileType,
          previewFileName: ownershipDoc.previewFileName,
          previewDescription: ownershipDoc.previewDescription,
          documentStatus: ownershipDoc.status
        },
        { status: 200 }
      )
    }

    const validDownloadTypes = ['ORIGINAL', 'WATERMARKED', 'THUMBNAIL']
    if (!downloadType || !validDownloadTypes.includes(downloadType)) {
      return NextResponse.json(
        { message: 'Invalid download type' },
        { status: 400 }
      )
    }

    // Check if user has purchased this design
    const purchase = await prisma.purchase.findFirst({
      where: {
        userId,
        designId,
        accessGranted: true
      }
    })

    // Only allow original downloads for purchasers
    if (downloadType === 'ORIGINAL' && !purchase) {
      return NextResponse.json(
        { message: 'You must purchase this design to download the original' },
        { status: 403 }
      )
    }

    // For OWNERSHIP purchases, handle escrow preview logic
    if (purchase?.purchaseType === 'OWNERSHIP') {
      const userRole = (session.user.role === 'ADMIN' ? 'ADMIN' : 'USER') as 'USER' | 'ADMIN'
      const escrowCheck = await canAccessDesignDuringEscrow(
        userId,
        designId,
        userRole
      )

      // Check if still in escrow period
      if (escrowCheck.escrowStatus?.isInEscrow) {
        // During escrow: serve PREVIEW file only, not full files
        const ownershipDoc = await prisma.ownershipDocument.findFirst({
          where: {
            designId,
            status: 'APPROVED'
          },
          select: {
            id: true,
            previewFileUrl: true,
            previewFileType: true,
            previewFileName: true,
            previewDescription: true
          }
        })

        if (!ownershipDoc?.previewFileUrl) {
          return NextResponse.json(
            { 
              message: 'Preview file not yet available. Seller is preparing the preview for you to inspect.',
              escrowStatus: escrowCheck.escrowStatus
            },
            { status: 402 } // Payment required (in sense of waiting for preview)
          )
        }

        // Redirect to preview file (read-only, no download)
        return NextResponse.json(
          {
            message: 'Preview available during inspection period',
            previewUrl: ownershipDoc.previewFileUrl,
            previewType: ownershipDoc.previewFileType,
            previewDescription: ownershipDoc.previewDescription,
            escrowStatus: escrowCheck.escrowStatus,
            note: `This is a preview file. Full design files will be available after the ${escrowCheck.escrowStatus.daysRemaining}-day inspection period expires.`
          },
          { status: 200 }
        )
      }

      // After escrow expires: allow full file download
      if (!escrowCheck.hasAccess) {
        return NextResponse.json(
          { message: escrowCheck.reason },
          { status: 403 }
        )
      }

      // Verify the user is the exclusive owner
      const design = await prisma.design.findUnique({
        where: { id: designId },
        select: { ownedBy: true, isOwned: true }
      })
      
      if (!design || !design.isOwned || design.ownedBy !== userId) {
        return NextResponse.json(
          { message: 'You do not own this design' },
          { status: 403 }
        )
      }
    }

    // Get design info
    const design = await prisma.design.findUnique({
      where: { id: designId },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        watermarkedUrl: true,
        thumbnailUrl: true
      }
    })

    if (!design) {
      return NextResponse.json(
        { message: 'Design not found' },
        { status: 404 }
      )
    }

    // Determine which URL to return
    let downloadUrl: string | null = null
    switch (downloadType) {
      case 'ORIGINAL':
        downloadUrl = design.imageUrl
        break
      case 'WATERMARKED':
        downloadUrl = design.watermarkedUrl || design.imageUrl
        break
      case 'THUMBNAIL':
        downloadUrl = design.thumbnailUrl || design.imageUrl
        break
    }

    if (!downloadUrl) {
      return NextResponse.json(
        { message: 'Download file not available' },
        { status: 404 }
      )
    }

    // Get request metadata for tracking
    const userAgent = request.headers.get('user-agent') || undefined
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || undefined

    // Track the download
    const download = await prisma.designDownload.create({
      data: {
        userId,
        designId,
        purchaseId: purchase?.id || '',
        downloadType,
        ipAddress,
        userAgent
      }
    })

    return NextResponse.json({
      message: 'Download tracked successfully',
      downloadId: download.id,
      downloadUrl,
      designTitle: design.title
    })

  } catch (error) {
    console.error('Track download error:', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { message: 'Invalid request format' },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { message: 'Database temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: 'Failed to process download. Please try again later.' },
      { status: 500 }
    )
  }
}
