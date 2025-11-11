#!/usr/bin/env node
import prisma from '../src/lib/prisma.mjs'
import fs from 'fs'
import path from 'path'

const mediaId = process.argv[2]
const newFileName = process.argv[3]
if (!mediaId || !newFileName) {
  console.error('Usage: node scripts/fix-media-path.mjs <mediaId> <newFileName>')
  process.exit(1)
}

async function main() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  const candidatePath = path.join(uploadsDir, newFileName)
  if (!fs.existsSync(candidatePath)) {
    console.error('File not found in uploads:', candidatePath)
    process.exit(1)
  }

  try {
    const media = await prisma.designMedia.update({ where: { id: mediaId }, data: { fileUrl: `/uploads/${newFileName}` } })
    console.log('Updated media:', media.id, '->', media.fileUrl)
    process.exit(0)
  } catch (err) {
    console.error('Failed to update media', err)
    process.exit(1)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
