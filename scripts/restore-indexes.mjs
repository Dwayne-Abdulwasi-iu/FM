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

// Parse args: support --dry-run and optional filename
const rawArgs = process.argv.slice(2)
const dryRun = rawArgs.includes('--dry-run')
const nonFlagArgs = rawArgs.filter(a => !a.startsWith('-') && a !== '--dry-run')
const indexesFile = nonFlagArgs[0] || fs.readdirSync('./backups').find(f => f.startsWith('indexes-') && f.endsWith('.json'))
if (!indexesFile) {
  console.error('No indexes file found in ./backups. Provide path as first argument or add an indexes-*.json file under ./backups')
  process.exit(1)
}

const indexesPath = path.resolve('./backups', indexesFile)
let data
try {
  data = JSON.parse(fs.readFileSync(indexesPath, 'utf8'))
} catch (err) {
  console.error('Failed to read or parse indexes file:', indexesPath, err && err.message)
  process.exit(1)
}

async function main() {
  const client = new MongoClient(uri, { maxPoolSize: 5 })
  try {
    await client.connect()
    const db = client.db()
    const idxs = data.indexes || {}
    for (const [collName, indexes] of Object.entries(idxs)) {
      const coll = db.collection(collName)
      const count = Array.isArray(indexes) ? indexes.length : 0
      console.log(`Processing indexes for ${collName} (${count} entries)`)
      if (!Array.isArray(indexes)) continue
      for (const idx of indexes) {
        if (idx.name === '_id_') continue
        const opts = { ...idx }
        delete opts.key
        delete opts.ns
        const what = `Create index ${idx.name} on ${collName} with key=${JSON.stringify(idx.key)} opts=${JSON.stringify(opts)}`

        // Check whether an index with the same name already exists on the collection.
        let alreadyExists = false
        try {
          const existingIndexes = await coll.indexes()
          alreadyExists = existingIndexes.some(e => e && e.name === idx.name)
        } catch (err) {
          // If listing indexes fails, log and proceed to create (non-fatal)
          console.error(`  Warning: could not list existing indexes for ${collName}:`, err && err.message)
        }

        if (alreadyExists) {
          console.log(`  Skipping existing index ${idx.name} on ${collName}`)
          continue
        }

        if (dryRun) {
          console.log(' DRY-RUN:', what)
        } else {
          try {
            await coll.createIndex(idx.key, opts)
            console.log(`  Created index ${idx.name} on ${collName}`)
          } catch (e) {
            console.error(`  Failed to create index ${idx.name} on ${collName}:`, (e && e.message) || e)
          }
        }
      }
    }
  } finally {
    await client.close()
  }
}

main().catch(err => { console.error('Index restore failed:', err); process.exit(2) })
