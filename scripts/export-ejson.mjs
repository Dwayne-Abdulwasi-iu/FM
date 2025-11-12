import fs from 'fs'
import zlib from 'zlib'
import { MongoClient } from 'mongodb'
import { EJSON } from 'bson'
import dotenv from 'dotenv'

// Load env from .env.local by default; allow dotenv_config_path override when running with -r dotenv/config
const dotenvPath = process.env.DOTENV_CONFIG_PATH || '.env.local'
dotenv.config({ path: dotenvPath })

const uri = process.env.DATABASE_URL
if (!uri) {
  console.error('No DATABASE_URL found in environment. Aborting.')
  process.exit(1)
}

const outDir = './backups'
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

async function main() {
  await fs.promises.mkdir(outDir, { recursive: true })

  const client = new MongoClient(uri, { maxPoolSize: 10 })
  try {
    console.log('Connecting to database...')
    await client.connect()
    const db = client.db() // uses DB from URI
    const cols = await db.listCollections().toArray()
    if (!cols.length) {
      console.log('No collections found in DB.')
      return
    }

    for (const c of cols) {
      const name = c.name
      const outPath = `${outDir}/${name}-${timestamp}.json.gz`
      console.log(`Exporting collection ${name} -> ${outPath}`)

      const gzip = zlib.createGzip()
      const ws = fs.createWriteStream(outPath)
      gzip.pipe(ws)

      const cursor = db.collection(name).find({})
      let count = 0
      for await (const doc of cursor) {
        // Use EJSON to preserve ObjectId, Date, etc.
        gzip.write(EJSON.stringify(doc) + '\n')
        count++
      }

      gzip.end()
      await new Promise((resolve, reject) => {
        ws.on('close', resolve)
        ws.on('error', reject)
        gzip.on('error', reject)
      })

      const stats = await fs.promises.stat(outPath)
      console.log(`Wrote ${outPath} (${stats.size} bytes) — ${count} documents`)
    }
  } finally {
    await client.close()
  }
}

main().catch(err => {
  console.error('Export failed:', err)
  process.exitCode = 2
})
