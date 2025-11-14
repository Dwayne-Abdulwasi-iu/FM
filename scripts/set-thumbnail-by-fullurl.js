#!/usr/bin/env node
import dotenv from 'dotenv'
import { v2 as cloudinary } from 'cloudinary'
import { MongoClient, ObjectId } from 'mongodb'

dotenv.config({ path: process.cwd() + '/.env.local' })

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error('DATABASE_URL not set in .env.local; cannot connect to database')
  process.exit(1)
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const client = new MongoClient(dbUrl)

function parsePublicIdFromFullUrl(fullUrl) {
  try {
    // Example input:
    // https://res.cloudinary.com/<cloud>/video/upload/v1763049051/fashion-designs/videos/ffaykcxyhqebjrzpr3ok.mp4
    const u = new URL(fullUrl)
    const parts = u.pathname.split('/')
    // remove leading empty
    // find index of 'upload'
    const uploadIdx = parts.findIndex(p => p === 'upload')
    if (uploadIdx === -1) return null
    const afterUpload = parts.slice(uploadIdx + 1)
    // drop version if like v12345
    if (afterUpload[0] && afterUpload[0].startsWith('v') && /^v\d+$/.test(afterUpload[0])) afterUpload.shift()
    const joined = afterUpload.join('/')
    // strip extension
    return joined.replace(/\.mp4$|\.mov$|\.webm$|\.m4v$|\.mkv$/i, '')
  } catch (e) {
    return null
  }
}

async function main() {
  const fullUrl = process.argv[2]
  if (!fullUrl) {
    console.error('Usage: node scripts/set-thumbnail-by-fullurl.js <full_video_url>')
    process.exit(2)
  }

  const publicId = parsePublicIdFromFullUrl(fullUrl)
  if (!publicId) {
    console.error('Could not parse public id from URL')
    process.exit(3)
  }

  // Compute poster URL (video -> jpg)
  const posterUrl = cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'jpg',
    transformation: [ { width: 1280, height: 720, crop: 'fill', start_offset: '1', quality: 'auto' } ]
  })

  console.log('Parsed publicId:', publicId)
  console.log('Computed poster URL:', posterUrl)

  await client.connect()
  try {
    // DB name parse
    let dbName = null
    try { const m = dbUrl.match(/\/([^/?]+)(?:\?|$)/); if (m) dbName = m[1] } catch {}
    const db = dbName ? client.db(dbName) : client.db()
    const designs = db.collection('designs')

    const tail = publicId.split('/').pop()

    const queries = [
      { 'mediaFiles.fileUrl': fullUrl },
      { 'mediaFiles.fileUrl': { $regex: tail } },
      { 'mediaFiles.fileUrl': { $regex: publicId } },
      { 'imageUrl': { $regex: tail } },
      { 'thumbnailUrl': { $regex: tail } },
      { 'mediaFiles.fileUrl': { $regex: fullUrl } }
    ]

    const matched = []
    for (const q of queries) {
      const cursor = designs.find(q).limit(10)
      const docs = await cursor.toArray()
      for (const d of docs) {
        // avoid duplicates
        if (!matched.find(m => String(m._id) === String(d._id))) matched.push(d)
      }
    }

    if (!matched.length) {
      console.error('No design found matching that URL or public id. Try providing design id.')
      process.exit(1)
    }

    console.log('Found', matched.length, 'design(s).')
    for (const d of matched) {
      console.log('---')
      console.log('Design _id:', d._id)
      console.log('Title:', d.title)
      console.log('Current thumbnailUrl:', d.thumbnailUrl)
      console.log('Sample mediaFiles:', (d.mediaFiles || []).slice(0,3))
    }

    // Confirm update: update all matched documents
    const ids = matched.map(d => d._id)
    const res = await designs.updateMany({ _id: { $in: ids } }, { $set: { thumbnailUrl: posterUrl } })
    console.log('updateMany result:', res.matchedCount, 'matched,', res.modifiedCount, 'modified')
  } finally {
    await client.close()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
