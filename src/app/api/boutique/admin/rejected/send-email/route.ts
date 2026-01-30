import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

// Send return notification email to seller
async function sendReturnEmail(
  sellerEmail: string,
  sellerName: string,
  productTitle: string,
  returnDate: string,
  rejectionReason: string
) {
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Product Rejected - Return Scheduled</h2>
      </div>
      
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Hello <strong>${sellerName}</strong>,</p>
        
        <p>Your boutique product <strong>${productTitle}</strong> has been reviewed and rejected during the quality check process.</p>
        
        <div style="background: #FEF2F2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <strong>Rejection Reason:</strong>
          <p style="margin: 8px 0 0;">${rejectionReason || 'Quality check failed'}</p>
        </div>
        
        <h3>Return Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Product:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${productTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Scheduled Pickup Date:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${returnDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Status:</strong></td>
            <td style="padding: 8px 0;"><span style="background: #dc2626; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">RETURN_SCHEDULED</span></td>
          </tr>
        </table>
        
        <h3>Next Steps</h3>
        <ul style="color: #666; line-height: 1.8;">
          <li>Prepare the product for return shipment</li>
          <li>On the scheduled pickup date, our courier will collect the item from your warehouse</li>
          <li>You will receive a tracking number for the return shipment</li>
          <li>Once received and verified, the product will be marked as returned</li>
        </ul>
        
        <p style="color: #666; margin-top: 30px;">
          If you have any questions about this rejection or need to reschedule the pickup, please contact our support team.
        </p>
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="https://fashionmarketplace.com/seller/support" style="display: inline-block; padding: 12px 24px; background-color: #667eea; color: white; text-decoration: none; border-radius: 4px;">
            Contact Support
          </a>
        </p>
        
        <p style="color: #999; font-size: 12px; margin-top: 20px; text-align: center;">
          Fashion Marketplace Admin Team
        </p>
      </div>
    </div>
  `

  return sendEmail({
    to: sellerEmail,
    subject: `Product Rejected - Return Scheduled: ${productTitle}`,
    html: emailContent,
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { productId, sellerId, sellerEmail, sellerName, returnDate, rejectionReason } = body

    if (!productId || !sellerEmail || !returnDate) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Send the email
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: productId },
      select: { title: true, rejectionEmailSentCount: true },
    })

    const productTitle = product?.title || 'Your Product'

    const emailSent = await sendReturnEmail(
      sellerEmail,
      sellerName,
      productTitle,
      returnDate,
      rejectionReason || 'Quality check failed'
    )

    if (!emailSent) {
      console.warn('Email notification could not be sent (email service not configured), but return scheduled')
    }

    // Update product with email sent count
    await prisma.boutiqueProduct.update({
      where: { id: productId },
      data: {
        rejectionEmailSentCount: (product?.rejectionEmailSentCount || 0) + 1,
        rejectionEmailLastSentAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Rejection email sent to seller',
      emailSent,
    })
  } catch (error) {
    console.error('Error scheduling return:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to schedule return' },
      { status: 500 }
    )
  }
}
