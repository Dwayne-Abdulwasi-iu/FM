#!/usr/bin/env node
import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'
dotenv.config({ path: process.cwd() + '/.env.local' })
const dbUrl = process.env.DATABASE_URL
if (!dbUrl) { console.error('DATABASE_URL missing'); process.exit(1) }
const client = new MongoClient(dbUrl)
async function main() {
  const id = process.argv[2]
  if (!id) { console.error('Usage: node scripts/find-media-for-design.js <designId>'); process.exit(2) }
  await client.connect()
  try {
    const m = dbUrl.match(/\/([^/?]+)(?:\?|$)/)
    const db = m ? client.db(m[1]) : client.db()
    const cols = await db.listCollections().toArray()
    console.log('Collections:', cols.map(c=>c.name).join(', '))
    const possible = ['designMedia','DesignMedia','design_media','mediaFiles','medias','media']
    for (const name of cols.map(c=>c.name)) {
      if (name.toLowerCase().includes('media')) {
        const col = db.collection(name)
        const docs = await col.find({ designId: id }).limit(20).toArray()
        if (docs.length) {
          console.log('Found media in collection', name)
          console.log(JSON.stringify(docs, null, 2))
          return
        }
      }
    }
    // fallback: search any collection for fileUrl containing tail
    const tail = id
    for (const name of cols.map(c=>c.name)) {
      try {
        const col = db.collection(name)
        const sample = await col.find({ fileUrl: { $regex: tail } }).limit(5).toArray()
        if (sample.length) {
          console.log('Found fileUrl in collection', name)
          console.log(JSON.stringify(sample, null, 2))
          return
        }
      } catch (e) {}
    }
    console.log('No media docs found for design', id)
  } finally { await client.close() }
}
main().catch(e=>{ console.error(e); process.exit(1) })
