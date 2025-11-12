import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'

const dotenvPath = process.env.DOTENV_CONFIG_PATH || '.env.local'
dotenv.config({ path: dotenvPath })

const uri = process.env.DATABASE_URL
if (!uri) {
  console.error('No DATABASE_URL found in environment. Aborting.')
  process.exit(1)
}

async function main() {
  const client = new MongoClient(uri, { maxPoolSize: 5 })
  await client.connect()
  const db = client.db()
  const coll = db.collection('users')

  const ts = Date.now()
  const base = `smoke_test_user_${ts}`
  const doc1 = { username: base, email: `smoketest+${ts}@example.com`, createdAt: new Date() }
  const doc2 = { username: base.toUpperCase(), email: `smoketest+${ts}+dup@example.com`, createdAt: new Date() }

  console.log('Inserting first test user with username:', doc1.username)
  const inserted = await coll.insertOne(doc1)
  console.log('Inserted _id:', inserted.insertedId)

  console.log('Attempting to insert second test user with username (case-variant):', doc2.username)
  try {
    await coll.insertOne(doc2)
    console.error('ERROR: second insert succeeded unexpectedly — index did not block duplicate')
    // cleanup
    await coll.deleteMany({ username: { $regex: `^${base}` } })
    process.exit(2)
  } catch (err) {
    // Mongo duplicate key error code is 11000
    if (err && err.code === 11000) {
      console.log('Success: duplicate key error thrown as expected (11000). Index is enforcing uniqueness.')
      // cleanup first doc
      await coll.deleteOne({ _id: inserted.insertedId })
      process.exit(0)
    } else {
      console.error('Unexpected error during second insert:', err && err.message ? err.message : err)
      // attempt cleanup
      try { await coll.deleteMany({ username: { $regex: `^${base}` } }) } catch (e) {}
      process.exit(3)
    }
  } finally {
    await client.close()
  }
}

main().catch(err => { console.error('Test failed:', err); process.exit(4) })
