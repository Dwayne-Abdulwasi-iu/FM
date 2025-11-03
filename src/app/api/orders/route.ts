import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    const orders = await prisma.order.findMany({
      where: { customerId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            design: {
              select: { id: true, title: true, imageUrl: true, designer: { select: { id: true, name: true } } }
            }
          }
        }
      }
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('List orders error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
