import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendLaunchNotification } from '@/lib/sendgrid';

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can trigger launch emails' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { testMode = false } = body;

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
          
          // Mark as notified (unless in test mode)
          if (!testMode) {
            await prisma.comingSoonEmail.update({
              where: { id: subscriber.id },
              data: { status: 'NOTIFIED' },
            });
          }
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
      message: testMode ? 'Test mode: emails sent (subscribers NOT marked as notified)' : 'Launch emails sent',
      totalSubscribers: subscribers.length,
      emailsSent: successCount,
      emailsFailed: failedCount,
      failedEmails: failedEmails.length > 0 ? failedEmails : undefined,
      testMode,
    });
  } catch (error) {
    console.error('Admin launch email error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send launch emails',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
