import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Dev-only endpoint to enqueue thumbnail generation jobs for designs missing thumbnails.
export async function POST(request: Request) {
  // Guard to ensure this endpoint is only available in non-production and when explicitly enabled
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_API !== 'true') {
    return NextResponse.json({ message: 'Not available' }, { status: 404 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const limit = Number(body?.limit) || 100

    // Find candidate designs: no thumbnail or placeholder-like thumbnail
    const candidates = await prisma.design.findMany({
      where: {
        OR: [
          { thumbnailUrl: null },
          { thumbnailUrl: { contains: 'placeholder' } },
        ]
      },
      include: { mediaFiles: true },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })

    // Enqueue jobs for each candidate
    let enqueued = 0
    try {
      const { enqueueThumbnailJobsForDesign } = await import('@/lib/thumbnailQueue')
      for (const d of candidates) {
        // Only enqueue if there are video media files
        if (d.mediaFiles && d.mediaFiles.some((m: any) => m.fileType === 'VIDEO')) {
          // best-effort
          // don't await the result to keep the endpoint responsive
          enqueueThumbnailJobsForDesign(d).catch(() => {})
          enqueued++
        }
      }
    } catch (e) {
      console.warn('Thumbnail queue not available; ensure bullmq and REDIS_URL are configured')
    }

    return NextResponse.json({ count: candidates.length, enqueued })
  } catch (err) {
    console.error('Dev reprocess error', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
