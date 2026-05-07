# Fashion Marketplace - Copilot Instructions

## Architecture Overview

Next.js 15 App Router marketplace where designers sell fashion illustrations. Uses MongoDB (via Prisma), Cloudinary for media, and dual payment processors (Stripe for USD, Paystack for NGN).

**Key directories:**
- `src/app/` — App Router pages and API routes
- `src/lib/` — Core utilities (auth, db, payments, uploads)
- `src/components/` — React components (`ui/`, `layout/`, `home/`, `pwa/`)
- `prisma/schema.prisma` — MongoDB data models (**do NOT use `prisma migrate`**)
- `migrations/` — `migrate-mongo` files for production DB changes
- `scripts/` — Maintenance scripts (`.mjs` for ESM)

### Data Flow
1. **Auth**: NextAuth credentials + Google OAuth → JWT session via `src/lib/auth.ts`
2. **Uploads**: Form → `/api/designs` → Cloudinary → MongoDB `Design` + `DesignMedia`
3. **Payments**: Cart → `/api/checkout` → Stripe/Paystack → webhook → `Order` + `SellerEarning`
4. **Background Jobs**: Video uploads → BullMQ thumbnail queue → `scripts/thumbnail-worker.mjs`

## Critical Patterns

### Database Access
- **Always check `DATABASE_URL`** before Prisma calls — the proxy in [src/lib/prisma.ts](src/lib/prisma.ts) throws if missing
- Use `prismaErrorResponse()` from [src/lib/prismaError.ts](src/lib/prismaError.ts) to handle transient DB errors (returns 503):
  ```typescript
  const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
  if (prismaResp) return prismaResp
  ```

### API Route Structure
- All API routes are in `src/app/api/` using Next.js route handlers
- Authenticate with `getServerSession(authOptions)` from [src/lib/auth.ts](src/lib/auth.ts)
- Rate limiting via [middleware.ts](middleware.ts) (60 req/min/IP, excludes `/api/health` and `/api/status`)

### File Uploads
- **Production requires Cloudinary** — no local filesystem persistence
- Use `uploadToCloudinary()` from [src/lib/cloudinary.ts](src/lib/cloudinary.ts)
- Videos trigger async thumbnail jobs via BullMQ when `REDIS_URL` is set (see [src/lib/thumbnailQueue.ts](src/lib/thumbnailQueue.ts))

### Payment Processing
- **Stripe** for USD payments (10% platform fee via Stripe Connect)
- **Paystack** for NGN payments with subaccount splits
- Both use lazy initialization — won't crash if keys are missing until actually called
- Webhooks: `/api/webhooks/stripe`, `/api/webhooks/paystack`

### State Management
- Session: NextAuth with JWT strategy
- Client state: React hooks for simple state, `react-hot-toast` for notifications
- Toast notifications: `react-hot-toast` via `<Toaster>` in [providers.tsx](src/components/providers.tsx)

### Currency & Pricing
- Prices stored in USD, converted on-demand for NGN display
- Use `convertFromUSDLive()` for live exchange rates (caches for 2 minutes) or `formatPriceLocalizedSync()` for static rates
- `convertUSDToNGN()` and `convertNGNToUSD()` helpers in `src/lib/paystack.ts`
- Designs store `submittedPrice`/`submittedCurrency` for audit trail and historical accuracy

### Admin & Role-Based Access
- Check role via `session.user.role` (default: `'USER'`, admin: `'ADMIN'`)
- Admin routes in `/app/admin/` — guard with `if (session?.user?.role !== 'ADMIN') return 401`
- Admin features: analytics, design approval, seller verification, resource management

## Development Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build (standalone output)
npm run start:standalone:3000  # Run production build locally

npm test                 # Jest unit tests
npm run test:integration # Integration tests (requires running server)
npm run type-check       # TypeScript validation

