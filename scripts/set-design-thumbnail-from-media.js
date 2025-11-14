#!/usr/bin/env node
import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'
import { v2 as cloudinary } from 'cloudinary'

dotenv.config({ path: process.cwd() + '/.env.local' })
const dbUrl = process.env.DATABASE_URL
if (!dbUrl) { console.error('DATABASE_URL missing'); process.exit(1) }

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const client = new MongoClient(dbUrl)

function parsePublicIdFromUrl(fullUrl) {
  try {
    const u = new URL(fullUrl)
    const parts = u.pathname.split('/')
    const uploadIdx = parts.findIndex(p => p === 'upload')
    if (uploadIdx === -1) return null
    const after = parts.slice(uploadIdx + 1)
    if (after[0] && after[0].startsWith('v') && /^v\d+$/.test(after[0])) after.shift()
    const joined = after.join('/')
    return joined.replace(/\.[a-z0-9]+$/i, '')
  } catch { return null }
}

async function main() {
  const designId = process.argv[2]
  if (!designId) { console.error('Usage: node scripts/set-design-thumbnail-from-media.js <designId> [mediaId]'); process.exit(2) }
  const mediaId = process.argv[3]

  await client.connect()
  try {
    const m = dbUrl.match(/\/([^/?]+)(?:\?|$)/)
    const db = m ? client.db(m[1]) : client.db()
    const mediaCol = db.collection('design_media')
    let mediaDocs = []
    if (mediaId) {
      const mdoc = await mediaCol.findOne({ _id: mediaId })
      if (mdoc) mediaDocs = [mdoc]
    } else {
      mediaDocs = await mediaCol.find({ designId }).sort({ sortOrder: 1 }).toArray()
    }
    if (!mediaDocs.length) { console.error('No media docs found for design', designId); process.exit(1) }

    // pick first video or first media
    const chosen = mediaDocs.find(d=>d.fileType === 'VIDEO') || mediaDocs[0]
    console.log('Chosen media:', chosen._id, chosen.fileUrl)
    const publicId = parsePublicIdFromUrl(chosen.fileUrl)
    if (!publicId) { console.error('Could not parse public id from', chosen.fileUrl); process.exit(1) }
    const posterUrl = cloudinary.url(publicId, { resource_type: 'video', format: 'jpg', transformation: [ { width:1280, height:720, crop:'fill', start_offset:'1', quality:'auto' } ] })
    console.log('Computed poster URL:', posterUrl)

    const designsCol = db.collection('designs')
    const res = await designsCol.updateOne({ _id: designId }, { $set: { thumbnailUrl: posterUrl } })
    if (res.matchedCount === 1) console.log('Updated design thumbnailUrl')
    else console.error('Failed to update design')
  } finally { await client.close() }
}

main().catch(e=>{ console.error(e); process.exit(1) })
