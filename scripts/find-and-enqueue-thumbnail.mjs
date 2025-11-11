#!/usr/bin/env node
// Finds a candidate DesignMedia and enqueues a thumbnail job to the 'thumbnails' queue.
import 'dotenv/config'
import prisma from '../src/lib/prisma.mjs'
import { Queue } from 'bullmq'

async function main() {
  if (!process.env.REDIS_URL) {
    console.error('REDIS_URL is required in environment')
    process.exit(1)
  }

  // Try to find a media entry that looks like it needs a thumbnail
  // Preference: local uploads (/uploads/) or designs with no thumbnailUrl
  let candidate = await prisma.designMedia.findFirst({
    where: {
      OR: [
        { fileUrl: { startsWith: '/uploads/' } },
        { design: { thumbnailUrl: null } },
        { design: { thumbnailUrl: '' } },
      ],
    },
    include: { design: true },
  })

  if (!candidate) {
    // fallback: any media
    candidate = await prisma.designMedia.findFirst({ include: { design: true } })
  }

  if (!candidate) {
    console.error('No DesignMedia records found in DB')
    process.exit(1)
  }

  console.log('Selected candidate:')
  console.log({ id: candidate.id, fileUrl: candidate.fileUrl, designId: candidate.design?.id })

  const queue = new Queue('thumbnails', { connection: { url: process.env.REDIS_URL } })
  const job = await queue.add('generate-thumbnail', {
    designId: candidate.design?.id,
    mediaId: candidate.id,
    fileUrl: candidate.fileUrl,
  }, { removeOnComplete: true, attempts: 3 })

  console.log('Enqueued job id:', job.id)
  await queue.close()
}

main().catch((err) => { console.error(err); process.exit(1) })
