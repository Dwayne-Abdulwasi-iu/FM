#!/usr/bin/env node
import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'

dotenv.config({ path: process.cwd() + '/.env.local' })

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error('DATABASE_URL not set in .env.local; cannot connect to database')
  process.exit(1)
}

const client = new MongoClient(dbUrl)

async function main() {
  const publicId = process.argv[2]
  if (!publicId) {
    console.error('Usage: node scripts/find-design-across-dbs.js <public_id>')
    process.exit(2)
  }

  const tail = publicId.split('/').pop()

  await client.connect()
  try {
    const admin = client.db().admin()
    let dbs = []
    try {
      const info = await admin.listDatabases()
      dbs = info.databases.map(d => d.name)
    } catch (e) {
      // If listDatabases isn't allowed, fall back to trying the DB name parsed from the URL
      console.warn('Could not list databases (permission?), falling back to connection DB')
      const m = dbUrl.match(/\/([^/?]+)(?:\?|$)/)
      if (m) dbs = [m[1]]
    }

    const tried = []
    for (const name of dbs) {
      if (['admin','local','config'].includes(name)) continue
      tried.push(name)
      try {
        const db = client.db(name)
        const cols = await db.listCollections({ name: 'designs' }).toArray()
        if (!cols.length) continue

        const designsCol = db.collection('designs')

        const queries = [
          { 'mediaFiles.fileUrl': { $regex: publicId } },
          { 'mediaFiles.fileUrl': { $regex: tail } },
          { 'imageUrl': { $regex: tail } },
          { 'thumbnailUrl': { $regex: tail } },
          { 'mediaFiles.publicId': publicId }
        ]

        for (const q of queries) {
          const found = await designsCol.findOne(q)
          if (found) {
            console.log('Found in DB:', name)
            console.log('Design _id:', found._id)
            console.log('Title:', found.title)
            console.log('Matched query:', JSON.stringify(q))
            console.log('Media files sample:', (found.mediaFiles || []).slice(0,3))
            process.exit(0)
          }
        }
      } catch (e) {
        console.warn('Error checking DB', name, e.message || e)
      }
    }

    console.error('No design found in scanned DBs. Databases tried:', tried.join(', '))
    process.exit(1)
  } finally {
    await client.close()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
