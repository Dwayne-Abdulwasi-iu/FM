import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const difficulty = searchParams.get('difficulty')
    const featured = searchParams.get('featured')

  const where: Record<string, unknown> = {}
    
    if (category && category !== 'all') {
      where.category = category
    }
    
    if (type && type !== 'all') {
      where.type = type
    }
    
    if (difficulty && difficulty !== 'all') {
      where.difficulty = difficulty
    }
    
    if (featured === 'true') {
      where.featured = true
    }

    const resources = await prisma.resource.findMany({
      where,
      orderBy: [
        { featured: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({ resources })
  } catch (error) {
    void error
    console.error('Failed to fetch resources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true }
    })

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      type,
      category,
      difficulty,
      format,
      url,
      downloadUrl,
      thumbnail,
      duration,
      featured,
      tags
    } = body

    // Validate required fields
    if (!title || !description || !type || !category || !difficulty || !format) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const resource = await prisma.resource.create({
      data: {
        title,
        description,
        type,
        category,
        difficulty,
        format,
        url: url || null,
        downloadUrl: downloadUrl || null,
        thumbnail: thumbnail || '/api/placeholder/300/200',
        duration: duration || null,
        rating: 0,
        views: 0,
        featured: featured || false,
        tags: typeof tags === 'string' ? tags : (Array.isArray(tags) ? tags.join(', ') : ''),
        createdById: session.user.id
      }
    })

    return NextResponse.json({ resource }, { status: 201 })
  } catch (error) {
    void error
    console.error('Failed to create resource:', error)
    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true }
    })

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, tags, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Resource ID required' },
        { status: 400 }
      )
    }

    const processedData = {
      ...updateData,
      tags: typeof tags === 'string' ? tags : (Array.isArray(tags) ? tags.join(', ') : updateData.tags)
    }

    const resource = await prisma.resource.update({
      where: { id },
      data: processedData
    })

    return NextResponse.json({ resource })
  } catch (error) {
    void error
    console.error('Failed to update resource:', error)
    return NextResponse.json(
      { error: 'Failed to update resource' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true }
    })

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Resource ID required' },
        { status: 400 }
      )
    }

    await prisma.resource.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    void error
    console.error('Failed to delete resource:', error)
    return NextResponse.json(
      { error: 'Failed to delete resource' },
      { status: 500 }
    )
  }
}