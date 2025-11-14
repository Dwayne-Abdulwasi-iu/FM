#!/usr/bin/env node
import dotenv from 'dotenv'
import { v2 as cloudinary } from 'cloudinary'
import { MongoClient } from 'mongodb'

dotenv.config({ path: process.cwd() + '/.env.local' })

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error('DATABASE_URL not set in .env.local; cannot connect to database')
  process.exit(1)
}

const client = new MongoClient(dbUrl)

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

async function main() {
  const publicId = process.argv[2]
  if (!publicId) {
    console.error('Usage: node scripts/set-thumbnail-for-publicid.js <public_id>')
    process.exit(2)
  }

  const posterUrl = cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'jpg',
    transformation: [
      { width: 1280, height: 720, crop: 'fill', start_offset: '1', quality: 'auto' }
    ]
  })

  console.log('Computed poster URL:', posterUrl)

  // Connect to MongoDB and update design document where mediaFiles.fileUrl contains publicId
  await client.connect()
  try {
    // Determine DB name from connection string (mongodb+srv://.../dbname)
    let dbName = null
    try { const m = dbUrl.match(/\/([^/?]+)(?:\?|$)/); if (m) dbName = m[1] } catch {}
    const db = dbName ? client.db(dbName) : client.db()
    const designsCol = db.collection('designs')

    const tail = publicId.split('/').pop()
    const found = await designsCol.findOne({ 'mediaFiles.fileUrl': { $regex: tail } })
    if (!found) {
      console.error('No design found referencing that public id')
      process.exit(1)
    }
    console.log('Found design id:', found._id, 'title:', found.title)

    const res = await designsCol.updateOne({ _id: found._id }, { $set: { thumbnailUrl: posterUrl } })
    if (res.matchedCount === 1) {
      console.log('Updated design.thumbnailUrl to poster URL')
    } else {
      console.error('Failed to update design')
      process.exit(1)
    }
  } finally {
    await client.close()
  }
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
