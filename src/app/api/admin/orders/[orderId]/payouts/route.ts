import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 401 }
      )
    }

  const { orderId } = await context.params
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { design: true }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    // Load earnings to expose payout audit
    const earnings = await prisma.sellerEarning.findMany({
      where: { orderId: order.id },
      select: {
        id: true,
        designId: true,
        sellerId: true,
        payoutStatus: true,
        payoutProvider: true,
        payoutTransferId: true,
        payoutAttemptedAt: true,
        payoutCompletedAt: true,
        payoutError: true,
        payoutCurrency: true,
        payoutAmountMinor: true,
        sellerAmount: true,
        platformCommission: true,
        quantity: true,
        createdAt: true
      }
    })

    const items = order.items.map((item) => {
      const saleUSD = item.price * item.quantity
      const commissionUSD = saleUSD * 0.05
      const sellerUSD = saleUSD - commissionUSD
      const earning = earnings.find(e => e.designId === item.designId)
      return {
        designId: item.designId,
        designTitle: item.design?.title || 'Unknown',
        designerId: item.design?.designerId || null,
        quantity: item.quantity,
        priceUSD: item.price,
        saleUSD,
        commissionUSD,
        sellerUSD,
        purchaseType: item.purchaseType || 'REGULAR',
        earning: earning ? {
          id: earning.id,
          payoutStatus: earning.payoutStatus,
          payoutProvider: earning.payoutProvider,
          payoutTransferId: earning.payoutTransferId,
          payoutAttemptedAt: earning.payoutAttemptedAt,
          payoutCompletedAt: earning.payoutCompletedAt,
          payoutError: earning.payoutError,
          payoutCurrency: earning.payoutCurrency,
          payoutAmountMinor: earning.payoutAmountMinor,
          createdAt: earning.createdAt,
          sellerAmountUSD: earning.sellerAmount,
          platformCommissionUSD: earning.platformCommission,
          quantity: earning.quantity
        } : null
      }
    })

    const totals = items.reduce(
      (acc, it) => {
        acc.saleTotalUSD += it.saleUSD
        acc.platformFeeUSD += it.commissionUSD
        acc.sellerTotalUSD += it.sellerUSD
        return acc
      },
      { saleTotalUSD: 0, platformFeeUSD: 0, sellerTotalUSD: 0 }
    )

    // If this was a Paystack order, try to verify and read back metadata (including splitPaymentEnabled)
    let paystackInfo: {
      reference?: string
      splitPaymentEnabled?: boolean | null
      metadata?: Record<string, unknown>
      verifyStatus?: number
      note?: string
    } | null = null

    const looksLikePaystack = order.stripePaymentIntentId && !/^pi_|^cs_/.test(order.stripePaymentIntentId)
    if (looksLikePaystack && process.env.PAYSTACK_SECRET_KEY) {
      const reference = order.stripePaymentIntentId!
      try {
        const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}` , {
          headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
        })
        paystackInfo = { reference, verifyStatus: res.status }
        if (res.ok) {
          const json = await res.json()
          const meta = json?.data?.metadata || null
          const split = meta ? Boolean(meta.splitPaymentEnabled) : null
          paystackInfo.metadata = meta || undefined
          paystackInfo.splitPaymentEnabled = split
          if (split === true) {
            paystackInfo.note = 'Split payments were enabled at checkout; payouts handled by Paystack.'
          }
        }
      } catch (e) {
        paystackInfo = { reference, note: `Verify failed: ${e instanceof Error ? e.message : String(e)}` }
      }
    }

    // Simple status summary
    const statusCounts = earnings.reduce(
      (acc, e) => {
        const k = e.payoutStatus as string
        acc[k] = (acc[k] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        totalAmountUSD: order.totalAmount,
        platformFeeUSD: order.platformFee,
        createdAt: order.createdAt
      },
      items,
      totals,
      statusCounts,
      paystack: paystackInfo,
      recommendations: [
        'If splitPaymentEnabled is true, do not run manual transfers.',
        'Consider storing payout transaction IDs for better auditability.',
        'Use seller subaccounts to prefer automatic split over manual payouts.'
      ]
    })
  } catch (error) {
    console.error('Admin payouts breakdown error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
