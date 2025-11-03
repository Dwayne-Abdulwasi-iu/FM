import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import archiver from 'archiver'
import { Readable } from 'stream'

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
            // Convert Web ReadableStream to Node stream for archiver
            const nodeStream = Readable.fromWeb(res.body as any)
            archive.append(nodeStream, { name: `${folder}/${mf.fileName || 'file'}` })
          }
        } catch (e) {
          // Skip problematic file
          continue
        }
      }
    }
  }

  // Finalize after next tick so the stream is set up
  const body = Readable.toWeb(archive as unknown as any) as unknown as ReadableStream
  // Kick off finalize asynchronously
  setImmediate(() => {
    archive.finalize().catch((e) => console.error('zip finalize error', e))
  })

  const fileName = `order_${order.orderNumber || order.id}.zip`
  return new Response(body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
