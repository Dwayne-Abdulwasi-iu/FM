import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * POST /api/designs/[id]/publish
 * Publish a draft design (submits for approval)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'You must be signed in to publish a design' },
        { status: 401 }
      )
    }

    const params = await context.params
    const designId = params.id
    const userId = session.user.id

    // Find the design
    const design = await prisma.design.findUnique({
      where: { id: designId },
      select: {
        id: true,
        designerId: true,
        isDraft: true,
        title: true,
        price: true,
        category: true,
        imageUrl: true
      }
    })

    if (!design) {
      return NextResponse.json(
        { message: 'Design not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (design.designerId !== userId) {
      return NextResponse.json(
        { message: 'You can only publish your own designs' },
        { status: 403 }
      )
    }

    // Check if it's actually a draft
    if (!design.isDraft) {
      return NextResponse.json(
        { message: 'This design is already published' },
        { status: 400 }
      )
    }

    // Validate required fields for publishing
    if (!design.title || !design.price || !design.category || !design.imageUrl) {
      return NextResponse.json(
        { message: 'Please complete all required fields before publishing (title, price, category, image)' },
        { status: 400 }
      )
    }

    // Publish the design (submit for approval)
    const updatedDesign = await prisma.design.update({
      where: { id: designId },
      data: {
        isDraft: false,
        publishedAt: new Date(),
        approvalStatus: 'PENDING',
        isActive: false // Will be activated once approved
      }
    })

    return NextResponse.json({
      message: 'Design submitted for approval. It will be visible once approved by our team.',
      design: updatedDesign
    })

  } catch (error) {
    console.error('Publish design error:', error)
    return NextResponse.json(
      { message: 'Failed to publish design' },
      { status: 500 }
    )
  }
}
