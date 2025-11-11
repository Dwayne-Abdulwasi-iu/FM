#!/usr/bin/env node
import 'dotenv/config'
import { MongoClient } from 'mongodb'

async function main(){
  const uri = process.env.DATABASE_URL
  if (!uri) { console.error('DATABASE_URL missing'); process.exit(1) }

  // try to infer DB name from the connection string path
  let dbName = null
  try {
    const m = uri.match(/\/([^/?]+)(?:\?|$)/)
    if (m) dbName = m[1]
  } catch {}
  
  const client = new MongoClient(uri)
  await client.connect()
  try {
    const db = dbName ? client.db(dbName) : client.db()
    console.log('Connected to DB:', db.databaseName)

    const httpPrefix = 'http://res.cloudinary.com'
    const httpsPrefix = 'https://res.cloudinary.com'

    console.log('Updating designs.thumbnailUrl...')
    const designsCol = db.collection('designs')
    const designsFilter = { thumbnailUrl: { $regex: '^' + httpPrefix } }
    const designsUpdate = [
      { $set: { thumbnailUrl: { $replaceOne: { input: '$thumbnailUrl', find: httpPrefix, replacement: httpsPrefix } } } }
    ]
    const dRes = await designsCol.updateMany(designsFilter, designsUpdate)
    console.log(`Designs matched: ${dRes.matchedCount}, modified: ${dRes.modifiedCount}`)

    console.log('Updating design_media.fileUrl...')
    const mediaCol = db.collection('design_media')
    const mediaFilter = { fileUrl: { $regex: '^' + httpPrefix } }
    const mediaUpdate = [
      { $set: { fileUrl: { $replaceOne: { input: '$fileUrl', find: httpPrefix, replacement: httpsPrefix } } } }
    ]
    const mRes = await mediaCol.updateMany(mediaFilter, mediaUpdate)
    console.log(`Media matched: ${mRes.matchedCount}, modified: ${mRes.modifiedCount}`)

    console.log('Done.');
  } finally {
    await client.close()
  }
}

main().catch((err)=>{ console.error(err); process.exit(1) })
