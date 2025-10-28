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