'use server'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await req.json()
    if (!orderId) {
      return NextResponse.json({ message: 'orderId is required' }, { status: 400 })
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId: session.user.id },
      include: {
        items: {
          include: {
            design: {
              select: { title: true }
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    // Build order link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const orderUrl = `${baseUrl}/profile/orders/${order.id}`

    // If email env is not configured, respond gracefully
    const host = process.env.EMAIL_SERVER_HOST
    const user = process.env.EMAIL_SERVER_USER
    const pass = process.env.EMAIL_SERVER_PASSWORD
    const from = process.env.EMAIL_FROM
    if (!host || !user || !pass || !from) {
      return NextResponse.json({
        message: 'Email not configured; skipped sending. You can copy the link instead.',
        orderUrl
      })
    }

    // Lazy import nodemailer to avoid bundling if unused
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.EMAIL_SERVER_PORT || 587),
      secure: false,
      auth: { user, pass },
    })

    const itemsSummary = order.items
      .map((i: { design: { title: string }; quantity: number }) => `• ${i.design.title} x${i.quantity}`)
      .join('\n')

    // Fetch recipient user
    const recipient = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true }
    })

    const logoUrl = `${baseUrl}/favicon.svg`
    const mailOptions = {
      from,
      to: recipient?.email || '',
      subject: `Your Order #${order.orderNumber}`,
      text: `Hi ${recipient?.name || ''},\n\nThank you for your purchase!\n\nOrder Number: ${order.orderNumber}\nTotal: $${order.totalAmount.toFixed(2)}\n\nItems:\n${itemsSummary}\n\nView your order anytime: ${orderUrl}\n\n— Fashion Marketplace`,
      html: `
        <div style="background:#f6f7fb;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #eaeaea">
            <div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px">
              <img src="${logoUrl}" alt="Logo" width="24" height="24" style="display:block" />
              <strong style="font-size:14px">Fashion Marketplace</strong>
            </div>
            <div style="padding:20px">
              <p style="margin:0 0 12px">Hi ${recipient?.name || ''},</p>
              <p style="margin:0 0 16px">Thank you for your purchase! Your order is confirmed.</p>
              <p style="margin:0 0 8px"><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p style="margin:0 0 16px"><strong>Total:</strong> $${order.totalAmount.toFixed(2)}</p>
              <div style="margin:0 0 16px">
                <div style="font-weight:bold;margin-bottom:6px">Items:</div>
                <div>${order.items.map((i: { design: { title: string }; quantity: number }) => `${i.design.title} ×${i.quantity}`).join('<br/>')}</div>
              </div>
              <p style="margin:0 0 16px">
                <a href="${orderUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 14px;border-radius:6px">View your order</a>
              </p>
              <p style="font-size:12px;color:#666;margin:0">If the button doesn't work, copy and paste this link into your browser:<br/>
                <span style="word-break:break-all">${orderUrl}</span>
              </p>
            </div>
            <div style="padding:12px 20px;border-top:1px solid #eee;font-size:12px;color:#666">© ${new Date().getFullYear()} Fashion Marketplace</div>
          </div>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({ message: 'Confirmation email sent.', orderUrl })
  } catch (err) {
    console.error('Email notify error', err)
    return NextResponse.json({ message: 'Failed to send email.' }, { status: 500 })
  }
}
