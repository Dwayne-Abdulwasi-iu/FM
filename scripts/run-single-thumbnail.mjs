#!/usr/bin/env node
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import prisma from '../src/lib/prisma.mjs'

const mediaId = process.argv[2]
const designId = process.argv[3]
const fileUrl = process.argv[4]
if (!mediaId || !designId || !fileUrl) {
  console.error('Usage: node scripts/run-single-thumbnail.mjs <mediaId> <designId> <fileUrl>')
  process.exit(1)
}

async function run() {
  const localPath = path.join(process.cwd(), 'public', fileUrl.replace(/^\/+/, ''))
  if (!fs.existsSync(localPath)) {
    console.error('Local file not found:', localPath)
    process.exit(1)
  }

  const ffmpegCmd = process.env.FFMPEG_PATH || 'ffmpeg'
  const ffprobeCmd = process.env.FFPROBE_PATH || 'ffprobe'
  let offsetSeconds = '1'
  try {
    const probeArgs = ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', localPath]
    const probe = spawn(ffprobeCmd, probeArgs)
    let out = ''
    for await (const chunk of probe.stdout) out += chunk.toString()
    await new Promise((res, rej) => { probe.on('error', rej); probe.on('close', (code) => res(null)) }).catch(() => {})
    const dur = parseFloat(out || '0')
    if (dur > 2) {
      const candidate = Math.floor(dur * 0.1)
      offsetSeconds = String(Math.max(1, candidate))
    }
  } catch (err) {
    console.warn('ffprobe failed, falling back to 1s', err?.message || err)
  }

  const uploadsDir = path.dirname(localPath)
  const base = path.basename(localPath, path.extname(localPath))
  const thumbName = `${base}_thumb.jpg`
  const thumbPath = path.join(uploadsDir, thumbName)
  const args = ['-y', '-ss', offsetSeconds, '-i', localPath, '-vframes', '1', '-q:v', '2', thumbPath]
  console.log('Running ffmpeg', ffmpegCmd, args.join(' '))
  await new Promise((resolve, reject) => {
    const p = spawn(ffmpegCmd, args)
    p.on('error', (err) => reject(err))
    p.on('close', (code) => code === 0 ? resolve(null) : reject(new Error('ffmpeg exit ' + code)))
  }).catch((err) => { console.error('ffmpeg failed', err); process.exit(1) })

  if (fs.existsSync(thumbPath)) {
    const thumbUrl = `/uploads/${path.basename(thumbPath)}`
    try {
      await prisma.design.update({ where: { id: designId }, data: { thumbnailUrl: thumbUrl } })
      console.log('Updated design thumbnail to', thumbUrl)
    } catch (err) {
      console.error('DB update failed', err)
    }
  } else {
    console.error('Thumbnail not found after ffmpeg run')
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
