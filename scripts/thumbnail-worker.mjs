#!/usr/bin/env node
// Background worker: extract thumbnails for local videos, upload thumbnails to Cloudinary and update DB.
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import prisma from '../src/lib/prisma.mjs'
import { v2 as cloudinary } from 'cloudinary'

const redisUrl = process.env.REDIS_URL
if (!redisUrl) {
  console.error('REDIS_URL not set; worker cannot start')
  process.exit(1)
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

;(async () => {
  try {
    const { Worker } = await import('bullmq')
    const worker = new Worker('thumbnails', async (job) => {
      const { designId, fileUrl } = job.data
      if (!fileUrl) return

      // If fileUrl is a Cloudinary asset, derive a poster URL and update DB directly.
      try {
        const cloudMatch = String(fileUrl).match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i)
        if (cloudMatch && cloudMatch[1] && fileUrl.includes('res.cloudinary.com')) {
          const publicId = cloudMatch[1]
          // Attempt to build a video poster first; fallback to image transform
          let poster = cloudinary.url(publicId, { resource_type: 'video', format: 'jpg', transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto', start_offset: '1' }] })
          // If that fails for images, try as image
          try {
            await prisma.design.update({ where: { id: designId }, data: { thumbnailUrl: poster } })
            return
          } catch {
            // Try image transform
            poster = cloudinary.url(publicId, { resource_type: 'image', format: 'jpg', width: 400, height: 400, crop: 'fill', quality: 'auto' })
            try { await prisma.design.update({ where: { id: designId }, data: { thumbnailUrl: poster } }); return } catch {}
          }
        }
      } catch {
        // ignore and proceed to local processing
      }

      // If local file (e.g., /uploads/...), extract frame then upload to Cloudinary
      if (String(fileUrl).startsWith('/uploads/')) {
        const localPath = path.join(process.cwd(), 'public', fileUrl.replace(/^\//, ''))
        if (!fs.existsSync(localPath)) return

        const uploadsDir = path.dirname(localPath)
        const base = path.basename(localPath, path.extname(localPath))
        const thumbName = `${base}_thumb.jpg`
        const thumbPath = path.join(uploadsDir, thumbName)

        const ffmpegCmd = process.env.FFMPEG_PATH || 'ffmpeg'
        const ffprobeCmd = process.env.FFPROBE_PATH || 'ffprobe'
        let offsetSeconds = '1'
        try {
          const probeArgs = ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', localPath]
          const probe = spawn(ffprobeCmd, probeArgs)
          let out = ''
          for await (const chunk of probe.stdout) out += chunk.toString()
          await new Promise((res) => { probe.on('close', () => res(null)) }).catch(() => {})
          const dur = parseFloat(out || '0')
          if (dur > 2) {
            const candidate = Math.floor(dur * 0.1)
            offsetSeconds = String(Math.max(1, candidate))
          }
        } catch {}

        const args = ['-y', '-ss', offsetSeconds, '-i', localPath, '-vframes', '1', '-q:v', '2', thumbPath]
        try {
          await new Promise((resolve, reject) => {
            const p = spawn(ffmpegCmd, args)
            p.on('error', (err) => reject(err))
            p.on('close', (code) => code === 0 ? resolve(null) : reject(new Error('ffmpeg exit ' + code)))
          })
        } catch (err) {
          console.warn('ffmpeg thumbnail extraction failed', err?.message || err)
          return
        }

        if (fs.existsSync(thumbPath)) {
          try {
            // Upload thumbnail to Cloudinary
            const res = await new Promise((resolve, reject) => {
              cloudinary.uploader.upload(thumbPath, { folder: 'fashion-designs/thumbnails', resource_type: 'image' }, (err, r) => {
                if (err) reject(err); else resolve(r)
              })
            })
            const secureUrl = res.secure_url
            // Update design thumbnail URL in DB
            await prisma.design.update({ where: { id: designId }, data: { thumbnailUrl: secureUrl } })
            // Optionally remove local thumb to avoid clutter
            try { fs.unlinkSync(thumbPath) } catch {}
          } catch (err) {
            console.warn('Failed to upload thumbnail to Cloudinary or update DB', err?.message || err)
          }
        }
      }
    }, { connection: { url: redisUrl } })

    worker.on('failed', (job, err) => {
      console.error('Thumbnail job failed', job.id, err)
    })

    console.log('Thumbnail worker started (uploads thumbnails to Cloudinary)')
  } catch (err) {
    console.error('Failed to start thumbnail worker (bullmq missing or connection failed):', err)
    process.exit(1)
  }
})()
