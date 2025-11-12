import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import fs from 'fs'
import path from 'path'

// GET /api/profile/username-check?username=foo
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const username = url.searchParams.get('username') || ''

    const usernameRegex = /^[A-Za-z0-9_-]{3,30}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ available: false, message: 'Invalid username format' }, { status: 400 })
    }

    // load DATABASE_URL from .env.local if necessary
    let dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      try {
        const dotenv = await import('dotenv')
        const envPath = path.join(process.cwd(), '.env.local')
        if (fs.existsSync(envPath)) dotenv.config({ path: envPath })
      } catch {}
      dbUrl = process.env.DATABASE_URL
    }

    if (!dbUrl) {
      return NextResponse.json({ available: false, message: 'Server misconfiguration' }, { status: 500 })
    }

    const corrected = dbUrl.replace(/^(mongo\+srv:\/\/)/i, 'mongodb+srv://').replace(/^(mongo:\/\/)/i, 'mongodb://')
    const client = new MongoClient(corrected)
    await client.connect()
    try {
      let dbName = null
      try { const m = corrected.match(/\/([^/?]+)(?:\?|$)/); if (m) dbName = m[1] } catch {}
      const db = dbName ? client.db(dbName) : client.db()
      const users = db.collection('users')

      const existing = await users.findOne({ username: { $regex: `^${username.replace(/[-\\/\\^$*+?.()|[\]{}]/g,'\\$&')}$`, $options: 'i' } })
      if (existing) {
        return NextResponse.json({ available: false, message: 'Username taken' })
      }

      return NextResponse.json({ available: true })
    } finally {
      await client.close()
    }
  } catch (err) {
    console.error('username-check error', err)
    return NextResponse.json({ available: false, message: 'Internal error' }, { status: 500 })
  }
}
