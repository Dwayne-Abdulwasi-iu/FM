import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Helper to fetch a file and return its buffer
async function fetchFileBuffer(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    return { buffer: Buffer.from(arrayBuffer), contentType }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const paramsObj = await params
    const designId = paramsObj.id
    
    // Check for fileId query param for individual file download
    const url = new URL(request.url)
    const fileId = url.searchParams.get('fileId')

    // Check if design exists
    const design = await prisma.design.findUnique({
      where: { id: designId },
      include: {
        designer: {
          select: {
            id: true,
            name: true,
          }
        },
        mediaFiles: {
          orderBy: {
            sortOrder: 'asc'
          }
        }
      }
    })

    if (!design) {
      return NextResponse.json(
        { error: 'Design not found' },
        { status: 404 }
      )
    }

    // Check if user has access (admin, owner or purchased)
    const isAdmin = session.user.role === 'ADMIN'
    const isOwner = design.designerId === session.user.id
    let hasAccess = isAdmin || isOwner

    if (!isAdmin && !isOwner) {
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId: session.user.id,
          designId: designId,
          accessGranted: true
        }
      })
      hasAccess = !!purchase
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied. Purchase required to download.' },
        { status: 403 }
      )
    }

    // Individual file download
    if (fileId) {
      const file = design.mediaFiles.find((f: { id: string }) => f.id === fileId)
      if (!file) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        )
      }

      const fileData = await fetchFileBuffer(file.fileUrl)
      if (!fileData) {
        return NextResponse.json(
          { error: 'Failed to fetch file from storage' },
          { status: 500 }
        )
      }

      return new NextResponse(new Uint8Array(fileData.buffer), {
        headers: {
          'Content-Type': fileData.contentType,
          'Content-Disposition': `attachment; filename="${file.fileName}"`,
          'Content-Length': fileData.buffer.length.toString(),
        },
      })
    }

    // Download all files - create a simple ZIP-like structure or return first file
    // For multiple files, we'll create a basic combined download
    if (design.mediaFiles.length === 0) {
      return NextResponse.json(
        { error: 'No files available for download' },
        { status: 404 }
      )
    }

    // If single file, download it directly
    if (design.mediaFiles.length === 1) {
      const file = design.mediaFiles[0]
      const fileData = await fetchFileBuffer(file.fileUrl)
      if (!fileData) {
        return NextResponse.json(
          { error: 'Failed to fetch file from storage' },
          { status: 500 }
        )
      }

      return new NextResponse(new Uint8Array(fileData.buffer), {
        headers: {
          'Content-Type': fileData.contentType,
          'Content-Disposition': `attachment; filename="${file.fileName}"`,
          'Content-Length': fileData.buffer.length.toString(),
        },
      })
    }

    // For multiple files, return a JSON manifest with direct download URLs
    // The frontend will handle downloading each file
    const downloadManifest = {
      designId: design.id,
      title: design.title,
      files: design.mediaFiles.map((file: { id: string; fileName: string; fileUrl: string; fileType: string; fileSize: number }) => ({
        id: file.id,
        name: file.fileName,
        downloadUrl: `/api/designs/${designId}/download?fileId=${file.id}`,
        type: file.fileType,
        size: file.fileSize,
      })),
      totalFiles: design.mediaFiles.length,
    }

    return NextResponse.json(downloadManifest)

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    )
  }
}