#!/usr/bin/env node
import cloudinary from 'cloudinary'
import prisma from '../src/lib/prisma.mjs'

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Aborting.')
    process.exit(1)
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('Cloudinary env not set. Aborting.')
    process.exit(1)
  }

  cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  // Find the E2E test design by title (created by script)
  const design = await prisma.design.findFirst({
    where: { title: 'E2E Test Design' },
    include: { mediaFiles: true }
  })

  if (!design) {
    console.log('No E2E Test Design found. Nothing to do.')
    process.exit(0)
  }

  console.log('Found design:', design.id)

  // Delete cloudinary assets referenced in mediaFiles
  for (const media of design.mediaFiles) {
    const url = media.fileUrl || ''
    // attempt to extract public_id from Cloudinary URL
    const m = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i)
    if (m && m[1]) {
      const publicId = m[1]
      try {
        console.log('Deleting Cloudinary asset:', publicId)
        await cloudinary.v2.uploader.destroy(publicId, { resource_type: 'auto' })
      } catch (err) {
        console.warn('Failed to delete Cloudinary asset', publicId, err?.message || err)
      }
    } else {
      console.log('Could not extract public_id from URL, skipping:', url)
    }
  }

  // Delete design (cascades to mediaFiles)
  try {
    await prisma.design.delete({ where: { id: design.id } })
    console.log('Deleted design', design.id)
  } catch (err) {
    console.error('Failed to delete design', err)
    process.exit(1)
  }

  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
