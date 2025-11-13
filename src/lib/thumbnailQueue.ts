// Lightweight enqueue helper for thumbnail generation jobs.
// Uses dynamic import of bullmq so tests/dev runs without the package unless REDIS_URL is configured.
// import prisma from '@/lib/prisma' // Removed unused import

export async function enqueueThumbnailJob(jobData: { mediaId: string; designId: string; fileUrl: string }) {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return null

  try {
    const { Queue } = await import('bullmq')
    const queue = new Queue('thumbnails', { connection: { url: redisUrl } })
    // Add job with retries/backoff
    await queue.add('generate-thumbnail', jobData, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } })
    return true
  } catch (err) {
    // don't throw — queue is best-effort; log and continue
    console.warn('Failed to enqueue thumbnail job', err)
    return null
  }
}

export interface DesignMedia {
  id: string;
  fileType: string;
  fileUrl: string;
}

export interface Design {
  id: string;
  mediaFiles: DesignMedia[];
}

export async function enqueueThumbnailJobsForDesign(design: Design) {
  if (!design?.mediaFiles?.length) return;
  for (const m of design.mediaFiles) {
    if (m.fileType === 'VIDEO' && typeof m.fileUrl === 'string' && m.fileUrl.startsWith('/uploads/')) {
      // enqueue per-media job
      await enqueueThumbnailJob({ mediaId: m.id, designId: design.id, fileUrl: m.fileUrl });
    }
  }
}
