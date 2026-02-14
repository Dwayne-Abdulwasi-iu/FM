import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Verify admin
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)
    const category = searchParams.get('category')
    const action = searchParams.get('action')
    const status = searchParams.get('status') // 'success' or 'failed'

    // Build where clause
    const where: any = {}
    if (category) where.category = category
    if (action) where.action = action
    if (status === 'success') where.success = true
    if (status === 'failed') where.success = false

    // Fetch logs
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Get total count for pagination info
    const total = await prisma.auditLog.count({ where })

    return NextResponse.json({
      logs,
      total,
      limit,
    })
  } catch (error) {
    console.error('Audit log fetch error:', error)

    const prismaResp = prismaErrorResponse(
      error,
      'Database temporarily unavailable'
    )
    if (prismaResp) return prismaResp

    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}
