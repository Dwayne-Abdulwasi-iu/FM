#!/usr/bin/env node
import { MongoClient } from 'mongodb'
import fs from 'fs'
import path from 'path'

// Load env if needed
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
  console.log('Usage: node scripts/resolve-duplicate-usernames.mjs [--strategy verified|earliest] [--limit N] [--dry-run] [--apply] [--delete-duplicates] [--output file.json]')
  console.log('This script is destructive when used with --apply and/or --delete-duplicates. Create a DB backup before running against production.')
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) return help()

  let uri = process.env.DATABASE_URL
  if (!uri) { console.error('DATABASE_URL missing'); process.exit(1) }
  uri = correctedUri(uri)

  const strategy = (args.find(a => a === '--strategy') && args[args.indexOf('--strategy') + 1]) || 'verified'
  const limitArgIndex = args.findIndex(a => a === '--limit')
  const limit = limitArgIndex >= 0 && args[limitArgIndex + 1] ? parseInt(args[limitArgIndex + 1], 10) : 100
  const dryRun = args.includes('--dry-run') || (!args.includes('--apply'))
  const apply = args.includes('--apply')
  const deleteDuplicates = args.includes('--delete-duplicates')
  const outputIndex = args.findIndex(a => a === '--output')
  const outputFile = outputIndex >= 0 && args[outputIndex + 1] ? args[outputIndex + 1] : null

  console.log('Resolve duplicate usernames: strategy=', strategy, 'limit=', limit, 'dryRun=', dryRun, 'apply=', apply, 'deleteDuplicates=', deleteDuplicates)

  const client = new MongoClient(uri)
  await client.connect()
  try {
    let dbName = null
    try { const m = uri.match(/\/([^/?]+)(?:\?|$)/); if (m) dbName = m[1] } catch {}
    const db = dbName ? client.db(dbName) : client.db()
    console.log('Connected to DB:', db.databaseName)

    const usersCol = db.collection('users')

    // Find duplicate username groups (case-insensitive)
    const pipeline = [
      { $match: { username: { $exists: true, $ne: null, $ne: '' } } },
      { $project: { username: 1, email: 1, name: 1, createdAt: 1, isVerified: 1, usernameLower: { $toLower: '$username' } } },
      { $group: { _id: '$usernameLower', count: { $sum: 1 }, entries: { $push: '$$ROOT' } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: limit }
    ]

    const dupGroups = await usersCol.aggregate(pipeline).toArray()
    if (!dupGroups || dupGroups.length === 0) {
      console.log('No duplicate username groups found.')
      return
    }

    const report = []

    for (const g of dupGroups) {
      // Determine keeper based on strategy
      let keeper = null
      const entries = g.entries.map(e => ({ id: e._id, username: e.username, email: e.email, name: e.name, createdAt: e.createdAt, isVerified: e.isVerified }))

      if (strategy === 'verified') {
        // prefer verified accounts; if multiple verified choose earliest createdAt
        const verified = entries.filter(e => e.isVerified)
        if (verified.length > 0) keeper = verified.sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt))[0]
      }
      if (!keeper && strategy === 'earliest') {
        keeper = entries.sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt))[0]
      }
      if (!keeper) {
        // fallback to earliest created
        keeper = entries.sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt))[0]
      }

      const keeperId = keeper.id
      const duplicates = entries.filter(e => e.id !== keeperId)

      // For each duplicate, compute counts of affected documents
      const actions = []
      for (const dup of duplicates) {
        const dupId = dup.id
        const counts = {}
        counts.designs = await db.collection('designs').countDocuments({ designerId: dupId })
        counts.sellerEarnings = await db.collection('seller_earnings').countDocuments({ sellerId: dupId })
        counts.favorites = await db.collection('favorites').countDocuments({ userId: dupId })
        counts.cartItems = await db.collection('cart_items').countDocuments({ userId: dupId })
        counts.purchases = await db.collection('purchases').countDocuments({ userId: dupId })
        counts.reviews = await db.collection('reviews').countDocuments({ userId: dupId })
        counts.orders = await db.collection('orders').countDocuments({ customerId: dupId })
        counts.notifications = await db.collection('notifications').countDocuments({ userId: dupId })
        counts.resources = await db.collection('resources').countDocuments({ createdById: dupId })
        counts.chatSessions = await db.collection('chat_sessions').countDocuments({ userId: dupId })
        counts.contactMessages = await db.collection('contact_messages').countDocuments({ userId: dupId })

        actions.push({ dupId, counts })
      }

      report.push({ usernameLower: g._id, keeper: { id: keeperId, username: keeper.username, email: keeper.email }, duplicates: actions })
    }

    // Print summary report
    console.log('Duplicate username groups (summary):')
    for (const r of report) {
      console.log('\nUsername:', r.usernameLower)
      console.log(' Keeper:', r.keeper)
      for (const d of r.duplicates) {
        console.log('  Duplicate id:', d.dupId, 'counts:', d.counts)
      }
    }

    if (outputFile) {
      fs.writeFileSync(outputFile, JSON.stringify({ report, strategy, limit, applied: apply, deleteDuplicates }, null, 2))
      console.log('Wrote report to', outputFile)
    }

    if (!apply) {
      console.log('\nDry-run mode. Use --apply to perform the moves. No changes were made.')
      return
    }

    // Apply changes
    console.log('\nApplying changes...')
    for (const r of report) {
      const keeperId = r.keeper.id
      for (const d of r.duplicates) {
        const dupId = d.dupId
        console.log('Processing duplicate', dupId, '-> keeper', keeperId)

        // Reassign designs
        const resDesigns = await db.collection('designs').updateMany({ designerId: dupId }, { $set: { designerId: keeperId } })
        console.log(' Updated designs:', resDesigns.modifiedCount)

        // Reassign seller earnings
        const resEarnings = await db.collection('seller_earnings').updateMany({ sellerId: dupId }, { $set: { sellerId: keeperId } })
        console.log(' Updated seller_earnings:', resEarnings.modifiedCount)

        // Move favorites: avoid duplicates
        const dupFavorites = await db.collection('favorites').find({ userId: dupId }).toArray()
        for (const f of dupFavorites) {
          const exists = await db.collection('favorites').findOne({ userId: keeperId, designId: f.designId })
          if (exists) {
            await db.collection('favorites').deleteOne({ _id: f._id })
          } else {
            await db.collection('favorites').updateOne({ _id: f._id }, { $set: { userId: keeperId } })
          }
        }

        // Move cart items (dedupe)
        const dupCarts = await db.collection('cart_items').find({ userId: dupId }).toArray()
        for (const c of dupCarts) {
          const exists = await db.collection('cart_items').findOne({ userId: keeperId, designId: c.designId, purchaseType: c.purchaseType })
          if (exists) {
            await db.collection('cart_items').deleteOne({ _id: c._id })
          } else {
            await db.collection('cart_items').updateOne({ _id: c._id }, { $set: { userId: keeperId } })
          }
        }

        // Move purchases (dedupe)
        const dupPurchases = await db.collection('purchases').find({ userId: dupId }).toArray()
        for (const p of dupPurchases) {
          const exists = await db.collection('purchases').findOne({ userId: keeperId, designId: p.designId, purchaseType: p.purchaseType })
          if (exists) {
            await db.collection('purchases').deleteOne({ _id: p._id })
          } else {
            await db.collection('purchases').updateOne({ _id: p._id }, { $set: { userId: keeperId } })
          }
        }

        // Move reviews (dedupe - keep earliest)
        const dupReviews = await db.collection('reviews').find({ userId: dupId }).toArray()
        for (const rdoc of dupReviews) {
          const existing = await db.collection('reviews').findOne({ userId: keeperId, designId: rdoc.designId })
          if (existing) {
            // decide which to keep: keep earliest createdAt
            const keep = (new Date(existing.createdAt) <= new Date(rdoc.createdAt)) ? existing._id : rdoc._id
            const remove = keep === existing._id ? rdoc._id : existing._id
            await db.collection('reviews').deleteOne({ _id: remove })
            if (keep === rdoc._id) {
              // ensure it's assigned to keeper
              await db.collection('reviews').updateOne({ _id: rdoc._id }, { $set: { userId: keeperId } })
            }
          } else {
            await db.collection('reviews').updateOne({ _id: rdoc._id }, { $set: { userId: keeperId } })
          }
        }

        // Reassign orders.customerId
        const resOrders = await db.collection('orders').updateMany({ customerId: dupId }, { $set: { customerId: keeperId } })
        console.log(' Updated orders (customerId):', resOrders.modifiedCount)

        // Reassign notifications, resources, chat_sessions, contact_messages
        await db.collection('notifications').updateMany({ userId: dupId }, { $set: { userId: keeperId } })
        await db.collection('resources').updateMany({ createdById: dupId }, { $set: { createdById: keeperId } })
        await db.collection('chat_sessions').updateMany({ userId: dupId }, { $set: { userId: keeperId } })
        await db.collection('contact_messages').updateMany({ userId: dupId }, { $set: { userId: keeperId } })

        // Mark duplicate account as merged (do not delete by default)
        const mark = { mergedInto: keeperId, mergedAt: new Date() }
        await db.collection('users').updateOne({ _id: dupId }, { $set: mark, $unset: { username: '' } })

        if (deleteDuplicates) {
          // Attempt to delete user document; this may fail if there are remaining refs due to race conditions
          try {
            await db.collection('users').deleteOne({ _id: dupId })
            console.log(' Deleted duplicate user doc:', dupId)
          } catch (e) {
            console.error(' Failed to delete duplicate user:', dupId, e)
          }
        }
      }
    }

    console.log('Apply complete.')

  } finally {
    await client.close()
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
