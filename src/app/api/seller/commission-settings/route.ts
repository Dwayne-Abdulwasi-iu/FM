import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Fetch current user's commission settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        acceptsCommissions: true,
        commissionStatus: true,
        commissionMinBudget: true,
        commissionMaxBudget: true,
        commissionTurnaround: true,
        commissionTypes: true,
        commissionTerms: true,
        commissionQueueSize: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching commission settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update commission settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Any authenticated user can update their commission settings
    // This allows users who have uploaded designs to configure commissions

    const body = await request.json()
    const {
      acceptsCommissions,
      commissionStatus,
      commissionMinBudget,
      commissionMaxBudget,
      commissionTurnaround,
      commissionTypes,
      commissionTerms,
      commissionQueueSize,
    } = body

    // Validate budget range
    if (commissionMinBudget !== null && commissionMaxBudget !== null) {
      if (commissionMinBudget > commissionMaxBudget) {
        return NextResponse.json({ 
          error: 'Minimum budget cannot be greater than maximum budget' 
        }, { status: 400 })
      }
    }

    // Validate status
    const validStatuses = ['OPEN', 'BUSY', 'CLOSED']
    if (commissionStatus && !validStatuses.includes(commissionStatus)) {
      return NextResponse.json({ 
        error: 'Invalid commission status' 
      }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        acceptsCommissions: acceptsCommissions ?? false,
        commissionStatus: acceptsCommissions ? (commissionStatus || 'OPEN') : 'CLOSED',
        commissionMinBudget: commissionMinBudget ?? null,
        commissionMaxBudget: commissionMaxBudget ?? null,
        commissionTurnaround: commissionTurnaround ?? null,
        commissionTypes: commissionTypes ?? [],
        commissionTerms: commissionTerms ?? null,
        commissionQueueSize: commissionQueueSize ?? null,
      },
      select: {
        acceptsCommissions: true,
        commissionStatus: true,
        commissionMinBudget: true,
        commissionMaxBudget: true,
        commissionTurnaround: true,
        commissionTypes: true,
        commissionTerms: true,
        commissionQueueSize: true,
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating commission settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
