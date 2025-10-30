import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { status } = await request.json()
  const paramsObj = await params
    
    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      return NextResponse.json(
        { message: 'Invalid status' },
        { status: 400 }
      )
    }

    const updatedMessage = await prisma.contactMessage.update({
      where: { id: paramsObj.id },
      data: { 
        status,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      message: 'Status updated successfully',
      contactMessage: updatedMessage
    })

  } catch (error) {
    console.error('Update contact message error:', error)
    return NextResponse.json(
      { message: 'Failed to update message' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

  const paramsObj = await params

    const message = await prisma.contactMessage.findUnique({
      where: { id: paramsObj.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!message) {
      return NextResponse.json(
        { message: 'Message not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message })

  } catch (error) {
    console.error('Get contact message error:', error)
    return NextResponse.json(
      { message: 'Failed to fetch message' },
      { status: 500 }
    )
  }
}