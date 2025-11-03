import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const dbReady = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim())

    let designCount: number | null = null
    if (dbReady) {
      try {
        designCount = await prisma.design.count()
      } catch (e) {
        // In case the DB is reachable but query fails
        return NextResponse.json(
          { ok: false, error: 'Database query failed', details: `${e}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      ok: true,
      dbReady,
      designCount,
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({ ok: false, error: 'Unexpected error' }, { status: 500 })
  }
}
