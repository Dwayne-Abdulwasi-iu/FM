#!/usr/bin/env node
import prisma from '../src/lib/prisma.mjs'

const id = process.argv[2]
if (!id) {
  console.error('Usage: node scripts/check-design.mjs <designId>')
  process.exit(1)
}

async function main() {
  const d = await prisma.design.findUnique({ where: { id }, include: { mediaFiles: true } })
  console.log(JSON.stringify(d, null, 2))
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
