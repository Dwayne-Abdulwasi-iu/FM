#!/usr/bin/env node
// One-off runner: transform DATABASE_URL (process-only) to a Prisma-acceptable scheme
// then run the same fix logic as scripts/fix-cloudinary-protocol.mjs
import path from 'path'
import dotenv from 'dotenv'

// Load .env.local if present so we can read the existing DATABASE_URL
try { dotenv.config({ path: path.resolve(process.cwd(), '.env.local') }) } catch {}

const orig = process.env.DATABASE_URL || ''
if (!orig) {
  console.error('No DATABASE_URL found in environment or .env.local')
  process.exit(1)
}

let transformed = orig
// Replace any occurrence of mongodb+srv:// or mongodb:// with mongo:// (best-effort)
// handle various possible prefixes seen in envs (mongodb+srv, mongodb, mongo+srv, mongo)
transformed = transformed.replace(/mongodb\+srv:\/\//ig, 'mongo://')
transformed = transformed.replace(/mongodb:\/\//ig, 'mongo://')
transformed = transformed.replace(/mongo\+srv:\/\//ig, 'mongo://')

if (transformed === orig) {
  console.log('No transformation applied to DATABASE_URL (using original)')
} else {
  console.log('Transformed DATABASE_URL for this run (process-only)')
}

// Apply override for this process
process.env.DATABASE_URL = transformed

// Now import prisma (which reads process.env.DATABASE_URL at import time)
import prisma from '../src/lib/prisma.mjs'

async function fix() {
  const httpPrefix = 'http://res.cloudinary.com'
  const httpsPrefix = 'https://res.cloudinary.com'

  console.log('Scanning designs for http Cloudinary URLs...')
  const designs = await prisma.design.findMany({ where: { thumbnailUrl: { contains: httpPrefix } }, select: { id: true, thumbnailUrl: true } })
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
  const medias = await prisma.designMedia.findMany({ where: { fileUrl: { contains: httpPrefix } }, select: { id: true, fileUrl: true } })
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
