const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// If DATABASE_URL isn't a mongodb URL, try to load it from .env.local in repo root
try {
  const current = process.env.DATABASE_URL;
  if (!current || !String(current).startsWith('mongo')) {
    const envPath = path.resolve(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const m = envContent.match(/^\s*DATABASE_URL\s*=\s*(?:\"|\')?(.*?)(?:\"|\')?\s*$/m);
      if (m && m[1]) {
        process.env.DATABASE_URL = m[1].trim();
      }
    }
  }
} catch (e) {
  // ignore parsing errors, we'll show a clearer message later
}

// Create a Prisma client instance that is safe to reuse in development
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

async function testMongoConnection() {
  try {
    console.log('DATABASE_URL is', process.env.DATABASE_URL ? '[SET]' : '[NOT SET]');
    const userCount = await prisma.user.count();
    console.log('MongoDB connection successful. User count:', userCount);
  } catch (error) {
    console.error('MongoDB connection failed:', error && error.message ? error.message : error);
    if (error && error.stack) console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testMongoConnection();
