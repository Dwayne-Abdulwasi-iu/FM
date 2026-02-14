import { MongoClient } from 'mongodb'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const MONGODB_URL = process.env.DATABASE_URL
if (!MONGODB_URL) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

async function backfillAddedByAdmin() {
  const client = new MongoClient(MONGODB_URL)
  
  try {
    await client.connect()
    const db = client.db('fashion_dev')
    
    // Backfill featured_designs
    console.log('Backfilling featured_designs...')
    const designsResult = await db.collection('featured_designs').updateMany(
      { addedByAdmin: { $exists: false } },
      { $set: { addedByAdmin: false } }
    )
    console.log(`Updated ${designsResult.modifiedCount} featured designs`)
    
    // Backfill featured_boutique_products
    console.log('Backfilling featured_boutique_products...')
    const boutiquesResult = await db.collection('featured_boutique_products').updateMany(
      { addedByAdmin: { $exists: false } },
      { $set: { addedByAdmin: false } }
    )
    console.log(`Updated ${boutiquesResult.modifiedCount} featured boutique products`)
    
    console.log('✓ Backfill complete')
  } catch (error) {
    console.error('Backfill failed:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

backfillAddedByAdmin()
