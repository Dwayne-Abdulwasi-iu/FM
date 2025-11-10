#!/usr/bin/env node
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function parseArgs() {
  const argv = process.argv.slice(2)
  const args = {
    apply: argv.includes('--apply'),
    yes: argv.includes('--yes'),
    skipBackup: argv.includes('--skip-backup'),
    limit: 200,
    batchSize: 50,
    preview: 10,
    auditFile: null
  }

  const getVal = (flag, fallback) => {
    const idx = argv.indexOf(flag)
    if (idx === -1) return fallback
    const next = argv[idx + 1]
    if (!next || next.startsWith('--')) return fallback
    return next
  }

  args.limit = Number(getVal('--limit', args.limit)) || args.limit
  args.batchSize = Number(getVal('--batch-size', args.batchSize)) || args.batchSize
  args.preview = Number(getVal('--preview', args.preview)) || args.preview
  const af = getVal('--audit-file', null)
  args.auditFile = af ? String(af) : null
  args.retainDays = Number(getVal('--retain-days', 30)) || 30
  args.noCleanup = argv.includes('--no-cleanup')

  return args
}

async function main() {
  const opts = parseArgs()

  console.log('\nBackfill submittedPrice/submittedCurrency for designs')
  console.log('Dry-run by default. Use --apply to write changes.')
  console.log(`Defaults: --limit ${opts.limit} --batch-size ${opts.batchSize} --preview ${opts.preview}`)

  const missing = await prisma.design.findMany({
    where: { submittedPrice: null },
    select: { id: true, title: true, price: true, currency: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
    take: opts.limit
  })

  if (!missing.length) {
    console.log('No designs found that are missing submittedPrice.')
    await prisma.$disconnect()
    process.exit(0)
  }

  console.log(`Found ${missing.length} design(s) missing submittedPrice (showing up to ${opts.limit}):`)
  const previewCount = Math.min(opts.preview, missing.length)
  for (let i = 0; i < previewCount; i++) {
    const d = missing[i]
    console.log(` - ${d.id} | ${d.title || '<untitled>'} | price=${d.price} | currency=${d.currency || 'USD'} | created=${d.createdAt.toISOString()}`)
  }

  if (!opts.apply) {
    console.log('\nDry run complete. To apply updates run:')
    console.log('  node scripts/backfill-submitted-prices.mjs --apply --yes')
    console.log('\nWhen applying, this script will set submittedPrice = price and submittedCurrency = currency (or USD if not set).')
    console.log('Recommended safe defaults are used; you can override with --limit, --batch-size, --preview, and --audit-file <path>.')
    await prisma.$disconnect()
    process.exit(0)
  }

  // Safety: Encourage a DB backup before applying unless user explicitly skips or confirms
  if (!opts.yes && !opts.skipBackup) {
    console.log('\nSAFETY: Please back up your database before applying this script.')
    console.log('You can run a quick dry-run (already shown). To proceed with apply, re-run with either:')
    console.log('  node scripts/backfill-submitted-prices.mjs --apply --yes')
    console.log('or to skip the backup prompt (not recommended):')
    console.log('  node scripts/backfill-submitted-prices.mjs --apply --skip-backup --yes')
    console.log('\nAborting to avoid accidental writes.')
    await prisma.$disconnect()
    process.exit(1)
  }

  console.log('\nApplying updates...')
  let updated = 0

  // prepare audit file: default to tmp/backfills/backfill-audit.jsonl when none provided
  let auditStream = null
  let auditPath = null
  if (opts.auditFile === null) {
    // default audit file for CLI uses a timestamped file to avoid appending to the same file
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    opts.auditFile = `tmp/backfills/backfill-audit-${ts}.jsonl`
  }
  // human-readable timestamp for header
  const humanTs = new Date().toISOString().replace('T', ' ').replace(/Z$/, ' UTC')
  if (opts.auditFile) {
    try {
      const outPath = path.resolve(process.cwd(), opts.auditFile)
      const dir = path.dirname(outPath)
      fs.mkdirSync(dir, { recursive: true })

      // cleanup old audit files unless disabled
      if (!opts.noCleanup) {
        try {
          const now = Date.now()
          const retainMs = Number(opts.retainDays) * 24 * 60 * 60 * 1000
          const files = fs.readdirSync(dir)
          for (const f of files) {
            const fp = path.join(dir, f)
            try {
              const st = fs.statSync(fp)
              if (!st.isFile()) continue
              if (now - st.mtimeMs > retainMs) {
                fs.unlinkSync(fp)
              }
            } catch {
              // ignore individual file errors
            }
          }
        } catch {
          // ignore cleanup errors
        }
      }

      auditStream = fs.createWriteStream(outPath, { flags: 'a' })
      auditStream.write(`# backfill-submitted-prices run at ${humanTs}\n`)
      auditPath = outPath

      // Update a "latest" pointer in the same directory. Try symlink first, fall back to copy for Windows/non-admin.
      try {
        const latestPath = path.join(dir, 'latest.jsonl')
        try {
          // remove existing link/file if present
          if (fs.existsSync(latestPath)) fs.unlinkSync(latestPath)
          fs.symlinkSync(outPath, latestPath)
        } catch {
          // fallback: copy the file to latest.jsonl
          try {
            fs.copyFileSync(outPath, latestPath)
          } catch {
            // ignore failure to create latest pointer
          }
        }
      } catch {
        // ignore any errors updating latest pointer
      }
    } catch (err) {
      console.error('Failed to open audit file', opts.auditFile, err)
      auditStream = null
    }
  }

  // process in batches
  for (let i = 0; i < missing.length; i += opts.batchSize) {
    const batch = missing.slice(i, i + opts.batchSize)
    const ops = batch.map(async (d) => {
      try {
        const subCurr = d.currency || 'USD'
        const before = { id: d.id, price: d.price, currency: d.currency }
        await prisma.design.update({ where: { id: d.id }, data: { submittedPrice: d.price, submittedCurrency: subCurr } })
        updated++
        if (auditStream) {
          const after = { submittedPrice: d.price, submittedCurrency: subCurr }
          auditStream.write(JSON.stringify({ before, after }) + '\n')
        }
      } catch (err) {
        console.error('Failed to update', d.id, err)
        if (auditStream) {
          auditStream.write(JSON.stringify({ id: d.id, error: String(err) }) + '\n')
        }
      }
    })
    // run the batch in parallel but wait for completion before next batch
    await Promise.all(ops)
  }

  if (auditStream) {
    auditStream.end()
    console.log(`Wrote audit log to ${auditPath}`)
  }

  console.log(`Updated ${updated} record(s).`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect().finally(() => process.exit(1))
})
