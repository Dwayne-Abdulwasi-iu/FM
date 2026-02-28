import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface ReturnAddress {
  name: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  postalCode: string
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        boutique_returnAddress: true,
      },
    })

    return NextResponse.json({
      success: true,
      returnAddress: user?.boutique_returnAddress || null,
    })
  } catch (error) {
    console.error('Error fetching boutique settings:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { returnAddress } = body as { returnAddress: ReturnAddress }

    if (!returnAddress || !returnAddress.name || !returnAddress.address) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        boutique_returnAddress: returnAddress as any,
      },
      select: {
        id: true,
        boutique_returnAddress: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Return address saved successfully',
      returnAddress: updated.boutique_returnAddress,
    })
  } catch (error) {
    console.error('Error saving boutique settings:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
