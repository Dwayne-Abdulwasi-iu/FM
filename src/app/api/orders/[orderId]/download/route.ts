import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import archiver from 'archiver'
import { PassThrough } from 'stream'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
  }

  const { orderId } = await context.params
  if (!orderId) {
    return new Response(JSON.stringify({ message: 'Missing orderId' }), { status: 400 })
  }

  // Fetch order and verify ownership
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId: session.user.id },
    include: {
      items: {
        include: {
          design: {
            include: {
              mediaFiles: { orderBy: { sortOrder: 'asc' } }
            }
          }
        }
      }
    }
  })

  if (!order) {
    return new Response(JSON.stringify({ message: 'Order not found' }), { status: 404 })
  }

  // Prepare archive
  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.on('warning', (err) => {
    console.warn('zip warning', err)
  })
  archive.on('error', (err) => {
    console.error('zip error', err)
  })

  // Add files for each design
  for (const item of order.items) {
    const design = item.design
    const folder = `${design.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${item.id}`

    if (design.mediaFiles && design.mediaFiles.length > 0) {
      for (const mf of design.mediaFiles) {
        try {
          if (mf.fileUrl) {
            const res = await fetch(mf.fileUrl)
            if (!res.ok || !res.body) {
              continue
            }
            // Simpler and type-safe: buffer the response body and append as Buffer
            const arrayBuffer = await res.arrayBuffer()
            archive.append(Buffer.from(arrayBuffer), { name: `${folder}/${mf.fileName || 'file'}` })
          }
        } catch {
          // Skip problematic file
          continue
        }
      }
    }
  }

  // Pipe archive to PassThrough and collect into a single buffer
  const pass = new PassThrough()
  const chunks: Buffer[] = []
  pass.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
  pass.on('error', (e) => console.error('zip stream error', e))
  archive.pipe(pass)

  await archive.finalize()
  await new Promise<void>((resolve, reject) => {
    pass.on('end', () => resolve())
    pass.on('error', (err) => reject(err))
  })

  const zipBuffer = Buffer.concat(chunks)
  const fileName = `order_${order.orderNumber || order.id}.zip`
  return new Response(new Uint8Array(zipBuffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
