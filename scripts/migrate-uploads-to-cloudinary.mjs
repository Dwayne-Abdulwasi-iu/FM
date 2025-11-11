#!/usr/bin/env node
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import cloudinary from 'cloudinary'
import prisma from '../src/lib/prisma.mjs'

// Usage: node -r dotenv/config scripts/migrate-uploads-to-cloudinary.mjs --limit=50 --dry

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const uploadsDir = path.join(root, 'public', 'uploads')

function parseArgs () {
  const args = {}
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [k, v] = arg.replace(/^--/, '').split('=')
      args[k] = v === undefined ? true : v
    }
  }
  return args
}

async function main () {
  const args = parseArgs()
  const limit = args.limit ? Number(args.limit) : Infinity
  const dry = Boolean(args.dry)

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('Cloudinary environment variables are not set. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET')
    process.exit(1)
  }

  cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  console.log('Scanning', uploadsDir)
  const files = await fs.readdir(uploadsDir)
  const uploadFiles = files.filter(f => !f.startsWith('.')).slice(0, limit)
  console.log(`Found ${files.length} files, processing ${uploadFiles.length}`)

  let processed = 0
  for (const fileName of uploadFiles) {
    const filePath = path.join(uploadsDir, fileName)
    const stat = await fs.stat(filePath)
    if (!stat.isFile()) continue

    // find matching media records (by fileName or fileUrl containing fileName)
    const matches = await prisma.designMedia.findMany({
      where: {
        OR: [
          { fileName: { equals: fileName } },
          { fileUrl: { contains: fileName } },
        ],
      },
    })

    if (!matches || matches.length === 0) {
      console.log(`No DB media found for ${fileName} — skipping`)
      continue
    }

    console.log(`Uploading ${fileName} (matched ${matches.length} media records)`)

    if (dry) {
      console.log('[dry] would upload:', filePath)
      processed++
      continue
    }

    const buffer = await fs.readFile(filePath)

    try {
      const res = await new Promise((resolve, reject) => {
        cloudinary.v2.uploader.upload_stream({ folder: 'fashion-marketplace', resource_type: 'auto' }, (err, r) => {
          if (err) reject(err); else resolve(r)
        }).end(buffer)
      })

      const publicId = res.public_id
      const secureUrl = res.secure_url

      console.log(`Uploaded ${fileName} -> ${secureUrl}`)

      for (const media of matches) {
        // update DesignMedia.fileUrl
        await prisma.designMedia.update({
          where: { id: media.id },
          data: { fileUrl: secureUrl },
        })

        // update parent design thumbnail if it references local uploads or is empty
        const design = await prisma.design.findUnique({ where: { id: media.designId } })
        if (design) {
          const needsThumb = !design.thumbnailUrl || design.thumbnailUrl.includes('/uploads/') || design.thumbnailUrl === ''
          if (needsThumb) {
            // Generate a derived thumbnail URL (force jpg from video if needed)
            const thumb = cloudinary.v2.url(publicId, { resource_type: 'video', format: 'jpg', width: 400, crop: 'fill', quality: 'auto' })
            await prisma.design.update({ where: { id: design.id }, data: { thumbnailUrl: thumb } })
            console.log(`Updated Design(${design.id}).thumbnailUrl -> ${thumb}`)
          }
        }
      }

      processed++
    } catch (err) {
      console.error(`Upload failed for ${fileName}:`, err)
    }
  }

  console.log(`Processed ${processed} files`)
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
