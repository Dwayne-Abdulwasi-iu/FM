#!/usr/bin/env bash

# Fashion Marketplace Setup Script
# Run this script after resolving network connectivity issues

echo "🚀 Setting up Fashion Marketplace..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🗄️ Setting up database..."
npx prisma generate

# Initialize database
npx prisma db push

# Seed database with sample data
echo "🌱 Seeding database..."
npm run db:seed

# Create environment file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env.local
    echo "⚠️  Please update .env.local with your actual API keys"
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your API keys"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Visit http://localhost:3000"
echo ""
echo "Login credentials removed from setup script for security."