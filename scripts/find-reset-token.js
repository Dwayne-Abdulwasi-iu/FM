#!/usr/bin/env node
// Find the most recent password reset tokens for a given email using Prisma.
// Usage: node scripts/find-reset-token.js user@example.com

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: node scripts/find-reset-token.js user@example.com')
    process.exit(2)
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.log('No user found for', email)
      process.exit(0)
    }

    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    if (!tokens || tokens.length === 0) {
      console.log('No reset tokens found for', email)
      process.exit(0)
    }

    console.log('Latest tokens for', email)
    for (const t of tokens) {
      console.log(JSON.stringify({ token: t.token, used: t.used, expiresAt: t.expiresAt, createdAt: t.createdAt }))
      const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      console.log('Reset URL:', `${base}/auth/reset/${t.token}`)
    }
  } catch (err) {
    console.error('Error querying tokens:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
