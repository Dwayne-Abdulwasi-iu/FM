#!/usr/bin/env node
import 'dotenv/config'
import prisma from '../src/lib/prisma.mjs'

async function fix() {
  const httpPrefix = 'http://res.cloudinary.com'
  const httpsPrefix = 'https://res.cloudinary.com'

  console.log('Scanning designs for http Cloudinary URLs...')
  const designs = await prisma.design.findMany({ where: { thumbnailUrl: { contains: 'http://res.cloudinary.com' } }, select: { id: true, thumbnailUrl: true } })
  console.log(`Found ${designs.length} designs with http Cloudinary thumbnails`)

  for (const d of designs) {
    const newUrl = d.thumbnailUrl.replace(httpPrefix, httpsPrefix)
    try {
      await prisma.design.update({ where: { id: d.id }, data: { thumbnailUrl: newUrl } })
      console.log(`Updated Design(${d.id})`)
    } catch (err) {
      console.warn(`Failed to update Design(${d.id}):`, err?.message || err)
    }
  }

  console.log('Scanning media records for http Cloudinary URLs...')
  const medias = await prisma.designMedia.findMany({ where: { fileUrl: { contains: 'http://res.cloudinary.com' } }, select: { id: true, fileUrl: true } })
  console.log(`Found ${medias.length} media records with http Cloudinary URLs`)

  for (const m of medias) {
    const newFile = m.fileUrl.replace(httpPrefix, httpsPrefix)
    try {
      await prisma.designMedia.update({ where: { id: m.id }, data: { fileUrl: newFile } })
      console.log(`Updated DesignMedia(${m.id})`)
    } catch (err) {
      console.warn(`Failed to update DesignMedia(${m.id}):`, err?.message || err)
    }
  }

  console.log('Done. Please verify a few records in the DB and clear any caches if applicable.')
  process.exit(0)
}

fix().catch((err) => { console.error(err); process.exit(1) })
