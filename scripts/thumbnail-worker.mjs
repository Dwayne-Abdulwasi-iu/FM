#!/usr/bin/env node
// Worker process that listens for thumbnail jobs and extracts thumbnails for local videos.
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import prisma from '../src/lib/prisma.mjs'

const redisUrl = process.env.REDIS_URL
if (!redisUrl) {
  console.error('REDIS_URL not set; worker cannot start')
  process.exit(1)
}

;(async () => {
  try {
    const { Worker } = await import('bullmq')
    const worker = new Worker('thumbnails', async (job) => {
      const { mediaId, designId, fileUrl } = job.data
      if (!fileUrl || !fileUrl.startsWith('/uploads/')) return

      const localPath = path.join(process.cwd(), 'public', fileUrl.replace(/^\//, ''))
      if (!fs.existsSync(localPath)) return

      const uploadsDir = path.dirname(localPath)
      const base = path.basename(localPath, path.extname(localPath))
      const thumbName = `${base}_thumb.jpg`
      const thumbPath = path.join(uploadsDir, thumbName)

      // Use ffprobe to pick a frame at ~10% of duration (or at least 1s) for a better thumbnail
      const ffmpegCmd = process.env.FFMPEG_PATH || 'ffmpeg'
      const ffprobeCmd = process.env.FFPROBE_PATH || 'ffprobe'
      let offsetSeconds = '1'
      try {
        const probeArgs = ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', localPath]
        const probe = spawn(ffprobeCmd, probeArgs)
        let out = ''
        for await (const chunk of probe.stdout) out += chunk.toString()
        await new Promise((res, rej) => {
          probe.on('error', (err) => rej(err))
          probe.on('close', (code) => code === 0 ? res(null) : res(null))
        }).catch(() => {})
        const dur = parseFloat(out || '0')
        if (dur > 2) {
          const candidate = Math.floor(dur * 0.1)
          offsetSeconds = String(Math.max(1, candidate))
        }
      } catch {
        // ffprobe not available or failed — fall back to 1s
      }

      const args = ['-y', '-ss', offsetSeconds, '-i', localPath, '-vframes', '1', '-q:v', '2', thumbPath]
      await new Promise((resolve, reject) => {
        const p = spawn(ffmpegCmd, args)
        p.on('error', (err) => reject(err))
        p.on('close', (code) => code === 0 ? resolve(null) : reject(new Error('ffmpeg exit ' + code)))
      }).catch((err) => {
        console.warn('ffmpeg thumbnail extraction failed', err?.message || err)
        return null
      })

      if (fs.existsSync(thumbPath)) {
        const thumbUrl = `/uploads/${path.basename(thumbPath)}`
        try {
          // Update design thumbnail if not set
          await prisma.design.update({ where: { id: designId }, data: { thumbnailUrl: thumbUrl } })
        } catch (dbErr) {
          console.warn('Failed to update design thumbnail in DB', dbErr)
        }
      } else {
        // ffmpeg/ffprobe may not be available in this environment. Fall back to a safe placeholder
        const placeholderUrl = '/images/placeholder-design.svg'
        console.warn('Thumbnail not generated; falling back to placeholder:', placeholderUrl)
        try {
          await prisma.design.update({ where: { id: designId }, data: { thumbnailUrl: placeholderUrl } })
        } catch (dbErr) {
          console.warn('Failed to update design thumbnail in DB with placeholder', dbErr)
        }
      }
    }, { connection: { url: redisUrl } })

    worker.on('failed', (job, err) => {
      console.error('Thumbnail job failed', job.id, err)
    })

    console.log('Thumbnail worker started')
  } catch (err) {
    console.error('Failed to start thumbnail worker (bullmq missing or connection failed):', err)
    process.exit(1)
  }
})()
