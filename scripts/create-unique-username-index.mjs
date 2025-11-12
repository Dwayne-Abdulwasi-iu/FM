#!/usr/bin/env node
import { MongoClient } from 'mongodb'
import fs from 'fs'
import path from 'path'

// Load .env.local if DATABASE_URL isn't set
if (!process.env.DATABASE_URL) {
  try {
    const dotenv = await import('dotenv')
    const envPath = path.join(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath })
      console.log('Loaded env from .env.local')
    }
  } catch {
    // ignore
  }
}

function correctedUri(orig) {
  if (!orig) return null
  return orig.replace(/^(mongo\+srv:\/\/)/i, 'mongodb+srv://').replace(/^(mongo:\/\/)/i, 'mongodb://')
}

function help() {
  console.log('Usage: node scripts/create-unique-username-index.mjs [--create-index] [--drop-index] [--index-name name] [--collection users] [--dry-run] [--partial]')
  console.log('By default the script runs in dry-run mode: it checks for duplicates and reports what it would do.')
  console.log('Options:')
  console.log('  --create-index       Create the unique, case-insensitive index (requires no duplicates).')
  console.log('  --drop-index         Drop the index (useful for rollback).')
  console.log('  --index-name <name>  Index name to create/drop (default: username_ci_unique).')
  console.log('  --collection <name>  Collection name (default: users).')
  console.log('  --partial            Create index with partialFilterExpression to exclude null/missing usernames.')
  console.log('  --dry-run            Do not perform any writes (default).')
}

async function main(){
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) return help()

  const createIndex = args.includes('--create-index')
  const dropIndex = args.includes('--drop-index')
  const dryRun = args.includes('--dry-run') || (!createIndex && !dropIndex)
  const idxNameIndex = args.findIndex(a=>a==='--index-name')
  const indexName = idxNameIndex >=0 && args[idxNameIndex+1] ? args[idxNameIndex+1] : 'username_ci_unique'
  const collIndex = args.findIndex(a=>a==='--collection')
  const collName = collIndex >=0 && args[collIndex+1] ? args[collIndex+1] : 'users'
  const partial = args.includes('--partial')

  let uri = process.env.DATABASE_URL
  if (!uri) { console.error('DATABASE_URL missing'); process.exit(1) }
  uri = correctedUri(uri)

  const client = new MongoClient(uri)
  await client.connect()
  try {
    let dbName = null
    try { const m = uri.match(/\/([^/?]+)(?:\?|$)/); if (m) dbName = m[1] } catch {}
    const db = dbName ? client.db(dbName) : client.db()
    console.log('Connected to DB:', db.databaseName)

    const users = db.collection(collName)

    // Check duplicates (case-insensitive)
    const pipeline = [
      { $match: { username: { $exists: true, $ne: null, $ne: '' } } },
      { $project: { usernameLower: { $toLower: '$username' }, username: 1 } },
      { $group: { _id: '$usernameLower', count: { $sum: 1 }, samples: { $push: '$username' } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 100 }
    ]

    const dupGroups = await users.aggregate(pipeline).toArray()
    if (dupGroups.length > 0) {
      console.error('Found duplicate username groups (case-insensitive). You must resolve these before creating a unique index:')
      for (const g of dupGroups) {
        console.error('-', g._id, 'count=', g.count, 'examples=', g.samples.slice(0,5))
      }
      console.error('Resolve duplicates first (see scripts/resolve-duplicate-usernames.mjs), or run with --drop-index after manual resolution.')
      process.exit(2)
    }

    console.log('No duplicates found. It is safe to create the unique index.')

    if (dropIndex) {
      console.log(dryRun ? '[dry-run] Would drop index' : `Dropping index ${indexName} on ${collName}...`)
      if (!dryRun) {
        try {
          const r = await users.dropIndex(indexName)
          console.log('dropIndex result:', r)
        } catch (e) {
          console.error('dropIndex failed:', e.message || e)
        }
      }
      return
    }

    // create unique, case-insensitive index using collation
    const indexSpec = { username: 1 }
    const indexOptions = { name: indexName, unique: true, collation: { locale: 'en', strength: 2 } }
    if (partial) {
      // include only documents where username is stored as a string.
      // This avoids matching null/missing values (which can appear many times) and
      // is expressed as a supported partial index expression.
      indexOptions.partialFilterExpression = { username: { $type: 'string' } }
    }

  console.log(dryRun ? `[dry-run] Would create unique index ${indexName} on ${collName} with options: ${JSON.stringify(indexOptions)}` : `Creating unique index ${indexName} on ${collName}...`)
    if (!dryRun && createIndex) {
      try {
        const res = await users.createIndex(indexSpec, indexOptions)
        console.log('createIndex result:', res)
      } catch (e) {
        console.error('createIndex failed:', e.message || e)
        process.exit(3)
      }
    }

  } finally {
    await client.close()
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
