import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import readline from 'readline'
import { MongoClient } from 'mongodb'
import { EJSON } from 'bson'
import dotenv from 'dotenv'

const dotenvPath = process.env.DOTENV_CONFIG_PATH || '.env.local'
dotenv.config({ path: dotenvPath })

const uri = process.env.DATABASE_URL
if (!uri) {
  console.error('No DATABASE_URL found in environment. Aborting.')
  process.exit(1)
}

const backupsDir = process.argv[2] || './backups'
const dropFlag = process.argv.includes('--drop')
const batchSizeArg = parseInt(process.env.RESTORE_BATCH_SIZE || '500', 10)

async function restoreFile(filePath, db, dropBefore = false) {
  const base = path.basename(filePath)
  // infer collection name from filename: <collection>-<timestamp>.json.gz
  const match = base.match(/^(.+?)-\d{4}-\d{2}-\d{2}T/)
  const collName = match ? match[1] : base.replace(/\.json\.gz$/, '')
  console.log(`Restoring collection '${collName}' from ${filePath} (dropBefore=${dropBefore})`)
  const coll = db.collection(collName)
  if (dropBefore) {
    try {
      await coll.drop()
      console.log(`Dropped collection ${collName}`)
    } catch (err) {
      // ignore if not exist
    }
  }

  const gunzip = zlib.createGunzip()
  const rs = fs.createReadStream(filePath)
  const rl = readline.createInterface({ input: rs.pipe(gunzip) })

  let buffer = []
  let total = 0
  for await (const line of rl) {
    if (!line || !line.trim()) continue
    try {
      const doc = EJSON.parse(line)
      buffer.push(doc)
    } catch (err) {
      console.error('Failed to parse line as EJSON', err)
      continue
    }

    if (buffer.length >= batchSizeArg) {
      await coll.insertMany(buffer, { ordered: false }).catch(e => console.error('insertMany error:', e.message || e))
      total += buffer.length
      buffer = []
    }
  }
  if (buffer.length) {
    await coll.insertMany(buffer, { ordered: false }).catch(e => console.error('insertMany error:', e.message || e))
    total += buffer.length
  }
  console.log(`Finished ${collName}: inserted ~${total} documents`)
}

async function main() {
  const client = new MongoClient(uri, { maxPoolSize: 10 })
  try {
    await client.connect()
    const db = client.db()
    const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.json.gz'))
    if (!files.length) {
      console.log('No backup files found in', backupsDir)
      return
    }
    for (const f of files) {
      const full = path.join(backupsDir, f)
      await restoreFile(full, db, dropFlag)
    }
    console.log('Restore complete. Consider recreating indexes from the indexes-*.json file after restore.')
  } finally {
    await client.close()
  }
}

main().catch(err => { console.error('Restore failed:', err); process.exit(2) })
