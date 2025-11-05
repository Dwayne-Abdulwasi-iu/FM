import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { designId, action } = await request.json()

    if (!designId || !action) {
      return NextResponse.json(
        { error: 'Missing designId or action' },
        { status: 400 }
      )
    }

    let result;

    switch (action) {
      case 'activate':
        result = await prisma.design.update({
          where: { id: designId },
          data: { isActive: true },
          include: { designer: { select: { id: true, name: true, email: true } } }
        })
        // Revalidate public listings so changes reflect immediately
        revalidatePath('/')
        revalidatePath('/designs')
        // Create notification for designer
        try {
          const userId = result?.designer?.id
          if (userId) {
            const created = await prisma.notification.create({
              data: {
                userId,
                title: 'Design activated',
                message: `Your design "${result?.title}" has been activated and is visible on the marketplace.`,
                url: `/designs/${result?.id}`,
              }
            })
            try { const pub = await import('@/lib/notificationsPubSub'); pub.publish(userId, created) } catch {}
          }
        } catch (e) {
          console.error('Failed to create activation notification', e)
        }
        break

      case 'deactivate':
        result = await prisma.design.update({
          where: { id: designId },
          data: { isActive: false },
          include: { designer: { select: { id: true, name: true, email: true } } }
        })
        // Revalidate public listings so changes reflect immediately
        revalidatePath('/')
        revalidatePath('/designs')
        // Create notification for designer
        try {
          const userId = result?.designer?.id
          if (userId) {
            const created = await prisma.notification.create({
              data: {
                userId,
                title: 'Design deactivated',
                message: `Your design "${result?.title}" has been deactivated by an admin and is no longer visible on the marketplace.`,
                url: `/profile/designs`,
              }
            })
            try { const pub = await import('@/lib/notificationsPubSub'); pub.publish(userId, created) } catch {}
          }
        } catch (e) {
          console.error('Failed to create deactivation notification', e)
        }
        break

      case 'delete':
        // Get design details and guard conditions first
        const design = await prisma.design.findUnique({ where: { id: designId } })
        if (!design) {
          return NextResponse.json(
            { error: 'Design not found' },
            { status: 404 }
          )
        }

        // Block deletion for owned designs
        if (design.isOwned || !!design.ownedBy) {
          return NextResponse.json(
            { error: 'Cannot delete an owned design. Please deactivate instead.' },
            { status: 400 }
          )
        }

        // Prevent deleting designs that have any orders for data integrity
        const orderCount = await prisma.order.count({
          where: {
            items: {
              some: { designId }
            }
          }
        })

        if (orderCount > 0) {
          return NextResponse.json(
            { error: 'Cannot delete design with existing orders. Please deactivate instead.' },
            { status: 400 }
          )
        }

        if (design) {
          // Delete associated records first
          await prisma.cartItem.deleteMany({ where: { designId } })
          await prisma.favorite.deleteMany({ where: { designId } })
          await prisma.review.deleteMany({ where: { designId } })
          
          // Delete the design
          result = await prisma.design.delete({
            where: { id: designId }
          })

          // Clean up image file if it's a local file
          if (design.imageUrl.startsWith('/uploads/')) {
            try {
              const filePath = path.join(process.cwd(), 'public', design.imageUrl)
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
              }
            } catch (fileError) {
              console.warn('Could not delete image file:', fileError)
            }
          }
        }
        // Revalidate public listings after deletion as a safety
        revalidatePath('/')
        revalidatePath('/designs')
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({ 
      message: `Design ${action} successful`,
      design: result 
    })
  } catch (error) {
    console.error('Error managing design:', error)
    return NextResponse.json(
      { error: 'Failed to manage design' },
      { status: 500 }
    )
  }
}