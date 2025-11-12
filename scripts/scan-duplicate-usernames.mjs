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

if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8')
      const m = raw.match(/^[ \t]*DATABASE_URL\s*=\s*(?:"([^\"]+)"|'([^']+)'|([^\r\n#]+))/m)
      const val = m ? (m[1] || m[2] || m[3]).trim() : null
      if (val) {
        process.env.DATABASE_URL = val
        console.log('Loaded DATABASE_URL from .env.local (raw parse)')
      }
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
  console.log('Usage: node scripts/scan-duplicate-usernames.mjs [--limit N] [--output file.json] [--fail-on-duplicates]')
  console.log('Options:')
  console.log('  --limit N               Limit output to top N duplicate username groups (default: 100)')
  console.log('  --output <file>         Write full JSON report to file')
  console.log('  --fail-on-duplicates    Exit with code 2 if any duplicate username groups are found')
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) return help()

  let uri = process.env.DATABASE_URL
  if (!uri) { console.error('DATABASE_URL missing'); process.exit(1) }
  uri = correctedUri(uri)

  const limitArgIndex = args.findIndex(a => a === '--limit')
  const limit = limitArgIndex >= 0 && args[limitArgIndex + 1] ? parseInt(args[limitArgIndex + 1], 10) : 100
  const outputIndex = args.findIndex(a => a === '--output')
  const outputFile = outputIndex >= 0 && args[outputIndex + 1] ? args[outputIndex + 1] : null
  const failOnDuplicates = args.includes('--fail-on-duplicates') || process.env.FAIL_ON_DUPLICATES === '1'

  const client = new MongoClient(uri)
  await client.connect()
  try {
    // Infer DB name
    let dbName = null
    try { const m = uri.match(/\/([^/?]+)(?:\?|$)/); if (m) dbName = m[1] } catch {}
    const db = dbName ? client.db(dbName) : client.db()
    console.log('Connected to DB:', db.databaseName)

    const users = db.collection('user')

    // Use aggregation to group by lowercased username and find duplicates
    const pipeline = [
      { $match: { username: { $exists: true, $ne: null, $ne: '' } } },
      { $project: { username: 1, email: 1, name: 1, createdAt: 1, usernameLower: { $toLower: '$username' } } },
      { $group: { _id: '$usernameLower', count: { $sum: 1 }, entries: { $push: { id: '$_id', username: '$username', email: '$email', name: '$name', createdAt: '$createdAt' } } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: limit }
    ]

    const cursor = users.aggregate(pipeline)
    const results = await cursor.toArray()
    if (!results || results.length === 0) {
      console.log('No duplicate usernames found.')
      if (outputFile) fs.writeFileSync(outputFile, JSON.stringify({ duplicates: [] }, null, 2))
      return
    }

    console.log(`Found ${results.length} duplicate username group(s) (showing up to ${limit}):`)
    let totalGroups = 0
    let totalUsers = 0
    for (const g of results) {
      totalGroups++
      totalUsers += g.count
      console.log('\nUsername (case-insensitive):', g._id, '- count:', g.count)
      for (const e of g.entries) {
        console.log(' -', e.id?.toString?.() ?? e.id, '| username=', e.username, '| email=', e.email || '(no-email)', '| name=', e.name || '(no-name)', '| createdAt=', e.createdAt)
      }
    }

    console.log('\nSummary:')
    console.log('-', totalGroups, 'duplicate groups')
    console.log('-', totalUsers, 'user accounts involved')

    if (outputFile) {
      const out = { duplicates: results, summary: { groups: totalGroups, users: totalUsers } }
      fs.writeFileSync(outputFile, JSON.stringify(out, null, 2))
      console.log('Wrote JSON report to', outputFile)
    }

    if (failOnDuplicates) {
      console.error('Duplicate usernames found; failing as requested.')
      process.exit(2)
    }

  } finally {
    await client.close()
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
