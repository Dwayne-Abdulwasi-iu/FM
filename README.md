# Fashion Marketplace

## Deploying on Render

This repo includes a `render.yaml` that provisions a Web Service using Next.js standalone output.

Prerequisites:
- A MongoDB connection string (DATABASE_URL) — e.g., MongoDB Atlas
- NextAuth secret (NEXTAUTH_SECRET) and URL (NEXTAUTH_URL)
- Cloudinary account (CLOUDINARY_URL) if you use uploads
- Stripe secret key (STRIPE_SECRET_KEY) and webhook secret (STRIPE_WEBHOOK_SECRET) if payments are enabled
- Paystack secret key (PAYSTACK_SECRET_KEY) if NGN payments are enabled
- Optional: Google OAuth (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) for social sign-in

Steps:
1. Push to GitHub (branch `master`).
2. In Render, create a new Web Service and connect this repo. Render will detect `render.yaml`.
3. Set the required Environment Variables in Render (see the list above). Do not commit secrets.
4. Click Deploy. Render will run `npm ci && npm run build`, then start with `node .next/standalone/server.js`.
5. After the first deploy, add your Render URL to `NEXTAUTH_URL` (e.g., `https://<service-name>.onrender.com`) and re-deploy.
6. Update Stripe and Paystack dashboards to point webhooks to:
   - Stripe: `https://<service>/api/webhooks/stripe`
   - Paystack: `https://<service>/api/webhooks/paystack`

Health check:
- Render uses `/api/health` (configured via `healthCheckPath`) to verify the service. You can also hit `/api/status` for a quick JSON.

Local production run (optional):
```
npm run build
npm run start:standalone:3000
```

# Fashion Marketplace

A full-stack fashion marketplace where designers can showcase and sell their illustrations, sketches, and fashion designs. Built with Next.js, TypeScript, Prisma, and Stripe.

## 🚀 Project Status

✅ **COMPLETED FEATURES:**
- **Project Structure**: Complete Next.js 15 + TypeScript setup
- **Database Schema**: Full Prisma schema with Users, Designs, Orders, Reviews, Cart
- **Authentication**: NextAuth setup with credentials + OAuth (Google)
- **Admin Dashboard**: Role-based admin panel with analytics
- **File Upload**: Cloudinary integration for image storage
- **API Routes**: User registration, design CRUD, order management
- **UI Components**: Homepage, navigation, footer, basic marketplace UI
- **Environment Setup**: Complete environment configuration
- **Database Seeding**: Sample users, designs, and data

⚠️ **CURRENT ISSUE:**
Network connectivity preventing npm package installation. All code is ready to run once dependencies are installed.

## 🛠️ Quick Start (After Network Fix)

### Windows Setup:
```powershell
# Run the automated setup script
.\setup.bat
```

### Linux/Mac Setup:
```bash
# Run the automated setup script
chmod +x setup.sh
./setup.sh
```

### Manual Setup:
```powershell
# Install dependencies
npm install

# Setup database
npx prisma generate

Important: In production this application requires Cloudinary for uploads. The app no longer persists uploads to the local filesystem in production deployments (ephemeral filesystems would lose files). Make sure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` are configured in your host environment. If you have existing files in `public/uploads`, run `node scripts/migrate-uploads-to-cloudinary.mjs` (or `npm run migrate:cloudinary`) to migrate them.
npx prisma db push

# Seed database
npm run db:seed

