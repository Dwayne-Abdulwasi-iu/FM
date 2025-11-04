import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { designId, action, adminUser } = await request.json()

    if (!designId || !action || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json(
        { message: 'Invalid request data' },
        { status: 400 }
      )
    }

    console.log('Design approval request:', {
      designId,
      action,
      adminUser
    })

    // Update design approval status
    const updateData: { approvalStatus: string; isActive?: boolean; rejectionReason?: string } = {
      approvalStatus: action === 'approve' ? 'APPROVED' : 'REJECTED',
    }

    if (action === 'approve') {
      updateData.isActive = true
    } else {
      updateData.isActive = false
      updateData.rejectionReason = 'Rejected by admin'
    }

    const design = await prisma.design.update({
      where: { id: designId },
      data: updateData,
      include: {
        designer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    // Revalidate public pages so approval status reflects immediately
    revalidatePath('/')
    revalidatePath('/designs')

    return NextResponse.json({
      message: `Design ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      design
    })

  } catch (error) {
    console.error('Design approval error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}