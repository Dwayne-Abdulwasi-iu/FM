import { NextResponse } from 'next/server'

export async function GET() {
  const hasDb = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim())
  const hasNextAuthSecret = Boolean(process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.trim())
  const hasNextAuthUrl = Boolean(process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.trim())
  const hasCloudinary = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  )

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    env: {
      databaseUrl: hasDb,
      nextAuthSecret: hasNextAuthSecret,
      nextAuthUrl: hasNextAuthUrl,
      cloudinary: hasCloudinary,
    },
    note: hasDb
      ? 'Database URL is present. If you still see DB errors, try restarting the server.'
      : 'Database URL missing. Set DATABASE_URL in .env.local to enable DB-backed features.',
  })
}
