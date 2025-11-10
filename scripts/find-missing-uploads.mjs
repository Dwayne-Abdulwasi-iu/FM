import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load local env (so DATABASE_URL is available when run locally)
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

async function main() {
  // Find designs that reference uploads in imageUrl or thumbnailUrl
  const designs = await prisma.design.findMany({
    where: {
      OR: [
        { imageUrl: { startsWith: '/uploads/' } },
        { thumbnailUrl: { startsWith: '/uploads/' } },
      ]
    },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      thumbnailUrl: true,
      mediaFiles: { select: { fileUrl: true } }
    }
  })

  const uploadsRoot = path.join(process.cwd(), 'public')

  const missingRecords = []

  for (const d of designs) {
    const referenced = []
    if (d.imageUrl && d.imageUrl.startsWith('/uploads/')) referenced.push(d.imageUrl)
    if (d.thumbnailUrl && d.thumbnailUrl.startsWith('/uploads/')) referenced.push(d.thumbnailUrl)
    for (const mf of d.mediaFiles || []) if (mf.fileUrl && mf.fileUrl.startsWith('/uploads/')) referenced.push(mf.fileUrl)

    const missing = []
    for (const r of referenced) {
      const fp = path.join(uploadsRoot, r.replace(/^\//, ''))
      if (!fs.existsSync(fp)) missing.push(r)
    }

    if (missing.length) {
      missingRecords.push({ id: d.id, title: d.title, missing })
    }
  }

  if (!missingRecords.length) {
    console.log('No missing upload files referenced by designs.')
  } else {
    console.log(JSON.stringify(missingRecords, null, 2))
  }
}

main()
  .catch((e) => {
    console.error('Script error:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    try { await prisma.$disconnect() } catch {}
  })
