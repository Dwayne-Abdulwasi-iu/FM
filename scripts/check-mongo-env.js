#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function loadDotEnvLocal() {
  if (process.env.DATABASE_URL && String(process.env.DATABASE_URL).match(/^mongo/)) return;
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const m = content.match(/^\s*DATABASE_URL\s*=\s*(?:\"|\')?(.*?)(?:\"|\')?\s*$/m);
    if (m && m[1]) process.env.DATABASE_URL = m[1].trim();
  }
}

loadDotEnvLocal();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('ERROR: DATABASE_URL is not set. Set it in the environment or in .env.local (do NOT commit credentials).');
  process.exit(1);
}

if (!String(url).match(/^mongodb(\+srv)?:\/\//)) {
  console.error('ERROR: DATABASE_URL does not look like a MongoDB connection string. It must start with "mongodb://" or "mongodb+srv://".');
  console.error('Current value:', url);
  process.exit(1);
}

console.log('DATABASE_URL looks like a MongoDB URL — proceeding.');
process.exit(0);
