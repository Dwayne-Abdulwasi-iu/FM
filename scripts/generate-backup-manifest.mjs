import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import zlib from 'zlib'

const backupsDir = path.resolve('./backups')
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const manifestPath = path.join(backupsDir, `manifest-${timestamp}.json`)

async function fileHashAndCount(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', async () => {
      const sha256 = hash.digest('hex')
      // attempt to count lines (documents) by gunzipping and counting newlines
      let docs = null
      try {
        const gunzip = zlib.createGunzip()
        const rs = fs.createReadStream(filePath).pipe(gunzip)
        let count = 0
        rs.on('data', (chunk) => {
          for (let i = 0; i < chunk.length; i++) if (chunk[i] === 0x0a) count++
        })
        rs.on('end', () => {
          docs = count
          const stats = fs.statSync(filePath)
          resolve({ sha256, size: stats.size, docs })
        })
        rs.on('error', (e) => {
          // unable to gunzip or count; still return hash and size
          const stats = fs.statSync(filePath)
          resolve({ sha256, size: stats.size, docs: null })
        })
      } catch (err) {
        const stats = fs.statSync(filePath)
        resolve({ sha256, size: stats.size, docs: null })
      }
    })
  })
}

async function main() {
  if (!fs.existsSync(backupsDir)) {
    console.error('Backups directory not found:', backupsDir)
    process.exit(1)
  }
  const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.json.gz'))
  const entries = []
  for (const f of files) {
    const full = path.join(backupsDir, f)
    process.stdout.write(`Processing ${f} ... `)
    try {
      const { sha256, size, docs } = await fileHashAndCount(full)
      entries.push({ file: f, path: full, size, sha256, docs })
      console.log(`done (${size} bytes, docs=${docs ?? 'unknown'})`)
    } catch (err) {
      console.log('failed', err)
    }
  }
  const manifest = { generatedAt: new Date().toISOString(), files: entries }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log('Wrote manifest to', manifestPath)
  console.log('Summary:')
  for (const e of entries.sort((a,b) => b.size - a.size)) {
    console.log(`- ${e.file}: ${e.size} bytes, sha256=${e.sha256}, docs=${e.docs ?? 'unknown'}`)
  }
}

main().catch(err => { console.error(err); process.exit(2) })
