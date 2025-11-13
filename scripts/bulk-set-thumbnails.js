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
  console.log('Connecting to DB...')
  await client.connect()
  try {
    const m = dbUrl.match(/\/([^/?]+)(?:\?|$)/)
    const db = m ? client.db(m[1]) : client.db()
    const designs = db.collection('designs')
    const media = db.collection('design_media')

    // Find recent designs (limit 50) where thumbnail is a data URI placeholder or missing
    const cursor = designs.find({
      $or: [
        { thumbnailUrl: { $exists: false } },
        { thumbnailUrl: { $regex: '^data:image' } },
        { thumbnailUrl: { $regex: 'placeholder-design' } }
      ]
    }).sort({ createdAt: -1 }).limit(50)

    const toUpdate = []
    while (await cursor.hasNext()) {
      const d = await cursor.next()
      // find first video media for this design
      const vids = await media.find({ designId: d._id, fileType: 'VIDEO' }).sort({ sortOrder: 1 }).toArray()
      if (vids && vids.length) {
        const pub = parsePublicIdFromUrl(vids[0].fileUrl)
        if (pub) {
          const poster = cloudinary.url(pub, { resource_type: 'video', format: 'jpg', transformation: [ { width:1280, height:720, crop:'fill', start_offset:'1', quality:'auto' } ] })
          toUpdate.push({ id: d._id, poster, mediaId: vids[0]._id })
        }
      }
    }

    if (!toUpdate.length) { console.log('No candidates found'); return }
    console.log('Candidates to update:', toUpdate.length)
    for (const t of toUpdate) {
      console.log('Updating', t.id, '->', t.poster)
      const res = await designs.updateOne({ _id: t.id }, { $set: { thumbnailUrl: t.poster } })
      console.log('  matched', res.matchedCount, 'modified', res.modifiedCount)
    }
  } finally { await client.close() }
}

main().catch(e=>{ console.error(e); process.exit(1) })
