import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
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
          data: { isActive: true }
        })
        break

      case 'deactivate':
        result = await prisma.design.update({
          where: { id: designId },
          data: { isActive: false }
        })
        break

      case 'delete':
        // Get design details before deletion to clean up files
        const design = await prisma.design.findUnique({
          where: { id: designId }
        })

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