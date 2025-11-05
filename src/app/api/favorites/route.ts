import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const idsOnly = searchParams.get('idsOnly') === 'true'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))

    if (idsOnly) {
      const favs = await prisma.favorite.findMany({ where: { userId: session.user.id }, select: { designId: true } })
      const ids = favs.map(f => f.designId)
      return NextResponse.json({ ids })
    }

    // pagination
    const skip = (page - 1) * pageSize
    const [itemsRaw, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId: session.user.id },
        include: { design: { include: { designer: { select: { id: true, name: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.favorite.count({ where: { userId: session.user.id } })
    ])

    const mapped = itemsRaw.map(f => ({
      id: f.design.id,
      title: f.design.title,
      imageUrl: f.design.thumbnailUrl || f.design.imageUrl,
      price: f.design.price,
      designerName: f.design.designer?.name || null,
      createdAt: f.createdAt
    }))

    return NextResponse.json({ items: mapped, total, page, pageSize })
  } catch {
    console.error('Get favorites error')
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { designId } = body || {}
    if (!designId) {
      return NextResponse.json({ message: 'Design ID required' }, { status: 400 })
    }

    // Ensure design exists
    const design = await prisma.design.findUnique({ where: { id: designId } })
    if (!design) {
      return NextResponse.json({ message: 'Design not found' }, { status: 404 })
    }

    // Create favorite if not exists
    try {
      const fav = await prisma.favorite.create({
        data: { userId: session.user.id, designId },
      })
      return NextResponse.json({ message: 'Added', fav })
    } catch (err) {
      // unique constraint -> already exists
      return NextResponse.json({ message: 'Already added' }, { status: 200 })
    }
  } catch (error) {
    console.error('Add favorite error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const designId = searchParams.get('designId')
    if (!designId) {
      return NextResponse.json({ message: 'Design ID required' }, { status: 400 })
    }

    await prisma.favorite.deleteMany({ where: { userId: session.user.id, designId } })
    return NextResponse.json({ message: 'Removed' })
  } catch (error) {
    console.error('Remove favorite error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
