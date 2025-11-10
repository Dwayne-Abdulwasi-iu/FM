import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import prisma from '@/lib/prisma'

// Dev-only endpoint to run the submittedPrice backfill. Guarded by ENABLE_DEV_API and non-production.
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_API !== 'true') {
    return NextResponse.json({ message: 'Not available' }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const applyQuery = url.searchParams.get('apply') === 'true'
    const body = await request.json().catch(() => ({}))
    const apply = body?.apply === true || applyQuery

  const limit = Number(body?.limit ?? 200) || 200
  const batchSize = Number(body?.batchSize ?? 50) || 50
  const preview = Number(body?.preview ?? 10) || 10
  const auditFile = typeof body?.auditFile === 'string' ? body.auditFile : null
  const confirm = body?.confirm === true || body?.yes === true
  const retainDays = Number(body?.retainDays ?? 30) || 30
  const noCleanup = body?.noCleanup === true

    const missing = await prisma.design.findMany({
      where: { submittedPrice: null },
      select: { id: true, title: true, price: true, currency: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: limit
    })

    if (!apply) {
      return NextResponse.json({ count: missing.length, sample: missing.slice(0, preview) })
    }

    // require explicit confirmation in the API to avoid accidental writes
    if (!confirm) {
      return NextResponse.json({ message: 'Confirmation required to apply. Include { "apply": true, "confirm": true } in the JSON body.' }, { status: 400 })
    }

    // prepare audit file if requested. If none specified, default to a timestamped file in tmp/backfills/
    let auditStream: fs.WriteStream | null = null
    let auditPath: string | null = null
    let effectiveAudit: string | null = null
    if (auditFile) {
      effectiveAudit = auditFile
    } else {
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      effectiveAudit = `tmp/backfills/dev-backfill-audit-${ts}.jsonl`
    }

    if (effectiveAudit) {
      try {
        const outPath = path.resolve(process.cwd(), effectiveAudit)
        const dir = path.dirname(outPath)
        fs.mkdirSync(dir, { recursive: true })

        // cleanup old audit files unless disabled
        if (!noCleanup) {
          try {
            const now = Date.now()
            const retainMs = Number(retainDays) * 24 * 60 * 60 * 1000
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

        const humanTs = new Date().toISOString().replace('T', ' ').replace(/Z$/, ' UTC')
        auditStream = fs.createWriteStream(outPath, { flags: 'a' })
        auditStream.write(`# dev backfill run at ${humanTs}\n`)
        auditPath = outPath

        // Update a "latest" pointer in the same directory. Try symlink first, fall back to copy for Windows/non-admin.
        try {
          const latestPath = path.join(dir, 'latest.jsonl')
          try {
            if (fs.existsSync(latestPath)) fs.unlinkSync(latestPath)
            fs.symlinkSync(outPath, latestPath)
          } catch {
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
        console.error('Failed to open audit file', effectiveAudit, err)
        // continue without audit
        auditStream = null
        auditPath = null
      }
    }

    let updated = 0
    for (let i = 0; i < missing.length; i += batchSize) {
      const batch = missing.slice(i, i + batchSize)
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
          console.error('Backfill update failed for', d.id, err)
          if (auditStream) auditStream.write(JSON.stringify({ id: d.id, error: String(err) }) + '\n')
        }
      })
      await Promise.all(ops)
    }

    if (auditStream) {
      auditStream.end()
    }

    return NextResponse.json({ updated, totalChecked: missing.length, auditFile: auditPath })
  } catch (err) {
    console.error('Dev backfill error', err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
