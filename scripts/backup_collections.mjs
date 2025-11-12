#!/usr/bin/env node
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { MongoClient } from 'mongodb'

const uri = process.env.DATABASE_URL
if (!uri) {
  console.error('DATABASE_URL not set. Please ensure .env.local exists and contains DATABASE_URL')
  process.exit(3)
}

function guessDbNameFromUri(u) {
  try {
    const m = u.match(/\/(?<db>[^?]+)(\?|$)/)
    return m?.groups?.db || undefined
  } catch { return undefined }
}

const ts = new Date().toISOString().replace(/[:.]/g, '_')
const outRoot = path.resolve(process.cwd(), 'backups', `fashion_dev-${ts}`)
fs.mkdirSync(outRoot, { recursive: true })

async function main(){
  const dbName = guessDbNameFromUri(uri)
  const client = new MongoClient(uri, { maxPoolSize: 5 })
  await client.connect()
  const db = dbName ? client.db(dbName) : client.db()
  console.log(`Connected to DB: ${db.databaseName}`)

  const cols = await db.listCollections().toArray()
  const exported = []

  for (const c of cols) {
    const name = c.name
    const outFile = path.join(outRoot, `${name}.jsonl.gz`)
    const out = fs.createWriteStream(outFile)
    const gzip = zlib.createGzip()
    gzip.pipe(out)
    const cursor = db.collection(name).find({}, { batchSize: 500 })
    for await (const doc of cursor) {
      const serialized = JSON.stringify(doc, function replacer(k, v) {
        if (v && typeof v === 'object' && v._bsontype === 'ObjectID') return { $oid: v.toString() }
        if (v instanceof Date) return { $date: v.toISOString() }
        return v
      })
      gzip.write(serialized + '\n')
    }
    gzip.end()
    await new Promise((res, rej) => out.on('close', res).on('error', rej))
    const stat = fs.statSync(outFile)
    exported.push({ collection: name, file: outFile, size: stat.size })
  }

  await client.close()
  console.log(JSON.stringify({ exported }))
}

main().catch(err => {
  console.error('Backup failed:', err)
  process.exit(1)
})
