import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export async function GET() {
  // Only allow this when explicitly enabled in development to avoid exposing DB details in prod
  // Set ENABLE_DEV_API=true in your .env.local to allow this endpoint to run.
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_API !== 'true') {
    return NextResponse.json({ message: 'Not allowed' }, { status: 403 })
  }

  try {
    const designs = await prisma.design.findMany({
      where: {
        OR: [
          { imageUrl: { startsWith: '/uploads/' } },
          { thumbnailUrl: { startsWith: '/uploads/' } },
        ]
      },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        thumbnailUrl: true,
        mediaFiles: { select: { fileUrl: true } }
      }
    })

    const uploadsRoot = path.join(process.cwd(), 'public')
    const missingRecords: Array<{ id: string; title: string | null; missing: string[] }> = []

    for (const d of designs) {
      const referenced: string[] = []
      if (d.imageUrl && d.imageUrl.startsWith('/uploads/')) referenced.push(d.imageUrl)
      if (d.thumbnailUrl && d.thumbnailUrl.startsWith('/uploads/')) referenced.push(d.thumbnailUrl)
      for (const mf of d.mediaFiles || []) if (mf.fileUrl && mf.fileUrl.startsWith('/uploads/')) referenced.push(mf.fileUrl)

      const missing: string[] = []
      for (const r of referenced) {
        const fp = path.join(uploadsRoot, r.replace(/^\//, ''))
        if (!fs.existsSync(fp)) missing.push(r)
      }

      if (missing.length) missingRecords.push({ id: d.id, title: d.title ?? null, missing })
    }

    return NextResponse.json({ missing: missingRecords })
  } catch (err) {
    console.error('dev/missing-uploads error', err)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
