#!/usr/bin/env node
import 'dotenv/config'
import prisma from '../src/lib/prisma.mjs'
import { Queue } from 'bullmq'

async function main() {
  try {
    console.log('ENV (masked):')
    console.log({
      REDIS_URL: process.env.REDIS_URL ? '[present]' : '[missing]',
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? '[present]' : '[missing]',
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? '[present]' : '[missing]',
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? '[present]' : '[missing]',
      FFMPEG_PATH: process.env.FFMPEG_PATH || '[missing]'
    })

    if (!process.env.REDIS_URL) throw new Error('REDIS_URL missing')

    // Find candidate (same logic as original helper)
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
      candidate = await prisma.designMedia.findFirst({ include: { design: true } })
    }

    if (!candidate) {
      console.error('No DesignMedia records found in DB')
      process.exit(1)
    }

    console.log('Selected candidate:')
    console.log(JSON.stringify({ id: candidate.id, fileUrl: candidate.fileUrl, designId: candidate.design?.id, designThumbnail: candidate.design?.thumbnailUrl }, null, 2))

    const queue = new Queue('thumbnails', { connection: { url: process.env.REDIS_URL } })
    console.log('Connected to Redis, queue ready')

    const job = await queue.add('generate-thumbnail', {
      designId: candidate.design?.id,
      mediaId: candidate.id,
      fileUrl: candidate.fileUrl,
    }, { removeOnComplete: true, attempts: 3, backoff: { type: 'exponential', delay: 5000 } })

    console.log('Enqueued job id:', job.id)
    await queue.close()
    process.exit(0)
  } catch (err) {
    console.error('Enqueue failed:')
    console.error(err && err.stack ? err.stack : err)
    process.exit(1)
  }
}

main()
