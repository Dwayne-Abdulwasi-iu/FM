#!/usr/bin/env node
import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv'

dotenv.config({ path: process.cwd() + '/.env.local' })

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})
async function main() {
  const publicId = process.argv[2]
  if (!publicId) {
    console.error('Usage: node scripts/check-cloudinary-poster.js <public_id>')
    process.exit(2)
  }

  try {
    const posterUrl = cloudinary.url(publicId, {
      resource_type: 'video',
      format: 'jpg',
      transformation: [
        { width: 1280, height: 720, crop: 'fill', start_offset: '1', quality: 'auto' }
      ]
    })

    console.log('Computed poster URL:', posterUrl)

    // Try to fetch the URL to check availability
    const res = await fetch(posterUrl)
    console.log('HTTP status:', res.status)
    if (res.ok) {
      console.log('Poster appears reachable.')
    } else {
      console.log('Poster not reachable or returned non-OK status.')
    }
  } catch (err) {
    console.error('Error while generating or fetching poster URL:', err)
    process.exit(1)
  }
}

main()
