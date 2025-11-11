import { PrismaClient } from '@prisma/client'

// ESM shim for Node scripts that can't import TypeScript files directly.
const globalForPrisma = globalThis

function createDbMissingProxy() {
  const handler = {
    get() {
      throw new Error('Database is not configured. Set DATABASE_URL in .env.local')
    },
    apply() {
      throw new Error('Database is not configured. Set DATABASE_URL in .env.local')
    },
  }
  return new Proxy({}, handler)
}

const prisma = process.env.DATABASE_URL ? (globalForPrisma.prisma ?? new PrismaClient()) : createDbMissingProxy()

if (process.env.NODE_ENV !== 'production' && process.env.DATABASE_URL) {
  globalForPrisma.prisma = prisma
}

export default prisma
