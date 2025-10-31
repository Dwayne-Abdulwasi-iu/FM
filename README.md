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

## Database Setup: MongoDB Atlas Only

This project uses **MongoDB Atlas** for all development, testing, and production environments. You do **NOT** need Docker or a local MongoDB instance.

**Required:**
- Create a MongoDB Atlas cluster.
- Obtain your connection string (SRV URI) from Atlas, e.g.:
  
   `mongodb+srv://<username>:<password>@cluster0.as7yeiu.mongodb.net/fashion_dev?retryWrites=true&w=majority&appName=Cluster0`

- Set your connection string as the `DATABASE_URL` environment variable before running the app:

   **PowerShell:**
   ```powershell
   $env:DATABASE_URL='mongodb+srv://<username>:<password>@cluster0.as7yeiu.mongodb.net/fashion_dev?retryWrites=true&w=majority&appName=Cluster0'
   npm run dev
   ```

   **.env.local (not committed):**
   ```
   DATABASE_URL="mongodb+srv://<username>:<password>@cluster0.as7yeiu.mongodb.net/fashion_dev?retryWrites=true&w=majority&appName=Cluster0"
   ```

- Do **NOT** commit `.env.local` or secrets to the repository.

## Local Development
- No Docker or local MongoDB required.
- All Prisma transactions work with Atlas (replica set is handled by Atlas).

## Quick Test
To verify connectivity:
```powershell
node src/test-mongo.js
```

## Registration Smoke Test
To test user registration (after starting dev server):
```powershell
node -e "fetch('http://localhost:3000/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Automated Test',email:'autotest+atlas@example.com',password:'Test12345!',role:'USER'})}).then(async r=>{console.log('STATUS',r.status); const t=await r.text(); console.log(t)}).catch(e=>{console.error('Fetch error',e);process.exit(1)})"
```
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