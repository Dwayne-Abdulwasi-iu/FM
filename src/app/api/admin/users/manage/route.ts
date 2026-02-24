import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId, action } = await request.json()

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing userId or action' },
        { status: 400 }
      )
    }

    // Prevent admin from modifying themselves (except for certain actions)
    if (userId === session.user.id && ['removeAdmin', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Cannot modify your own admin status or delete your own account' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'verify':
        const verifiedUser = await prisma.user.update({
          where: { id: userId },
          data: { isVerified: true }
        })
        return NextResponse.json({ 
          message: 'User verify successful',
          user: verifiedUser 
        })

      case 'unverify':
        const unverifiedUser = await prisma.user.update({
          where: { id: userId },
          data: { isVerified: false }
        })
        return NextResponse.json({ 
          message: 'User unverify successful',
          user: unverifiedUser 
        })

      case 'makeAdmin':
        const adminUser = await prisma.user.update({
          where: { id: userId },
          data: { role: 'ADMIN' }
        })
        return NextResponse.json({ 
          message: 'User makeAdmin successful',
          user: adminUser 
        })

      case 'removeAdmin':
        const regularUser = await prisma.user.update({
          where: { id: userId },
          data: { role: 'USER' }
        })
        return NextResponse.json({ 
          message: 'User removeAdmin successful',
          user: regularUser 
        })

      case 'delete':
        // Check if user exists
        const userToDelete = await prisma.user.findUnique({
          where: { id: userId },
          include: { 
            designs: true,
            orders: true 
          }
        })

        if (!userToDelete) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          )
        }

        // Use transaction to ensure all deletions happen together
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          // Delete order items for orders placed by this user
          const userOrders = await tx.order.findMany({
            where: { customerId: userId },
            select: { id: true }
          })
          
          await Promise.all(userOrders.map(order => tx.orderItem.deleteMany({ where: { orderId: order.id } })));

          // Delete user's designs and all related data
          await Promise.all(userToDelete.designs.map(design => Promise.all([
            tx.orderItem.deleteMany({ where: { designId: design.id } }),
            tx.cartItem.deleteMany({ where: { designId: design.id } }),
            tx.favorite.deleteMany({ where: { designId: design.id } }),
            tx.review.deleteMany({ where: { designId: design.id } }),
            tx.sellerEarning.deleteMany({ where: { designId: design.id } })
          ])));

          // Delete all user-related data
          await Promise.all([
            tx.cartItem.deleteMany({ where: { userId } }),
            tx.favorite.deleteMany({ where: { userId } }),
            tx.review.deleteMany({ where: { userId } }),
            tx.sellerEarning.deleteMany({ where: { sellerId: userId } }),
            tx.order.deleteMany({ where: { customerId: userId } }),
            tx.design.deleteMany({ where: { designerId: userId } }),
            tx.sellerAccount.deleteMany({ where: { userId } }),
            tx.account.deleteMany({ where: { userId } }),
            tx.session.deleteMany({ where: { userId } })
          ]);

          // Finally delete the user
          await tx.user.delete({ where: { id: userId } })
        }, { timeout: 20000 })

        return NextResponse.json({ 
          message: 'User account deleted successfully',
          success: true
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error managing user:', error)
    return NextResponse.json(
      { error: 'Failed to manage user' },
      { status: 500 }
    )
  }
}