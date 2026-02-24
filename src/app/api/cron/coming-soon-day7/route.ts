import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendDripEmail7Days } from '@/lib/sendgrid'

export async function POST(req: Request) {
  try {
    // Verify CRON_SECRET
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token || token !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all subscribers who haven't been notified yet
    const subscribers = await prisma.comingSoonEmail.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
      },
    })

    if (subscribers.length === 0) {
      return NextResponse.json({
        message: 'No active subscribers found',
        sent: 0,
      })
    }

    // Send Day 7 teaser emails
    const results = await Promise.allSettled(
      subscribers.map((subscriber: any) =>
        sendDripEmail7Days(
          subscriber.email,
          subscriber.firstName || 'there',
          7 // days until launch
        )
      )
    )

    const successCount = results.filter((r: any) => r.status === 'fulfilled').length
    const failureCount = results.filter((r: any) => r.status === 'rejected').length

    console.log(`[Day 7 Campaign] Sent: ${successCount}, Failed: ${failureCount}`)

    return NextResponse.json({
      message: 'Day 7 campaign executed',
      sent: successCount,
      failed: failureCount,
      total: subscribers.length,
    })
  } catch (error) {
    console.error('[Day 7 Campaign Error]:', error)
    return NextResponse.json(
      { error: 'Campaign execution failed' },
      { status: 500 }
    )
  }
}