# Start development server
npm run dev
```

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (dev), PostgreSQL (production)
- **Authentication**: NextAuth.js (Credentials + OAuth)
- **Payments**: Stripe Connect (5% platform commission)
- **File Storage**: Cloudinary
- **Deployment**: Vercel ready

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```powershell
   git clone <your-repo-url>
   cd fashion-marketplace
   ```

2. **Install dependencies**
   ```powershell
   npm install
   ```

3. **Environment Setup**
   
   Copy `.env.example` to `.env.local` and fill in your values:
   ```powershell
   cp .env.example .env.local
   ```

4. **Database Setup**
   ```powershell
   # Generate Prisma client
   npx prisma generate
   
   # Push schema to database
   npm run db:push
   
   # Seed with sample data
   npm run db:seed
   ```

5. **Run Development Server**
   ```powershell
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Stripe
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email (Optional)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@yourapp.com"
```

Additional recommended variables (branding, transactional email, rate-limiting, monitoring):

```env
# App branding (used in email templates and UI)
NEXT_PUBLIC_APP_NAME="Fashion Marketplace"
APP_SUPPORT_URL="https://example.com/support"
# Optional: set your support email address. If you don't have a dedicated support inbox,
# you can leave this empty (""), use a generic contact alias, or rely on APP_SUPPORT_URL
# to point users to a help page or contact form.
APP_SUPPORT_EMAIL=""

# SendGrid (preferred) — set either SENDGRID_API_KEY or SMTP_* above
SENDGRID_API_KEY="SG.xxxxx"

# Email FROM address used by SendGrid/SMTP. MUST be verified in SendGrid when using their API.
EMAIL_FROM="no-reply@yourdomain.com"

# Redis (optional but recommended for distributed rate-limiting and session stores)
REDIS_URL="redis://:password@redis-host:6379"

# Sentry (optional for error tracking)
SENTRY_DSN="https://<key>@sentry.io/<project>"
SENTRY_AUTH_TOKEN="<sentry-cli-token-for-releases>"
```

Notes:
- If you use SendGrid, verify the `EMAIL_FROM` sender identity in the SendGrid dashboard — otherwise SendGrid will reject messages with a 550 error.
- The app prefers the SendGrid Web API (`SENDGRID_API_KEY`) and falls back to SMTP (`SMTP_*`). If you use SMTP, ensure `SMTP_HOST`, `SMTP_USER` and `SMTP_PASS` are set.
- `REDIS_URL` is recommended for production for rate-limiting (resend and OTP attempts) and other cross-process counters. Without Redis the app falls back to an in-memory, process-local limiter which is not suitable for multi-instance deployments.
- Keep secrets out of version control. Use your hosting provider's secret manager (Vercel/Render/GCP/AWS) or GitHub Actions repository secrets for CI.

### Local Redis helper

If you want a quick local Redis for development (recommended to match production behavior for rate-limiting), the repo includes a docker-compose and helper scripts to start Redis and automatically add `REDIS_URL` to your `.env.local`.

What I'll ask you when you run the helper:
- Do you want a password for Redis? (yes/no). If yes I'll ask you for the password value and configure Redis `requirepass`.

How to run (Windows PowerShell / pwsh):
```powershell
.\scripts\setup-redis.ps1
```

How to run (macOS / Linux / WSL):
```bash
./scripts/setup-redis.sh
```

What the helper does:
- Starts Redis using `docker compose -f docker-compose.redis.yml up -d`
- If you provide a password, it sets `requirepass` inside the container and writes `REDIS_URL="redis://:PASSWORD@localhost:6379"` into `.env.local`.
- If you leave it blank, it writes `REDIS_URL="redis://localhost:6379"` into `.env.local`.

Notes:
- You need Docker installed and running locally.
- The helper updates `.env.local` in the repository root. It will create the file if it doesn't exist. The `.env.local` file is already gitignored in this repo by convention — double-check before committing.
- In production, use your managed Redis provider (Azure Cache, AWS Elasticache, Redis Cloud, Upstash, etc.) and set `REDIS_URL` in your host's environment variables.

### Testing MongoDB locally

If you want to test a MongoDB connection locally (for example to verify Prisma + Atlas), follow these steps.

- Create or update `.env.local` with your MongoDB Atlas URL (do NOT commit this file):

   PowerShell (per-session):
   ```powershell
   $env:DATABASE_URL = 'mongodb+srv://<USER>:<PASS>@<CLUSTER>/<DB>?<OPTIONS>'
   npm run test:mongo
   ```

   Or create a `.env.local` from the example file and replace the placeholder:
   ```powershell
   copy .env.local.example .env.local
   # then edit .env.local and paste your DATABASE_URL
   npm run test:mongo
   ```

- The repository includes a convenience npm script `test:mongo` which runs `node src/test-mongo.js`. That script will:
   - attempt to load `DATABASE_URL` from the environment or `.env.local` (if present),
   - instantiate the Prisma client, and
   - print the user count or an informative error message.

Security notes:
- Never commit `.env.local` with real credentials. Use `.env.local.example` as a template and keep secrets out of version control.
- If you accidentally committed secrets, rotate the credentials immediately.

If you'd like, I can also add a README section that shows how to run the same test from Linux/macOS shells (bash/zsh)." 

For macOS / Linux (bash or zsh):

```bash
# Temporary (per-session) environment variable
export DATABASE_URL='mongodb+srv://<USER>:<PASS>@<CLUSTER>/<DB>?<OPTIONS>'
# Ensure Prisma client is generated if schema changed
npx prisma generate
npm run test:mongo
```

Quick tip: if you've recently changed `prisma/schema.prisma`, run `npx prisma generate` before running the test so the generated client matches the schema.

Note: the repository includes an env-checker that validates `DATABASE_URL` before running the test (`scripts/check-mongo-env.js`). Use `npm run test:mongo` which runs the checker first.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, register)
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes
│   ├── designs/           # Design pages
│   └── profile/           # User profiles
├── components/            # Reusable UI components
├── lib/                   # Utility functions
├── types/                 # TypeScript definitions
└── hooks/                 # Custom React hooks

prisma/
├── schema.prisma          # Database schema
└── seed.ts               # Database seeding

public/                    # Static assets
```

