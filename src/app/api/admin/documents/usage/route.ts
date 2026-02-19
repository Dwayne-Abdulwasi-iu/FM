import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST: Record document usage
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { versionId, usageType, format } = body

    // Validate required fields
    if (!versionId || !usageType) {
      return NextResponse.json(
        { error: 'versionId and usageType required' },
        { status: 400 }
      )
    }

    // Verify version exists
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
    })

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    // Get session if available (optional for tracking)
    const session = await getServerSession(authOptions)

    // Record usage
    const usage = await prisma.documentUsage.create({
      data: {
        versionId,
        usageType,
        format: format || 'HTML',
        userId: session?.user?.id || null,
        userAgent: req.headers.get('user-agent') || null,
        // Extract IP from headers (works with proxies)
        ipAddress:
          req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
          req.headers.get('x-real-ip') ||
          null,
      },
    })

    // Update version download/access count
    if (usageType === 'DOWNLOADED') {
      await prisma.documentVersion.update({
        where: { id: versionId },
        data: {
          downloads: { increment: 1 },
          lastAccessedAt: new Date(),
        },
      })
    } else {
      await prisma.documentVersion.update({
        where: { id: versionId },
        data: { lastAccessedAt: new Date() },
      })
    }

    return NextResponse.json({
      success: true,
      usage,
    })
  } catch (error) {
    console.error('Error recording usage:', error)
    return NextResponse.json(
      { error: 'Failed to record usage' },
      { status: 500 }
    )
  }
}

// GET: Get usage statistics for a version
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const versionId = searchParams.get('versionId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!versionId) {
      return NextResponse.json(
        { error: 'versionId query parameter required' },
        { status: 400 }
      )
    }

    // Build filter
    const filter: any = { versionId }
    if (startDate || endDate) {
      filter.accessedAt = {}
      if (startDate) filter.accessedAt.gte = new Date(startDate)
      if (endDate) filter.accessedAt.lte = new Date(endDate)
    }

    // Get usage records
    const usageRecords = await prisma.documentUsage.findMany({
      where: filter,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { accessedAt: 'desc' },
    })

    // Aggregate statistics
    const stats = {
      total: usageRecords.length,
      byType: usageRecords.reduce(
        (acc, u) => {
          acc[u.usageType] = (acc[u.usageType] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      ),
      byFormat: usageRecords.reduce(
        (acc, u) => {
          acc[u.format] = (acc[u.format] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      ),
      uniqueUsers: new Set(usageRecords.map((u) => u.userId).filter(Boolean)).size,
      lastAccessed: usageRecords[0]?.accessedAt || null,
    }

    return NextResponse.json({
      stats,
      records: usageRecords,
    })
  } catch (error) {
    console.error('Error fetching usage stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage statistics' },
      { status: 500 }
    )
  }
}
