#!/usr/bin/env node
import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'

dotenv.config({ path: process.cwd() + '/.env.local' })
const dbUrl = process.env.DATABASE_URL
if (!dbUrl) { console.error('DATABASE_URL missing'); process.exit(1) }

const client = new MongoClient(dbUrl)

function parsePublicId(fullUrl) {
  try {
    const u = new URL(fullUrl)
    const parts = u.pathname.split('/')
    const uploadIdx = parts.findIndex(p => p === 'upload')
    if (uploadIdx === -1) return null
    const after = parts.slice(uploadIdx + 1)
    if (after[0] && after[0].startsWith('v') && /^v\d+$/.test(after[0])) after.shift()
    const joined = after.join('/')
    return joined.replace(/\.[a-z0-9]+$/i, '')
  } catch {
    return null
  }
}

async function main() {
  await client.connect()
  try {
    const m = dbUrl.match(/\/([^/?]+)(?:\?|$)/)
    const db = m ? client.db(m[1]) : client.db()
    const col = db.collection('design_media')

    // find media without publicId
    const cursor = col.find({ publicId: { $exists: false }, fileUrl: { $regex: 'res.cloudinary.com' } }).limit(500)
    let count = 0
    while (await cursor.hasNext()) {
      const doc = await cursor.next()
      const pub = parsePublicId(doc.fileUrl)
      if (pub) {
        const versionMatch = doc.fileUrl.match(/\/v(\d+)\//)
        const version = versionMatch ? parseInt(versionMatch[1], 10) : null
        await col.updateOne({ _id: doc._id }, { $set: { publicId: pub, publicVersion: version } })
        count++
      }
    }
    console.log('Backfilled publicId for', count, 'media documents')
  } finally { await client.close() }
}

main().catch(e=>{ console.error(e); process.exit(1) })
