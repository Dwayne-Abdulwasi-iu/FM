import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { prismaErrorResponse } from '@/lib/prismaError'
import { MongoClient } from 'mongodb'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        bio: true,
        website: true,
        location: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        password: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // don't expose hashed password; include a safe boolean flag indicating whether the
    // account has a password set (useful for client-side UX for OAuth-only users)
    const u = user as unknown as Record<string, unknown>
    const hasPassword = Boolean(u['password'])
    const out = { ...u }
    // remove password from output
    delete out['password']
    const responseUser = { ...out, hasPassword }

    return NextResponse.json({ user: responseUser })

  } catch (error) {
    console.error('Profile fetch error:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable, please try again later.')
    if (prismaResp) return prismaResp
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { name, username, bio, website, location, confirmPassword } = await request.json()

    // validate username if provided
    if (username != null && username !== '') {
      const usernameRegex = /^[A-Za-z0-9_-]{3,30}$/
      if (!usernameRegex.test(username)) {
        return NextResponse.json({ message: 'Invalid username. Use 3-30 characters: letters, numbers, - or _.' }, { status: 400 })
      }
    }

    // server-side case-insensitive uniqueness check (use Mongo directly for reliable regex search)
    if (username != null && username !== '') {
      // load DATABASE_URL from .env.local if necessary (same logic as scripts)
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
        // cannot validate safely; reject to be conservative
        return NextResponse.json({ message: 'Server misconfiguration: cannot validate username uniqueness' }, { status: 500 })
      }

      const corrected = dbUrl.replace(/^(mongo\+srv:\/\/)/i, 'mongodb+srv://').replace(/^(mongo:\/\/)/i, 'mongodb://')
      const client = new MongoClient(corrected)
      await client.connect()
      try {
        let dbName = null
        try { const m = corrected.match(/\/([^/?]+)(?:\?|$)/); if (m) dbName = m[1] } catch {}
        const db = dbName ? client.db(dbName) : client.db()
        const usersCol = db.collection('users')
        const existing = await usersCol.findOne({ username: { $regex: `^${username.replace(/[-\\/\\^$*+?.()|[\]{}]/g,'\\$&')}$`, $options: 'i' } })
        if (existing && existing._id?.toString() !== session.user.id) {
          return NextResponse.json({ message: 'Username already taken' }, { status: 409 })
        }
      } finally {
        await client.close()
      }
    }

    // If a confirmPassword was provided, verify it matches the current user's password
    if (confirmPassword != null) {
      const existing = await prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } })
      if (!existing || !existing.password) {
        return NextResponse.json({ message: 'Unable to verify password for this account' }, { status: 400 })
      }
      const ok = await bcrypt.compare(confirmPassword, existing.password || '')
      if (!ok) {
        return NextResponse.json({ message: 'Incorrect password' }, { status: 401 })
      }
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || null,
        username: username || null,
        bio: bio || null,
        website: website || null,
        location: location || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        bio: true,
        website: true,
        location: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({ user })

  } catch (error) {
    console.error('Profile update error:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable, please try again later.')
    if (prismaResp) return prismaResp
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}