import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env.local', import.meta.url) });

const uri = process.env.DATABASE_URL;
if (!uri) {
  console.error('DATABASE_URL not found in .env.local or environment');
  process.exit(2);
}

const outDir = path.resolve('./tmp-db-backups');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const client = new MongoClient(uri, { useUnifiedTopology: true });

async function dump() {
  try {
    await client.connect();
    const dbName = client.db().databaseName;
    console.log('Connected to DB:', dbName);

    const db = client.db();
    const collections = ['designs', 'design_media'];

    for (const collName of collections) {
      const coll = db.collection(collName);
      const docs = await coll.find({}).toArray();
      const filePath = path.join(outDir, `${ts}-${collName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
      console.log(`Wrote ${docs.length} documents to ${filePath}`);
    }

    console.log('Backup complete. Files written to', outDir);
  } catch (err) {
    console.error('Backup failed:', err);
    process.exit(3);
  } finally {
    await client.close();
  }
}

await dump();
