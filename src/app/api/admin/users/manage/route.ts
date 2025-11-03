import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      console.log('Unauthorized access attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId, action } = await request.json()
    console.log('User management request:', { userId, action, adminUser: session.user.email })

    if (!userId || !action) {
      console.log('Missing userId or action')
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

        // Consolidate and batch deletes to minimize transaction time
        const designIds = userToDelete.designs.map((d) => d.id)

        const runDeletionTransaction = (timeoutMs: number) => prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          // Pre-collect order ids once
          const userOrders = await tx.order.findMany({
            where: { customerId: userId },
            select: { id: true }
          })
          const orderIds = userOrders.map((o) => o.id)

          // Delete order items by orderId (single statement) and by designId (if any)
          if (orderIds.length > 0) {
            await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })
          }
          if (designIds.length > 0) {
            await tx.orderItem.deleteMany({ where: { designId: { in: designIds } } })
            await tx.cartItem.deleteMany({ where: { designId: { in: designIds } } })
            await tx.favorite.deleteMany({ where: { designId: { in: designIds } } })
            await tx.review.deleteMany({ where: { designId: { in: designIds } } })
            await tx.sellerEarning.deleteMany({ where: { designId: { in: designIds } } })
          }

          // Delete all user-related data
          await tx.cartItem.deleteMany({ where: { userId } })
          await tx.favorite.deleteMany({ where: { userId } })
          await tx.review.deleteMany({ where: { userId } })
          await tx.sellerEarning.deleteMany({ where: { sellerId: userId } })
          await tx.order.deleteMany({ where: { customerId: userId } })
          await tx.design.deleteMany({ where: { designerId: userId } })
          await tx.sellerAccount.deleteMany({ where: { userId } })
          await tx.account.deleteMany({ where: { userId } })
          await tx.session.deleteMany({ where: { userId } })

          // Finally delete the user
          await tx.user.delete({ where: { id: userId } })
        }, { timeout: timeoutMs, maxWait: 10000 })

        try {
          await runDeletionTransaction(20000)
        } catch (err: unknown) {
          // Retry once with a higher timeout if the interactive transaction expired (P2028)
          if ((err as { code?: string })?.code === 'P2028') {
            console.warn('Admin delete: transaction timed out, retrying with higher timeout...')
            await runDeletionTransaction(45000)
          } else {
            throw err
          }
        }

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