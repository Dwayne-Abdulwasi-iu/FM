import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        acceptsPOD: true,
        podDefaultMarkup: true,
        podAutoApprove: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      acceptsPOD: user.acceptsPOD ?? false,
      podDefaultMarkup: user.podDefaultMarkup ?? 20,
      podAutoApprove: user.podAutoApprove ?? true,
    })

  } catch (error) {
    console.error('Get POD settings error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { acceptsPOD, podDefaultMarkup, podAutoApprove } = body

    // Validate markup percentage
    if (podDefaultMarkup !== undefined && (podDefaultMarkup < 5 || podDefaultMarkup > 100)) {
      return NextResponse.json(
        { message: 'Markup must be between 5% and 100%' },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        acceptsPOD: acceptsPOD ?? false,
        podDefaultMarkup: podDefaultMarkup ?? 20,
        podAutoApprove: podAutoApprove ?? true,
      },
      select: {
        acceptsPOD: true,
        podDefaultMarkup: true,
        podAutoApprove: true,
      }
    })

    return NextResponse.json({
      acceptsPOD: updatedUser.acceptsPOD,
      podDefaultMarkup: updatedUser.podDefaultMarkup,
      podAutoApprove: updatedUser.podAutoApprove,
    })

  } catch (error) {
    console.error('Update POD settings error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
