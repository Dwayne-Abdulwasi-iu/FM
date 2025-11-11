#!/usr/bin/env node
import prisma from '../src/lib/prisma.mjs'

async function main() {
  const designs = await prisma.design.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { mediaFiles: true } })
  for (const d of designs) {
    console.log('id:', d.id)
    console.log('  title:', d.title)
    console.log('  thumbnailUrl:', d.thumbnailUrl)
    console.log('  mediaFiles:')
    for (const m of d.mediaFiles || []) console.log('    ', m.id, m.fileType, m.fileUrl)
    console.log('')
  }
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
