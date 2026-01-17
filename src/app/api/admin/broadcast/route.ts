import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { sendEmail } from '@/lib/email'
import { queueFailedNotification } from '@/lib/notification-queue'
import { isMainAdmin } from '@/lib/admin'
import { checkRateLimit, adminBroadcastRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'

// GET - List all broadcasts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pageParam = parseInt(searchParams.get('page') || '1')
    const limitParam = parseInt(searchParams.get('limit') || '20')
    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
    const limit = Number.isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100)
    const skip = (page - 1) * limit

    const [broadcasts, total] = await Promise.all([
      prisma.adminBroadcast.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          _count: {
            select: {
              recipients: true,
            }
          }
        }
      }),
      prisma.adminBroadcast.count(),
    ])

    return NextResponse.json({
      broadcasts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    })
  } catch (error) {
    console.error('Error fetching broadcasts:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create and send a broadcast
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      subject, 
      content, 
      targetType, 
      targetTier, 
      sendViaEmail = true, 
      sendViaInApp = true,
      isDraft = false 
    } = body

    if (!subject || !content) {
      return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 })
    }

    // Validate content lengths
    const MAX_SUBJECT_LENGTH = 200
    const MAX_CONTENT_LENGTH = 50000 // 50KB for broadcasts (can include HTML)

    if (subject.length > MAX_SUBJECT_LENGTH) {
      return NextResponse.json({ error: `Subject too long. Maximum ${MAX_SUBJECT_LENGTH} characters allowed.` }, { status: 400 })
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: `Content too long. Maximum ${MAX_CONTENT_LENGTH} characters allowed.` }, { status: 400 })
    }

    if (!targetType) {
      return NextResponse.json({ error: 'Target type is required' }, { status: 400 })
    }

    if (!sendViaEmail && !sendViaInApp) {
      return NextResponse.json({ error: 'At least one delivery method (email or in-app) must be enabled' }, { status: 400 })
    }

    // Rate limit: 5 broadcasts per day (skip for drafts)
    if (!isDraft) {
      const rateLimit = await checkRateLimit(
        adminBroadcastRateLimitKey(session.user.id),
        RATE_LIMITS.ADMIN_BROADCAST.limit,
        RATE_LIMITS.ADMIN_BROADCAST.windowMs
      )
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Maximum 5 broadcasts per day.' },
          { status: 429 }
        )
      }
    }

    // Build where clause for target users
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    switch (targetType) {
      case 'ALL':
        // No filter - all users
        break
      case 'USERS':
        // Users who have never uploaded a design or boutique product
        where.AND = [
          { designs: { none: {} } },
          { boutiqueProducts: { none: {} } },
        ]
        break
      case 'SELLERS':
        // Users who have uploaded designs or boutique products
        where.OR = [
          { designs: { some: {} } },
          { boutiqueProducts: { some: {} } },
        ]
        break
      case 'DESIGNERS':
        // Users who have uploaded designs
        where.designs = { some: {} }
        break
      case 'TIER_SPECIFIC':
        if (!targetTier) {
          return NextResponse.json({ error: 'Target tier is required for TIER_SPECIFIC broadcasts' }, { status: 400 })
        }
        where.designerTier = targetTier
        break
      case 'VERIFIED_ONLY':
        where.isVerified = true
        break
      default:
        return NextResponse.json({ error: 'Invalid target type' }, { status: 400 })
    }

    // Get target users
    const targetUsers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        emailNotifications: true,
      }
    })

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: 'No users match the selected criteria' }, { status: 400 })
    }

    // Create the broadcast
    const broadcast = await prisma.adminBroadcast.create({
      data: {
        adminId: session.user.id,
        subject,
        content,
        targetType,
        targetTier: targetTier || null,
        sendViaEmail,
        sendViaInApp,
        recipientCount: targetUsers.length,
        status: isDraft ? 'DRAFT' : 'SENT',
        sentAt: isDraft ? null : new Date(),
      }
    })

    if (!isDraft) {
      // Batch create recipient records for all target users
      const recipientData = targetUsers.map(user => ({
        broadcastId: broadcast.id,
        userId: user.id,
        sentViaEmail: sendViaEmail && user.emailNotifications,
        sentViaInApp: sendViaInApp,
        emailSentAt: sendViaEmail && user.emailNotifications ? new Date() : null,
        inAppSentAt: sendViaInApp ? new Date() : null,
      }))

      // Batch insert recipients (MongoDB doesn't support skipDuplicates, but unique constraint handles it)
      await prisma.adminBroadcastRecipient.createMany({
        data: recipientData,
      })

      // Batch create in-app notifications
      let deliveredCount = 0
      if (sendViaInApp) {
        const notificationData = targetUsers.map(user => ({
          userId: user.id,
          type: 'ADMIN_BROADCAST',
          title: subject,
          message: content.length > 100 ? content.substring(0, 100) + '...' : content,
          data: { broadcastId: broadcast.id },
        }))

        await prisma.notification.createMany({
          data: notificationData,
        })
        deliveredCount = targetUsers.length
      }

      // Send emails in background - don't block response
      // Fire-and-forget pattern with error queuing for retries
      if (sendViaEmail) {
        const emailRecipients = targetUsers.filter(u => u.emailNotifications && u.email)
        
        // Process emails in the background after response
        setImmediate(async () => {
          for (const user of emailRecipients) {
            try {
              await sendEmail({
                to: user.email,
                subject: subject,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4F46E5;">${subject}</h2>
                    <div style="color: #374151; line-height: 1.6;">
                      ${content.replace(/\n/g, '<br>')}
                    </div>
                    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
                    <p style="color: #6B7280; font-size: 12px;">
                      You received this email because you have notifications enabled. 
                      <a href="${process.env.NEXTAUTH_URL}/settings">Manage preferences</a>
                    </p>
                  </div>
                `,
              })
            } catch (err) {
              console.error(`Failed to send email to ${user.email}:`, err)
              // Queue for retry
              await queueFailedNotification('email', {
                to: user.email,
                subject,
                broadcastId: broadcast.id,
                userId: user.id,
              }, err instanceof Error ? err.message : 'Unknown error')
            }
          }
        })
      }

      // Update broadcast with delivery count
      await prisma.adminBroadcast.update({
        where: { id: broadcast.id },
        data: { deliveredCount }
      })
    }

    return NextResponse.json({
      success: true,
      broadcast: {
        ...broadcast,
        recipientCount: targetUsers.length,
      },
      message: isDraft 
        ? 'Broadcast saved as draft' 
        : `Broadcast sent to ${targetUsers.length} users`
    })
  } catch (error) {
    console.error('Error creating broadcast:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update a broadcast (only drafts or sent broadcasts can have content edited)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { broadcastId, subject, content } = body

    if (!broadcastId) {
      return NextResponse.json({ error: 'Broadcast ID is required' }, { status: 400 })
    }

    // Find the broadcast
    const broadcast = await prisma.adminBroadcast.findUnique({
      where: { id: broadcastId }
    })

    if (!broadcast) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })
    }

    // Build update data
    const updateData: { subject?: string; content?: string; updatedAt: Date } = {
      updatedAt: new Date()
    }

    if (subject) updateData.subject = subject
    if (content) updateData.content = content

    // Update the broadcast
    const updatedBroadcast = await prisma.adminBroadcast.update({
      where: { id: broadcastId },
      data: updateData,
    })

    // If broadcast was already sent, also update the notifications
    if (broadcast.status === 'SENT' && (subject || content)) {
      // Get recipient user IDs
      const recipients = await prisma.adminBroadcastRecipient.findMany({
        where: { broadcastId },
        select: { userId: true }
      })
      const userIds = recipients.map(r => r.userId)

      if (userIds.length > 0) {
        // Find notifications that have this broadcastId in their data field
        const relatedNotifications = await prisma.notification.findMany({
          where: {
            type: 'ADMIN_BROADCAST',
            userId: { in: userIds },
          },
          select: { id: true, data: true }
        })

        // Filter to find notifications with matching broadcastId
        const notificationIds = relatedNotifications
          .filter(n => {
            if (n.data && typeof n.data === 'object' && 'broadcastId' in n.data) {
              return (n.data as { broadcastId?: string }).broadcastId === broadcastId
            }
            return false
          })
          .map(n => n.id)

        if (notificationIds.length > 0) {
          await prisma.notification.updateMany({
            where: {
              id: { in: notificationIds }
            },
            data: {
              title: subject || broadcast.subject,
              message: (content || broadcast.content).length > 100 
                ? (content || broadcast.content).substring(0, 100) + '...' 
                : (content || broadcast.content),
            }
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      broadcast: updatedBroadcast,
      message: 'Broadcast updated successfully'
    })
  } catch (error) {
    console.error('Error updating broadcast:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a broadcast and all associated data
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const broadcastId = searchParams.get('id')

    if (!broadcastId) {
      return NextResponse.json({ error: 'Broadcast ID is required' }, { status: 400 })
    }

    // Find the broadcast
    const broadcast = await prisma.adminBroadcast.findUnique({
      where: { id: broadcastId }
    })

    if (!broadcast) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })
    }

    // Delete in order: notifications, recipients, then broadcast
    // Get recipient user IDs first
    const recipients = await prisma.adminBroadcastRecipient.findMany({
      where: { broadcastId },
      select: { userId: true }
    })
    const userIds = recipients.map(r => r.userId)

    // Delete associated notifications using broadcastId in data field
    if (userIds.length > 0) {
      const relatedNotifications = await prisma.notification.findMany({
        where: {
          type: 'ADMIN_BROADCAST',
          userId: { in: userIds },
        },
        select: { id: true, data: true }
      })

      // Filter to find notifications with matching broadcastId
      const notificationIds = relatedNotifications
        .filter(n => {
          if (n.data && typeof n.data === 'object' && 'broadcastId' in n.data) {
            return (n.data as { broadcastId?: string }).broadcastId === broadcastId
          }
          return false
        })
        .map(n => n.id)

      if (notificationIds.length > 0) {
        await prisma.notification.deleteMany({
          where: {
            id: { in: notificationIds }
          }
        })
      }
    }

    // Recipients are deleted automatically due to onDelete: Cascade in schema
    // But we'll explicitly delete them for clarity
    await prisma.adminBroadcastRecipient.deleteMany({
      where: { broadcastId }
    })

    // Delete the broadcast
    await prisma.adminBroadcast.delete({
      where: { id: broadcastId }
    })

    return NextResponse.json({
      success: true,
      message: 'Broadcast deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting broadcast:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
