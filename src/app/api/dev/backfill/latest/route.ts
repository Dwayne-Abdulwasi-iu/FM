import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_API !== 'true') {
    return NextResponse.json({ message: 'Not available' }, { status: 403 })
  }

  try {
    const latestPath = path.resolve(process.cwd(), 'tmp/backfills/latest.jsonl')
    if (!fs.existsSync(latestPath)) {
      return NextResponse.json({ message: 'No latest audit file found' }, { status: 404 })
    }

    const buf = await fs.promises.readFile(latestPath)
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="latest.jsonl"',
      },
    })
  } catch (err) {
    console.error('Failed to read latest audit file', err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
