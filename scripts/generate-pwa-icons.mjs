#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

async function generate() {
  const svgPath = path.resolve(process.cwd(), 'public', 'favicon.svg')
  const outDir = path.resolve(process.cwd(), 'public', 'icons')
  if (!fs.existsSync(svgPath)) {
    console.error('public/favicon.svg not found; place your SVG at public/favicon.svg and re-run')
    process.exit(1)
  }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const sizes = [192, 512]
  for (const size of sizes) {
    const out = path.join(outDir, `icon-${size}.png`)
    try {
      await sharp(svgPath).resize(size, size).png().toFile(out)
      console.log('Written', out)
    } catch (err) {
      console.error('Failed to generate', out, err)
    }
  }
}

generate()
