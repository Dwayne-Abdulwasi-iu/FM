# Fashion Marketplace - AI Coding Instructions

## Architecture Overview

This is a **Next.js 15 App Router** fashion marketplace with MongoDB (via Prisma), NextAuth, and dual payment processing (Stripe + Paystack).

### Core Stack
- **Frontend**: Next.js 15 App Router, React 18, Tailwind CSS, Zustand (state)
- **Backend**: Next.js API Routes (`src/app/api/`), Prisma ORM
- **Database**: MongoDB Atlas (replica set required for transactions)
- **Auth**: NextAuth v4 with JWT strategy, credentials + Google OAuth
- **Payments**: Stripe (international) + Paystack (Nigeria/Africa)
- **Storage**: Cloudinary for design images/media

### Key Data Flow
```
User → API Route → Prisma → MongoDB Atlas
                 → Cloudinary (uploads)
                 → Stripe/Paystack (payments)
```

## Project Structure Patterns

### API Routes Convention
All API routes in `src/app/api/` follow Next.js 15 patterns:
```typescript
// Pattern: src/app/api/{resource}/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  // Always check session for protected routes
}
```

### Authentication Pattern
- Session extended with `id` and `role` via `src/types/auth.d.ts`
- Use `getServerSession(authOptions)` in API routes
- Use `useSession()` hook in client components
- Roles: `USER`, `SELLER`, `ADMIN` - check via `session.user.role`

### Component Organization
- `src/components/layout/` - Navbar, Footer (global layout)
- `src/components/home/` - Homepage sections
- `src/components/providers.tsx` - SessionProvider wrapper
- Client components marked with `'use client'` directive

## Critical Developer Commands

```bash
# Development
npm run dev              # Start Next.js dev server

# Database
npm run db:push          # Push Prisma schema to MongoDB
npm run db:seed          # Seed sample data (tsx prisma/seed.ts)
npx prisma generate      # Regenerate Prisma client after schema changes

# Testing
npm test                 # Run Jest tests
npm run test:watch       # Watch mode
npm run type-check       # TypeScript check without emit

# Verify MongoDB connection
node scripts/check-mongo-env.js && node src/test-mongo.js
```

## Database Specifics (MongoDB + Prisma)

- **Prisma schema**: `prisma/schema.prisma` - Uses `mongodb` provider
- **IDs**: Use `@id @default(cuid()) @map("_id")` pattern for MongoDB
- **Relations**: MongoDB doesn't support foreign keys - Prisma handles at app level
- **Transactions**: Require MongoDB replica set (Atlas provides this automatically)
  - Local dev with single-node mongod fails with error `P2031`

## Testing Conventions

Tests in `src/__tests__/` with this structure:
```
__tests__/
  api/           # API route tests
  components/    # React component tests
  webhooks/      # Webhook handler tests
```

Key mocking patterns (see `src/__tests__/api/designs.test.ts`):
- Mock `next-auth` before imports to avoid ESM issues
- Mock `@/lib/prisma` with Jest mock functions
- Mock `next/server` NextResponse for route tests

## External Service Integration

### Cloudinary (`src/lib/cloudinary.ts`)
- Upload via `uploadToCloudinary(buffer, { folder: 'fashion-marketplace/designs' })`
- Generates thumbnail URLs automatically

### Payments
- **Stripe** (`src/lib/stripe.ts`): Lazy init with `getStripe()`, 10% platform fee
- **Paystack** (`src/lib/paystack.ts`): For African markets, verify with `verifyTransaction(reference)`
- Webhooks in `src/app/api/webhooks/{stripe,paystack}/route.ts`

## Admin Features
- Admin dashboard at `/admin` - role-based access
- Admin API routes under `src/app/api/admin/`
- Make user admin: `node scripts/make-user-admin.js`

## Environment Variables Required
```
DATABASE_URL          # MongoDB Atlas connection string
NEXTAUTH_SECRET       # Random string for JWT signing
NEXTAUTH_URL          # http://localhost:3000 for dev
CLOUDINARY_*          # Cloud name, API key, API secret
STRIPE_SECRET_KEY     # Stripe API key
STRIPE_WEBHOOK_SECRET # For webhook verification
PAYSTACK_SECRET_KEY   # Paystack API key
GOOGLE_CLIENT_ID      # OAuth (optional)
GOOGLE_CLIENT_SECRET  # OAuth (optional)
```

## Common Pitfalls
- Always run `npx prisma generate` after schema changes
- MongoDB Atlas required (local mongod needs replica set config)
- Check `isStripeConfigured()` / `isPaystackConfigured()` before payment calls
- Path alias `@/` maps to `src/` - configured in tsconfig.json and jest.config.js
