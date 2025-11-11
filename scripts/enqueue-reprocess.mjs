#!/usr/bin/env node
// Enqueue thumbnail generation jobs for designs missing thumbnails.
import prisma from '../src/lib/prisma.mjs'

const redisUrl = process.env.REDIS_URL
if (!redisUrl) {
  console.error('REDIS_URL not set; cannot enqueue jobs')
  process.exit(1)
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith('--limit='))
  const limit = arg ? parseInt(arg.split('=')[1], 10) : 50

  try {
    const { Queue } = await import('bullmq')
    const queue = new Queue('thumbnails', { connection: { url: redisUrl } })

    // Find designs without a thumbnail or with placeholder-like thumbnails
    const designs = await prisma.design.findMany({
      where: { OR: [{ thumbnailUrl: null }, { thumbnailUrl: '' }, { thumbnailUrl: { contains: 'placeholder' } }] },
      include: { mediaFiles: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    console.log(`Found ${designs.length} designs without real thumbnails (limit ${limit})`)

    let enqueued = 0
    for (const d of designs) {
      for (const m of d.mediaFiles || []) {
        if (m.fileType === 'VIDEO' && typeof m.fileUrl === 'string' && m.fileUrl.startsWith('/uploads/')) {
          await queue.add('generate-thumbnail', { mediaId: m.id, designId: d.id, fileUrl: m.fileUrl }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } })
          enqueued += 1
          console.log('Enqueued thumbnail job for', d.id, m.fileUrl)
        }
      }
    }

    console.log(`Enqueued ${enqueued} thumbnail jobs`)
    await queue.close()
    process.exit(0)
  } catch (err) {
    console.error('Failed to enqueue jobs', err)
    process.exit(1)
  }
}

main()