## Revenue Model

The platform operates on a **5% commission model**:

- Designers set their own prices for designs
- Platform automatically deducts 5% commission on each sale
- Remaining 95% goes to the designer
- Commission is handled through Stripe Connect for automatic payouts

### Stripe Integration

- **Stripe Connect**: Used for marketplace payments and automatic splits
- **Application Fee**: 5% platform fee deducted automatically
- **Payouts**: Direct to designer bank accounts via Stripe

## Key Features

### For Designers
- Upload high-quality images of fashion designs
- Set custom pricing for each design
- Track sales and earnings
- Manage portfolio and profile
- Receive automatic payouts

### For Customers
- Browse and search fashion designs
- Add items to cart and wishlist
- Secure checkout with Stripe
- Order history and tracking
- Leave reviews and ratings

### For Admins
- User and designer management
- Design approval/moderation
- Financial reporting and analytics
- Platform configuration
- Order and dispute management

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Designs
- `GET /api/designs` - List designs with filters
- `POST /api/designs` - Upload new design (authenticated)
- `GET /api/designs/[id]` - Get design details
- `PUT /api/designs/[id]` - Update design (owner only)
- `DELETE /api/designs/[id]` - Delete design (owner/admin)

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders/[id]` - Get order details
- `POST /api/stripe/webhook` - Stripe webhook handler

### Admin
- `GET /api/admin/users` - List all users
- `GET /api/admin/orders` - List all orders
- `GET /api/admin/analytics` - Platform analytics

## Development Commands

```powershell
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:push         # Push schema changes
npm run db:migrate      # Create migration
npm run db:studio       # Open Prisma Studio
npm run db:seed         # Seed database

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # TypeScript type checking
npm run test            # Run tests
npm run test:watch      # Run tests in watch mode
```

## Deployment

### Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy**: Automatic deployments on push to main branch

### Manual Deployment

1. **Build the application**
   ```powershell
   npm run build
   ```

2. **Set up PostgreSQL database** (replace SQLite)
   ```env
   DATABASE_URL="postgresql://user:password@host:port/database"
   ```

3. **Run database migrations**
   ```powershell
   npx prisma migrate deploy
   ```

4. **Start the application**
   ```powershell
   npm start
   ```

## Production Considerations

### Database
- Switch from SQLite to PostgreSQL for production
- Set up database backups and monitoring
- Configure connection pooling

### Security
- Use strong NEXTAUTH_SECRET in production
- Enable HTTPS only
- Configure CORS properly
- Set up rate limiting

### If secrets were accidentally committed

If you discover credentials (API keys, DB URLs, private keys) in the repository history or files, follow these steps immediately:

1. Rotate the exposed credentials first. For example, for MongoDB Atlas: create a new database user or change the existing user's password in the Atlas UI, then update any services that use it.

2. Remove the offending file from the current branch so future clones don't see it:

```bash
git rm --cached path/to/file
git commit -m "chore(secrets): remove sensitive file"
git push
```

3. If the secret was pushed to the remote (most likely), consider purging it from git history. This is disruptive (rewrites history) and requires coordination with other collaborators. Two common tools:

- BFG Repo-Cleaner (simpler):

```bash
# install bfg, then
bfg --delete-files YOUR_FILE
git push --force
```

- git filter-repo (recommended by GitHub for complex cases):

```bash
# install git-filter-repo, then
git filter-repo --invert-paths --path path/to/file
git push --force
```

4. After purging history, rotate the credentials again (to be safe) and notify any team members to re-clone the repository.

5. Store secrets securely going forward:
   - GitHub Actions: use repository Secrets (Settings → Secrets and variables → Actions).
   - Local development: keep `.env.local` in `.gitignore` and use `.env.local.example` as a template.
   - Production: use your cloud provider's secret manager or environment variables.

If you'd like, I can prepare the exact filter-repo or BFG commands tailored to the files found in this repository and (optionally) run them. Note: I will only rewrite history with your explicit confirmation.

### Performance
- Enable Next.js image optimization
- Configure CDN for static assets
- Implement caching strategies
- Monitor application performance

### Database Indexes (MongoDB)
For fast discovery queries in the marketplace (filters and sorting), the schema defines pragmatic indexes on `Design`:

- Composite index: `(isActive, isOwned, createdAt)`
- Single-field indexes: `category`, `price`, `totalSales`

These align with the API patterns in `src/app/api/designs/route.ts`:
- Filters: `isActive=true`, `isOwned=false`, optional `category`, optional price range
- Sorts: newest (`createdAt desc`), best sellers (`totalSales desc`), price asc/desc

To ensure these indexes exist in your MongoDB cluster, push the schema changes:

```powershell
npm run db:push
```

Notes:
- Index creation happens online in MongoDB Atlas but may take a few seconds to complete.
- If you change query patterns later (e.g., add tag or text search), revisit indexes accordingly.

### Monitoring
- Set up error tracking (e.g., Sentry)
- Configure application monitoring
- Set up alerts for critical issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is private and proprietary.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

## Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced search and AI recommendations
- [ ] Designer analytics dashboard
- [ ] Social features (following, sharing)
- [ ] Bulk upload tools
- [ ] API for third-party integrations

## Cloudinary HTTP->HTTPS check

This repository includes a CI-first check and a small runbook to detect and safely fix any stored Cloudinary URLs that use `http://` instead of `https://`.

- Documentation: `docs/cloudinary-check.md` (step-by-step commands and safe-fix runbook).
- Scripts: `scripts/check-cloudinary-mongo-client.mjs` (read-only scanner) and `scripts/fix-cloudinary-mongo-client.mjs` (direct Mongo fixer).
- Recommended flow: add the `PROD_DATABASE_URL` repository secret, run the `check-cloudinary` workflow manually (or wait for its scheduled run), and only run the fixer during a maintenance window after taking a backup.

If you'd like, I can open a small PR to add an inline link from this README to the docs or add notifications to the workflow (Slack/email).