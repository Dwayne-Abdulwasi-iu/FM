import fs from 'fs'
import path from 'path'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

const dotenvPath = process.env.DOTENV_CONFIG_PATH || '.env.local'
dotenv.config({ path: dotenvPath })

const uri = process.env.DATABASE_URL
if (!uri) {
  console.error('No DATABASE_URL found in environment. Aborting.')
  process.exit(1)
}

const outDir = './backups'
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const outPath = path.join(outDir, `indexes-${timestamp}.json`)

async function main() {
  await fs.promises.mkdir(outDir, { recursive: true })
  const client = new MongoClient(uri, { maxPoolSize: 5 })
  try {
    await client.connect()
    const db = client.db()
    const cols = await db.listCollections().toArray()
    const result = {}
    for (const c of cols) {
      const name = c.name
      try {
        const indexes = await db.collection(name).indexes()
        result[name] = indexes
      } catch (err) {
        console.error(`Failed to get indexes for ${name}:`, err.message || err)
        result[name] = { error: String(err) }
      }
    }
    fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), indexes: result }, null, 2))
    console.log('Wrote indexes file to', outPath)
  } finally {
    await client.close()
  }
}

main().catch(err => { console.error('Index export failed:', err); process.exit(2) })
