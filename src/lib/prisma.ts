// This file configures the initialization of Prisma Client for edge runtime
import { PrismaClient } from '@prisma/client'

// Minimal shape describing the methods we expect callers to use on models.
// This is intentionally narrow to avoid leaking Prisma types into the
// rest of the app while still giving good ergonomics for the safe mock.
type ModelLike = {
  count?: (...args: unknown[]) => Promise<number>
  findUnique?: (...args: unknown[]) => Promise<unknown | null>
  findFirst?: (...args: unknown[]) => Promise<unknown | null>
  findMany?: (...args: unknown[]) => Promise<unknown[]>
  create?: (...args: unknown[]) => Promise<unknown | null>
  update?: (...args: unknown[]) => Promise<unknown | null>
  delete?: (...args: unknown[]) => Promise<unknown | null>
  [key: string]: unknown
}

type PrismaLike = {
  [model: string]: ModelLike
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient | PrismaLike
}

function createSafeMock(): PrismaLike {
  const methodHandler = (method: string) => {
    return async (...args: unknown[]) => {
      // Reference args so linters don't complain about unused parameters.
      void args
      // Return sensible defaults based on method name
      if (method === 'count') return 0
      if (method === 'findUnique' || method === 'findFirst') return null
      if (method === 'findMany') return []
      if (method === 'create' || method === 'update' || method === 'delete') return null
      // Generic fallback
      return null
    }
  }

  const modelProxy: ModelLike = new Proxy({}, {
    get(_target, prop: string | symbol) {
      // Return a function for any method access
      return methodHandler(String(prop))
    }
  }) as unknown as ModelLike

  // Top-level proxy so prisma.design, prisma.cartItem, etc. work.
  const top = new Proxy({}, {
    get() {
      return modelProxy
    }
  }) as unknown as PrismaLike

  return top
}

let prisma: PrismaClient | PrismaLike

if (!process.env.DATABASE_URL) {
  // Use the safe mock in environments without DATABASE_URL
  prisma = globalForPrisma.prisma ?? createSafeMock()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
} else {
  prisma = globalForPrisma.prisma ?? new PrismaClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
}

// For type-safety across the codebase we cast the exported value to PrismaClient.
// At runtime this will either be a real PrismaClient (when DATABASE_URL is set)
// or our safe mock proxy. The cast is intentional to avoid pervasive `?` checks
// throughout the application while keeping runtime behavior safe.
export default prisma as unknown as PrismaClient