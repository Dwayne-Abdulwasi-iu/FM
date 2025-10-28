@echo off
REM Fashion Marketplace Setup Script for Windows
REM Run this script after resolving network connectivity issues

echo 🚀 Setting up Fashion Marketplace...

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

REM Generate Prisma client
echo 🗄️ Setting up database...
call npx prisma generate

REM Initialize database
call npx prisma db push

REM Seed database with sample data
echo 🌱 Seeding database...
call npm run db:seed

REM Create environment file if it doesn't exist
if not exist .env.local (
    echo 📝 Creating environment file...
    copy .env.example .env.local
    echo ⚠️  Please update .env.local with your actual API keys
)

echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Update .env.local with your API keys
echo 2. Run 'npm run dev' to start the development server
echo 3. Visit http://localhost:3000
echo.
echo Login credentials:
echo 👤 Admin: admin@fashionmarketplace.com / admin123
echo 🎨 Designer: alice@example.com / designer123
echo 🛒 Customer: customer@example.com / customer123

pause