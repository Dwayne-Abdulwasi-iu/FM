import { Queue } from 'bullmq'

const redisUrl = process.env.REDIS_URL
if (!redisUrl) {
  console.error('REDIS_URL not configured')
  process.exit(1)
}

async function main() {
  const queue = new Queue('thumbnails', { connection: { url: redisUrl } })
  const completed = await queue.getJobs(['completed'], 0, 20, false)
  console.log('Completed jobs count:', completed.length)
  for (const j of completed) console.log(j.id, j.name, j.data)
  await queue.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
