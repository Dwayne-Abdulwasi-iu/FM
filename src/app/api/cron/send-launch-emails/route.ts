import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendLaunchNotification } from '@/lib/sendgrid';

// Launch date - Update this when you're ready to launch
const LAUNCH_DATE = new Date('2026-03-15');

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const launchDateOnly = new Date(LAUNCH_DATE);
    launchDateOnly.setHours(0, 0, 0, 0);

    // Check if today is launch day
    if (today.getTime() !== launchDateOnly.getTime()) {
      return NextResponse.json({
        message: 'Not launch day yet',
        launchDate: LAUNCH_DATE,
        daysUntilLaunch: Math.ceil((launchDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      });
    }

    // Get all active subscribers
    const subscribers = await prisma.comingSoonEmail.findMany({
      where: { status: 'ACTIVE' },
      select: { email: true, firstName: true, id: true },
    });

    if (subscribers.length === 0) {
      return NextResponse.json({
        message: 'No active subscribers to notify',
        emailsSent: 0,
      });
    }

    let successCount = 0;
    let failedCount = 0;
    const failedEmails: string[] = [];

    // Send launch email to each subscriber
    for (const subscriber of subscribers) {
      try {
        const sent = await sendLaunchNotification(
          subscriber.email,
          subscriber.firstName || undefined
        );

        if (sent) {
          successCount++;
          
          // Mark as notified
          await prisma.comingSoonEmail.update({
            where: { id: subscriber.id },
            data: { status: 'NOTIFIED' },
          });
        } else {
          failedCount++;
          failedEmails.push(subscriber.email);
        }
      } catch (error) {
        console.error(`Failed to send email to ${subscriber.email}:`, error);
        failedCount++;
        failedEmails.push(subscriber.email);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Launch emails sent',
      totalSubscribers: subscribers.length,
      emailsSent: successCount,
      emailsFailed: failedCount,
      failedEmails: failedEmails.length > 0 ? failedEmails : undefined,
    });
  } catch (error) {
    console.error('Launch email cron error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send launch emails',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
