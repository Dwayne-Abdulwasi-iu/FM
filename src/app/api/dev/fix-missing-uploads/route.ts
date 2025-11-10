import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export async function POST() {
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
        mediaFiles: { select: { id: true, fileUrl: true } }
      }
    })

    const uploadsRoot = path.join(process.cwd(), 'public')
    const placeholder = '/images/placeholder-design.svg'
    const updates: Array<{ designId: string; updatedImage?: boolean; updatedThumbnail?: boolean; fixedMedia: string[] }> = []

    for (const d of designs) {
      const referenced: { kind: 'image' | 'thumbnail' | 'media'; value: string; mediaId?: string }[] = []
      if (d.imageUrl && d.imageUrl.startsWith('/uploads/')) referenced.push({ kind: 'image', value: d.imageUrl })
      if (d.thumbnailUrl && d.thumbnailUrl.startsWith('/uploads/')) referenced.push({ kind: 'thumbnail', value: d.thumbnailUrl })
      for (const mf of d.mediaFiles || []) if (mf.fileUrl && mf.fileUrl.startsWith('/uploads/')) referenced.push({ kind: 'media', value: mf.fileUrl, mediaId: mf.id })

      const missing = referenced.filter(r => {
        const fp = path.join(uploadsRoot, r.value.replace(/^\//, ''))
        return !fs.existsSync(fp)
      })

      if (!missing.length) continue

      let updatedImage = false
      let updatedThumbnail = false
      const fixedMedia: string[] = []

      // Update design's image/thumbnail if missing
      const designData: Record<string, unknown> = {}
      if (missing.some(m => m.kind === 'image')) {
        designData.imageUrl = placeholder
        updatedImage = true
      }
      if (missing.some(m => m.kind === 'thumbnail')) {
        designData.thumbnailUrl = placeholder
        updatedThumbnail = true
      }

      if (Object.keys(designData).length) {
        // designData only contains imageUrl and/or thumbnailUrl which are both strings;
        // provide a narrow type to avoid using `any` and satisfy eslint.
        const dataToUpdate: { imageUrl?: string; thumbnailUrl?: string } = designData as { imageUrl?: string; thumbnailUrl?: string }
        await prisma.design.update({ where: { id: d.id }, data: dataToUpdate as Prisma.DesignUpdateInput })
      }

      // Fix individual media file records
      for (const m of missing.filter(x => x.kind === 'media')) {
        if (!m.mediaId) continue
        try {
          await prisma.designMedia.update({ where: { id: m.mediaId }, data: { fileUrl: placeholder, fileType: 'IMAGE', mimeType: 'image/svg+xml' } })
          fixedMedia.push(m.value)
        } catch (e) {
          console.error('Failed to update media', m.mediaId, e)
        }
      }

      updates.push({ designId: d.id, updatedImage, updatedThumbnail, fixedMedia })
    }

    return NextResponse.json({ updated: updates })
  } catch (err) {
    console.error('dev/fix-missing-uploads error', err)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
