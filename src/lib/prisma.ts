// This file configures the initialization of Prisma Client for edge runtime
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// If DATABASE_URL is missing, export a harmless proxy that throws a clear error when used,
// preventing Prisma from trying to initialize and crashing API routes.
function createDbMissingProxy() {
  const handler: ProxyHandler<object> = {
    get() {
      throw new Error('Database is not configured. Set DATABASE_URL in .env.local')
    },
    apply() {
      throw new Error('Database is not configured. Set DATABASE_URL in .env.local')
    },
  }
  return new Proxy({}, handler) as unknown as PrismaClient
}

const prisma: PrismaClient = process.env.DATABASE_URL
  ? (globalForPrisma.prisma ?? new PrismaClient())
  : createDbMissingProxy()

if (process.env.NODE_ENV !== 'production' && process.env.DATABASE_URL) {
  globalForPrisma.prisma = prisma
}

export default prisma