import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import archiver from 'archiver'
import { PassThrough } from 'stream'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ orderId: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
  }

  const { orderId, itemId } = await context.params
  if (!orderId || !itemId) {
    return new Response(JSON.stringify({ message: 'Missing params' }), { status: 400 })
  }

  // Fetch order and verify ownership
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId: session.user.id },
    include: {
      items: {
        include: {
          design: {
            include: { mediaFiles: { orderBy: { sortOrder: 'asc' } } }
          }
        }
      }
    }
  })

  if (!order) return new Response(JSON.stringify({ message: 'Order not found' }), { status: 404 })

  const item = order.items.find((it) => it.id === itemId)
  if (!item) return new Response(JSON.stringify({ message: 'Order item not found' }), { status: 404 })

  const mediaFiles = item.design?.mediaFiles || []

  // Create zip archive containing the files for this single item
  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.on('warning', (err) => console.warn('zip warning', err))
  archive.on('error', (err) => console.error('zip error', err))

  for (const mf of mediaFiles) {
    try {
      if (mf.fileUrl) {
        const res = await fetch(mf.fileUrl)
        if (!res.ok || !res.body) continue
        const arrayBuffer = await res.arrayBuffer()
        archive.append(Buffer.from(arrayBuffer), { name: `${item.design.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${item.id}/${mf.fileName || 'file'}` })
      }
    } catch {
      // skip problematic file
      continue
    }
  }

  const pass = new PassThrough()
  const chunks: Buffer[] = []
  pass.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
  pass.on('error', (e) => console.error('zip stream error', e))
  archive.pipe(pass)

  await archive.finalize()
  await new Promise<void>((resolve, reject) => {
    pass.on('end', () => resolve())
    pass.on('error', (err) => reject(err))
  })

  const zipBuffer = Buffer.concat(chunks)
  const fileName = `item_${item.id}_${order.orderNumber || order.id}.zip`
  return new Response(new Uint8Array(zipBuffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store'
    }
  })
}
