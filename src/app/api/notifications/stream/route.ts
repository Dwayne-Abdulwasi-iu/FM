import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { subscribe } from '@/lib/notificationsPubSub'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        // send an initial comment/ok so the client knows the stream opened
        controller.enqueue(encoder.encode('event: connected\ndata: ok\n\n'))

        const cb = (payload: unknown) => {
          try {
            const s = `data: ${JSON.stringify(payload)}\n\n`
            controller.enqueue(encoder.encode(s))
          } catch {}
        }

        const unsub = subscribe(userId, cb)

        // keepalive ping every 15s to avoid proxies dropping the connection
        const keepaliveId = setInterval(() => {
          try { controller.enqueue(encoder.encode(':keepalive\n\n')) } catch {}
        }, 15000)

        // store cleanup on controller
        // attach cleanup to controller in a typed-safe way via a Symbol key
        const CLEANUP = Symbol.for('sse_cleanup') as unknown as string
        ;(controller as unknown as Record<string, unknown>)[CLEANUP] = () => {
          unsub()
          clearInterval(keepaliveId)
        }
      },
      cancel() {
        // on client disconnect
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      }
    })
  } catch (err) {
    console.error('SSE stream error', err)
    return NextResponse.json({ message: 'Failed to open stream' }, { status: 500 })
  }
}
