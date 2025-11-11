#!/usr/bin/env node
import 'dotenv/config'
import prisma from '../src/lib/prisma.mjs'

const designId = process.argv[2] || process.env.INSPECT_DESIGN_ID
const mediaId = process.argv[3] || process.env.INSPECT_MEDIA_ID

if (!designId && !mediaId) {
  console.error('Usage: node scripts/inspect-design-media.mjs <designId> <mediaId>')
  process.exit(1)
}

async function main() {
  if (designId) {
    const d = await prisma.design.findUnique({ where: { id: designId } })
    console.log('Design:', d ? { id: d.id, thumbnailUrl: d.thumbnailUrl } : 'not found')
  }
  if (mediaId) {
    const m = await prisma.designMedia.findUnique({ where: { id: mediaId } })
    console.log('DesignMedia:', m ? { id: m.id, fileUrl: m.fileUrl, uploadedAt: m.createdAt } : 'not found')
  }
}

main().then(()=>process.exit(0)).catch((e)=>{ console.error(e); process.exit(1) })