npm run db:push          # Push Prisma schema to DB
npm run db:seed          # Seed sample data
npm run migrate:cloudinary # Migrate local uploads to Cloudinary
npm run thumbnail:worker # Start background thumbnail processor
```

### Local Redis Setup (Optional but Recommended)

For production-like rate limiting and BullMQ job queues in development:

**Windows (PowerShell):**
```powershell
.\scripts\setup-redis.ps1
```

**Linux/macOS:**
```bash
./scripts/setup-redis.sh
```

These helpers start Docker-based Redis and auto-configure `REDIS_URL` in `.env.local`.

## Testing Approach

- Jest + React Testing Library for unit tests
- Tests mock `next/navigation`, `next-auth/react`, and Redis by default (`jest.setup.js`)
- Integration tests: `npm run test:integration` (requires running server + `TEST_UPLOAD_ENDPOINT`)
- Path alias: `@/` maps to `src/`
- Test files in `src/__tests__/` (unit) and `__tests__/` (integration)

## Key Conventions

1. **Client components**: Mark with `'use client'` at file top
2. **Images**: Use `SafeImage` component or Next.js `Image` with Cloudinary `remotePatterns`
3. **Styling**: Tailwind CSS with custom `primary` color scale and `xs` breakpoint
4. **Error handling**: Return structured JSON with appropriate HTTP status codes
5. **Currency**: Designs store `submittedPrice`/`submittedCurrency` for audit trail

## Environment Variables

Required for full functionality:
- `DATABASE_URL` — MongoDB connection string
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — Auth configuration
- `CLOUDINARY_*` — Media storage (required in production)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — USD payments
- `PAYSTACK_SECRET_KEY` — NGN payments
- `REDIS_URL` — Optional but recommended for rate limiting and job queues

Additional recommended:
- `SENDGRID_API_KEY` — Preferred email provider
- `GMAIL_USER`, `GMAIL_APP_PASSWORD` — Gmail SMTP fallback (requires app password, not regular password)
- `EMAIL_FROM` — Verified sender address (must be verified in SendGrid when using API, or Gmail account for Gmail SMTP)
- `SMTP_HOST/PORT/USER/PASS` — Generic SMTP fallback
- `SENTRY_DSN` — Optional error tracking
- Local Redis: run `.\scripts\setup-redis.ps1` or `./scripts/setup-redis.sh` to auto-configure

## Deployment

- Render deployment via `render.yaml` with standalone Next.js output
- Health check endpoint: `/api/health`
- CI runs lint, type-check, tests, and build on Node 20.x

## Common Pitfalls

- **Never commit `.env.local`** — secrets go in hosting provider's env vars
- MongoDB schema changes: use `npx migrate-mongo up` (see `MIGRATIONS.md`), not `prisma migrate`
- Webhook handlers must return 200 quickly or payment providers retry
- Call `revalidatePath()` after mutations to bust Next.js cache
- Lazy-initialized services (Stripe, Paystack) throw only when first used, not at import

## Maintenance Scripts

Located in `scripts/` directory. Run with `node scripts/<name>.mjs` (ESM) or `node scripts/<name>.js` (CJS):

| Script | Purpose |
|--------|---------|
| `make-admin.js` | Promote user to ADMIN role |
| `seed-admin.js` | Create initial admin user |
| `backfill-submitted-prices.mjs` | Backfill `submittedPrice`/`submittedCurrency` for existing designs |
| `fix-cloudinary-*.mjs` | Repair Cloudinary URL/protocol issues |
| `find-and-enqueue-thumbnail.mjs` | Queue video thumbnails for processing |
| `thumbnail-worker.mjs` | BullMQ worker for async thumbnail generation |
| `export-db-backup.mjs` | Export MongoDB collections for backup |
| `check-cloudinary-mongo-client.mjs` | Verify Cloudinary/DB sync |

## Boutique (ADMIN_STOCK) Shipping Flow

Physical products sold via the boutique use the **ADMIN_STOCK** fulfillment model:

### Workflow
1. Seller uploads product → Admin reviews content → `CONTENT_APPROVED`
2. Seller ships to warehouse (pays shipping out-of-pocket) → `SHIPPED_TO_ADMIN`
3. Admin receives & verifies → `RECEIVED_BY_ADMIN` → `VERIFICATION_PASSED` → `LIVE`
4. Buyer purchases → Platform calculates shipping fee → Buyer pays → Admin ships to buyer
5. Buyer's shipping fee goes entirely to platform account

### Key Models
- `BoutiqueProduct` — Physical product with status workflow
- `SellerToAdminShipment` — Tracks shipment from seller to warehouse with receipt verification
- `WarehouseInventory` — Tracks product location/condition in warehouse

### Receipt Verification (Prevents Gaming)
Admin records actual items received vs expected:
- `itemsExpected`, `itemsReceived`, `itemsMissing`, `itemsDamaged`
- `receiptPhotos[]` — Evidence of condition on arrival
- `hasDiscrepancy` flag triggers dispute flow

### Dispute Resolution
- **Routes**: `/api/boutique/admin/shipments`, `/api/boutique/admin/shipments/[id]/dispute`
- **Resolutions**: `SELLER_FAULT`, `CARRIER_FAULT`, `WRITTEN_OFF`, `SELLER_RESHIP`
- Carrier faults can trigger insurance claims

### Auto-Cancel Cron
- **Route**: `/api/cron/boutique-shipment-deadlines`
- Sends warnings 2 days before deadline
- Auto-cancels products if shipment doesn't arrive within 7 days
- Notifies seller and admin of cancellations
