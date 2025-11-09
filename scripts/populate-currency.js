#!/usr/bin/env node
const { MongoClient } = require('mongodb')

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL not set in environment')
    process.exit(1)
  }

  let dbName
  try {
    const u = new URL(url)
    dbName = (u.pathname || '').replace(/^\//, '') || undefined
  } catch (err) {
    console.error('Failed to parse DATABASE_URL:', err)
    process.exit(1)
  }

  const client = new MongoClient(url)
  try {
    await client.connect()
    const db = dbName ? client.db(dbName) : client.db()

    console.log('Connected to MongoDB, database:', db.databaseName)

    const designsResult = await db.collection('designs').updateMany(
      { currency: { $exists: false } },
      { $set: { currency: 'USD' } }
    )
    console.log(`Designs updated: ${designsResult.modifiedCount}`)

    const ordersResult = await db.collection('orders').updateMany(
      { currency: { $exists: false } },
      { $set: { currency: 'USD' } }
    )
    console.log(`Orders updated: ${ordersResult.modifiedCount}`)

    console.log('Populate currency script completed.')
  } finally {
    await client.close()
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
