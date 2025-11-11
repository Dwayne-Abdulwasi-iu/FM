import { Queue } from 'bullmq'

const redisUrl = process.env.REDIS_URL
if (!redisUrl) {
  console.error('REDIS_URL not configured')
  process.exit(1)
}

async function main() {
  const queue = new Queue('thumbnails', { connection: { url: redisUrl } })
  const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')
  console.log('Queue counts:', counts)
  const waitingJobs = await queue.getJobs(['waiting'], 0, 10, false)
  if (waitingJobs && waitingJobs.length) {
    console.log('Waiting jobs list:')
    for (const j of waitingJobs) {
      console.log('-', j.id, j.name, j.data)
    }
  }
  await queue.close()
}

main().catch((err) => { console.error(err); process.exit(1) })
