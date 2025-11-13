#!/usr/bin/env node
import dotenv from 'dotenv'
import { MongoClient, ObjectId } from 'mongodb'

dotenv.config({ path: process.cwd() + '/.env.local' })
const dbUrl = process.env.DATABASE_URL
if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1) }
const client = new MongoClient(dbUrl)
async function main() {
  const id = process.argv[2]
  if (!id) { console.error('Usage: node scripts/find-design-by-id.js <id>'); process.exit(2) }
  await client.connect()
  try {
    const m = dbUrl.match(/\/([^/?]+)(?:\?|$)/)
    const db = m ? client.db(m[1]) : client.db()
    const col = db.collection('designs')
    const queries = [ { id }, { _id: id }, { _id: ObjectId.isValid(id) ? new ObjectId(id) : id } ]
    for (const q of queries) {
      try {
        const d = await col.findOne(q)
        if (d) { console.log('Found with query', JSON.stringify(q)); console.log(JSON.stringify(d, null, 2)); process.exit(0) }
      } catch (e) {}
    }
    console.error('Not found')
    process.exit(1)
  } finally { await client.close() }
}
main().catch(e=>{ console.error(e); process.exit(1) })
