import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { designId, reason } = await request.json()
    if (!designId) {
      return NextResponse.json({ message: 'designId is required' }, { status: 400 })
    }

    // Only allow sellers to request deactivation for their own design
    const design = await prisma.design.findUnique({ where: { id: designId } })
    if (!design) {
      return NextResponse.json({ message: 'Design not found' }, { status: 404 })
    }

    if (design.designerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const subject = `Deactivation request: ${design.title}`
    const messageLines = [
      `Title: ${design.title}`,
      `ID: ${design.id}`,
      `DesignerId: ${design.designerId}`,
      `Owned: ${design.isOwned ? 'Yes' : 'No'}`,
      `TotalSales: ${design.totalSales}`,
      '',
      'Reason:',
      (reason && String(reason).trim()) || 'Requesting admin deactivation of this design.',
    ]

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name: session.user.name || 'Seller',
        email: session.user.email || '',
        subject,
        message: messageLines.join('\n'),
        priority: 'high',
        status: 'OPEN',
        userId: session.user.id,
      },
    })

    return NextResponse.json({ id: contactMessage.id, message: 'Request submitted' }, { status: 201 })
  } catch (error: unknown) {
    console.error('Deactivation request error:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable, please try again later.')
    if (prismaResp) return prismaResp
    return NextResponse.json({ message: 'Failed to submit request' }, { status: 500 })
  }
}
