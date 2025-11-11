#!/usr/bin/env node
import cloudinary from 'cloudinary'
import prisma from '../src/lib/prisma.mjs'

// Small 1x1 PNG base64
const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='
const buffer = Buffer.from(b64, 'base64')

async function main() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('Cloudinary env not set. Aborting.')
    process.exit(1)
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Aborting.')
    process.exit(1)
  }

  cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  console.log('Uploading test image to Cloudinary...')
  const uploadRes = await new Promise((resolve, reject) => {
    cloudinary.v2.uploader.upload_stream({ folder: 'fashion-marketplace/e2e', resource_type: 'image' }, (err, res) => {
      if (err) reject(err); else resolve(res)
    }).end(buffer)
  })

  console.log('Upload result:', uploadRes?.secure_url)

  const publicId = uploadRes.public_id
  const secureUrl = uploadRes.secure_url
  const thumb = cloudinary.v2.url(publicId, { width: 400, height: 400, crop: 'fill', quality: 'auto' })

  console.log('Creating Design and DesignMedia in DB...')
  const design = await prisma.design.create({
    data: {
      title: 'E2E Test Design',
      description: 'Auto-generated test design',
      price: 1.0,
      imageUrl: secureUrl,
      thumbnailUrl: thumb,
      category: 'test',
      tags: ['e2e','test'],
      buyingTypes: 'REGULAR',
      designerId: 'system-e2e',
      approvalStatus: 'PENDING',
      isActive: false,
      mediaFiles: {
        create: [
          {
            fileName: 'e2e-test.png',
            fileUrl: secureUrl,
            fileType: 'IMAGE',
            mimeType: 'image/png',
            fileSize: buffer.length,
            duration: null,
            accessType: 'FREE',
            sortOrder: 0,
          }
        ]
      }
    }
  })

  console.log('Created design id:', design.id)
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
