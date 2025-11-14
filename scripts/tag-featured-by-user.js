#!/usr/bin/env node
/**
 * Usage:
 *  node scripts/tag-featured-by-user.js <designerId> [--dry-run]
 *
 * Requirements:
 *  - Set DATABASE_URL in environment or in .env.local (mongodb+srv or mongo URL)
 *
 * This script will add the tag 'featured' to the `tags` array on matching designs
 * for the provided designerId. It is conservative and supports a dry-run to show
 * which documents would be updated.
 */

const { MongoClient } = require('mongodb')
const fs = require('fs')
const path = require('path')

async function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf8')
  content.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(.*))\s*$/)
    if (!m) return
    const key = m[1]
    const val = m[2] ?? m[3] ?? m[4] ?? ''
    if (!process.env[key]) process.env[key] = val
  })
}

async function main() {
  await loadEnvLocal()
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('Usage: node scripts/tag-featured-by-user.js <designerId> [--dry-run]')
    process.exit(1)
  }
  const designerId = args[0]
  const dryRun = args.includes('--dry-run')

  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL not set in environment or .env.local')
    process.exit(1)
  }

  const client = new MongoClient(url)
  try {
    await client.connect()
    const dbName = (new URL(url)).pathname.replace(/^\//, '') || undefined
    const db = dbName ? client.db(dbName) : client.db()

    const designs = db.collection('designs')

    const filter = { designerId }
    const docs = await designs.find(filter).toArray()
    if (!docs.length) {
      console.log('No designs found for designerId:', designerId)
      return
    }

    console.log(`Found ${docs.length} designs for designerId ${designerId}`)

    const toUpdate = []
    for (const d of docs) {
      const tags = Array.isArray(d.tags) ? d.tags.map(t => String(t).toLowerCase()) : []
      if (!tags.includes('featured')) {
        toUpdate.push(d._id || d.id)
      }
    }

    if (!toUpdate.length) {
      console.log('All matching designs already have the featured tag.')
      return
    }

    console.log(`${toUpdate.length} designs will be updated to include the 'featured' tag.`)
    if (dryRun) {
      console.log('Dry run enabled. The following document ids would be updated:')
      console.log(toUpdate)
      return
    }

    const res = await designs.updateMany(
      { designerId, tags: { $ne: 'featured' } },
      { $addToSet: { tags: 'featured' }, $set: { updatedAt: new Date() } }
    )

    console.log('Update result:', res.result || res)
    console.log(`Tagged ${res.modifiedCount || res.modifiedCount === 0 ? res.modifiedCount : res.nModified} designs as featured.`)
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await client.close()
  }
}

main()
