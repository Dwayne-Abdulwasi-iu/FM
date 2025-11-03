import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    const { orderId } = await context.params
    if (!orderId) {
      return NextResponse.json({ message: 'Missing orderId' }, { status: 400 })
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId: session.user.id },
      include: {
        items: {
          include: {
            design: {
              include: {
                designer: { select: { id: true, name: true } }
              }
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Get order details error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
