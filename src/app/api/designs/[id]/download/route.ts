import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

  const { id } = await context.params
    const designId = id

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

    // Create a simple download response with file list for now
    // In production, you would create an actual ZIP file
    const fileList = design.mediaFiles.map(file => ({
      name: file.fileName,
      url: file.fileUrl,
      type: file.fileType,
      size: file.fileSize,
      accessType: file.accessType
    }))

    const downloadData = {
      design: {
        title: design.title,
        description: design.description,
        category: design.category,
        tags: design.tags,
        designer: design.designer.name,
      },
      files: fileList,
      downloadDate: new Date().toISOString(),
      note: "In production, this would be a ZIP file with actual media files"
    }

    const jsonContent = JSON.stringify(downloadData, null, 2)
    
    return new NextResponse(jsonContent, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${design.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_info.json"`,
      },
    })

  } catch (error: unknown) {
    console.error('Download error:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable, please try again later.')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}