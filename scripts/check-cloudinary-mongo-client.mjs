#!/usr/bin/env node
import { MongoClient } from 'mongodb'
import fs from 'fs'
import path from 'path'

// Ensure .env.local is loaded if present and DATABASE_URL isn't already set
if (!process.env.DATABASE_URL) {
  try {
    const dotenv = await import('dotenv')
    const envPath = path.join(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath })
      console.log('Loaded env from .env.local')
    }
  } catch (err) {
    // ignore
  }
}

// Fallback: if dotenv didn't set it, try to parse .env.local for DATABASE_URL ourselves
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8')
      const m = raw.match(/^[ \t]*DATABASE_URL\s*=\s*(?:\"([^\"]+)\"|'([^']+)'|([^\r\n#]+))/m)
      const val = m ? (m[1] || m[2] || m[3]).trim() : null
      if (val) {
        process.env.DATABASE_URL = val
        console.log('Loaded DATABASE_URL from .env.local (raw parse)')
      }
    }
  } catch (e) {
    // ignore
  }
}

function correctedUri(orig) {
  if (!orig) return null
  return orig.replace(/^(mongo\+srv:\/\/)/i, 'mongodb+srv://').replace(/^(mongo:\/\/)/i, 'mongodb://')
}

async function main(){
  let uri = process.env.DATABASE_URL
  if (!uri) { console.error('DATABASE_URL missing'); process.exit(1) }
  uri = correctedUri(uri)

  const client = new MongoClient(uri)
  await client.connect()
  try {
    // Infer DB name from connection string path if present
    let dbName = null
    try { const m = uri.match(/\/([^/?]+)(?:\?|$)/); if (m) dbName = m[1] } catch {}
    const db = dbName ? client.db(dbName) : client.db()
    console.log('Connected to DB:', db.databaseName)

    const col = db.collection('designs')
    const filter = { thumbnailUrl: { $regex: 'res.cloudinary.com', $options: 'i' } }
    const count = await col.countDocuments(filter)
    console.log('Designs with Cloudinary thumbnails:', count)

    if (count === 0) {
      console.log('No Cloudinary thumbnails found.')
      return
    }

    const docs = await col.find(filter, { projection: { thumbnailUrl: 1 } }).limit(500).toArray()
    let httpCount = 0
    for (const d of docs) {
      const url = d.thumbnailUrl || ''
      const proto = url.startsWith('https://') ? 'https' : url.startsWith('http://') ? 'http' : 'other'
      console.log('-', d._id?.toString?.() ?? d.id ?? '<no-id>', proto, url)
      if (proto === 'http') httpCount++
    }

    // If requested, fail with non-zero exit when any http Cloudinary URLs are found.
    const failOnHttp = process.argv.includes('--fail-on-http') || process.env.FAIL_ON_HTTP === '1'
    if (failOnHttp) {
      if (httpCount > 0) {
        console.error(`Found ${httpCount} http:// Cloudinary thumbnail(s). Failing as requested.`)
        process.exit(2)
      } else {
        console.log('No http Cloudinary thumbnails found.')
      }
    }
  } finally {
    await client.close()
  }
}

main().catch((err)=>{ console.error(err); process.exit(1) })
