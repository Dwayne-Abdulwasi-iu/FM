import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

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
    const { designId, downloadType } = await request.json()

    if (!designId || typeof designId !== 'string') {
      return NextResponse.json(
        { message: 'Design ID is required' },
        { status: 400 }
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
    return NextResponse.json(
      { message: 'Failed to process download' },
      { status: 500 }
    )
  }
}
