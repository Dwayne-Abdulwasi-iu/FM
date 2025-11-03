import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fsp } from 'fs'
import { createReadStream } from 'fs'
import { Readable } from 'stream'

// Simple mime lookup
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.mp4':
      return 'video/mp4'
    case '.webm':
      return 'video/webm'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    case '.svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}

export async function GET(request: NextRequest, context: unknown) {
  try {
    // Resolve to the project root public/uploads directory by default
    // This supports runtime-generated files when running in standalone mode
    const params = (context as { params?: { path?: string[] } })?.params
    const segments = params?.path || []

    // Prevent path traversal
    if (segments.some(seg => seg === '..' || seg.includes('..'))) {
      return NextResponse.json({ message: 'Invalid path' }, { status: 400 })
    }

    const rootUploadsDir = path.join(process.cwd(), 'public', 'uploads')
    const filePath = path.join(rootUploadsDir, ...segments)

    // Ensure the resolved path is still within uploads dir
    const normalizedUploads = path.normalize(rootUploadsDir + path.sep)
    const normalizedFile = path.normalize(filePath)
    if (!normalizedFile.startsWith(normalizedUploads)) {
      return NextResponse.json({ message: 'Invalid path' }, { status: 400 })
    }

    const stat = await fsp.stat(filePath)

    const range = request.headers.get('range')
    const contentType = getMimeType(filePath)

    if (range) {
      // Parse Range header, e.g., bytes=0- or bytes=0-1023
      const size = stat.size
      const matches = /bytes=(\d*)-(\d*)/.exec(range)
      const start = matches && matches[1] ? parseInt(matches[1], 10) : 0
      const end = matches && matches[2] ? parseInt(matches[2], 10) : size - 1

      if (isNaN(start) || isNaN(end) || start > end || start >= size) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${size}`,
          },
        })
      }

      const chunkSize = end - start + 1
      const stream = createReadStream(filePath, { start, end })
      const webStream = Readable.toWeb(stream) as unknown as ReadableStream

      return new Response(webStream, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(chunkSize),
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    // Full file response
    const stream = createReadStream(filePath)
    const webStream = Readable.toWeb(stream) as unknown as ReadableStream

    return new Response(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(stat.size),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') {
      return NextResponse.json({ message: 'File not found' }, { status: 404 })
    }
    console.error('File serve error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
