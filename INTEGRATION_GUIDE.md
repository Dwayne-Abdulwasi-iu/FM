# Integration Guide: Commission & Payment Systems

## 📍 Quick Links
- **Commission Calculator:** [src/lib/commission-calculator.ts](src/lib/commission-calculator.ts)
- **Seller Pages:** [src/app/seller/payouts/page.tsx](src/app/seller/payouts/page.tsx) • [src/app/seller/payments/audit-trail/page.tsx](src/app/seller/payments/audit-trail/page.tsx)
- **Admin Dashboard:** [src/app/admin/payments/reconciliation/page.tsx](src/app/admin/payments/reconciliation/page.tsx)
- **Related Docs:** [COMMISSION_PAYMENT_DOCS.md](COMMISSION_PAYMENT_DOCS.md) • [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) • [DEV_QUICK_START.md](DEV_QUICK_START.md)

## Quick Start

This guide shows how to integrate the newly implemented commission and payment systems with your existing codebase.

## 1. Update Seller Dashboard Navigation

Add links to the new commission pages in the seller dashboard.

**File**: [src/app/seller/page.tsx](src/app/seller/page.tsx) (or your seller dashboard main page)

```typescript
import Link from 'next/link'
import { DollarSign, TrendingUp } from 'lucide-react'

export default function SellerDashboard() {
  return (
    <>
      {/* Existing content */}
      
      {/* Add new sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        {/* Commission & Payouts Card */}
        <Link href="/seller/payouts">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-green-900">Commission & Payouts</h3>
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-green-800">
              View commission rates, earnings, and payment schedule
            </p>
          </div>
        </Link>

        {/* Payment Audit Trail Card */}
        <Link href="/seller/payments/audit-trail">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-blue-900">Payment Audit Trail</h3>
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-blue-800">
              View complete transaction history and payment details
            </p>
          </div>
        </Link>
      </div>
    </>
  )
}
```

## 2. Add Admin Navigation Link

**File**: [src/components/layout/admin-nav.tsx](src/components/layout/admin-nav.tsx) (or your admin navigation)

```typescript
import Link from 'next/link'
import { DollarSign } from 'lucide-react'

export function AdminNav() {
  return (
    <nav>
      {/* Existing navigation items */}
      
      <Link 
        href="/admin/payments/reconciliation"
        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded"
      >
        <DollarSign className="w-5 h-5" />
        <span>Payment Reconciliation</span>
      </Link>
    </nav>
  )
}
```

## 3. Update Order Creation to Calculate Commission

When creating orders, automatically calculate and record commissions.

**File**: `src/app/api/orders/route.ts` (or your order creation endpoint)

```typescript
import { calculateOrderTotal, getCommissionRate } from '@/lib/commission-calculator'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  // ... existing order creation code ...

  // Get seller's current monthly GMV
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const sellerOrders = await prisma.order.findMany({
    where: {
      sellerId: order.sellerId,
      createdAt: { gte: thirtyDaysAgo }
    },
    select: { total: true }
  })
  
  const monthlyGMV = sellerOrders.reduce((sum, o) => sum + o.total, 0)

  // Calculate commission using the calculator
  const breakdown = calculateOrderTotal(
    order.subtotal,
    order.shippingCost || 0,
    order.tax || 0,
    order.discount || 0,
    monthlyGMV
  )

  // Create order with commission details
  const createdOrder = await prisma.order.create({
    data: {
      ...order,
      commission: breakdown.breakdown.commissionAmount,
      sellerPayout: breakdown.sellerPayout,
      // ... other fields ...
    }
  })

  // Create earning record
  await prisma.sellerEarning.create({
    data: {
      userId: order.sellerId,
      orderId: createdOrder.id,
      amount: breakdown.sellerPayout,
      commission: breakdown.breakdown.commissionAmount,
      isPaid: false
    }
  })

  return Response.json(createdOrder)
}
```

## 4. Update Seller Account Settings

Add commission tier display to seller account settings.

**File**: [src/app/seller/settings/page.tsx](src/app/seller/settings/page.tsx)

```typescript
import { getCommissionRate, getGMVToNextTier } from '@/lib/commission-calculator'

export default async function SellerSettings() {
  // ... existing code ...

  // Calculate current tier
  const monthlyGMV = /* fetch from database */
  const currentRate = getCommissionRate(monthlyGMV)
  const nextTier = getGMVToNextTier(monthlyGMV)

  return (
    <div>
      {/* Existing settings */}

      {/* Add commission info section */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-bold text-blue-900 mb-4">Your Commission Tier</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-blue-800">Current Tier</p>
            <p className="text-xl font-bold text-blue-900">{currentRate.description}</p>
            <p className="text-lg text-blue-700 mt-1">Commission: {currentRate.percentage}%</p>
          </div>

          {nextTier.nextTier && (
            <div>
              <p className="text-sm text-blue-800">Next Tier</p>
              <p className="text-xl font-bold text-blue-900">{nextTier.nextTier}</p>
              <p className="text-sm text-blue-600 mt-1">
                Need ₦{nextTier.remaining?.toLocaleString()} more GMV
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

## 5. Create Monthly Payout Job

Set up a cron job to automatically create monthly payouts.

**File**: `src/app/api/cron/monthly-payouts.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Monthly payout job
 * Runs on 1st of month to process earnings
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const monthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)
    const monthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)

    // Find all completed earnings from last month
    const pendingEarnings = await prisma.sellerEarning.findMany({
      where: {
        isPaid: false,
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      include: {
        user: { select: { email: true, bankAccount: true } }
      }
    })

    // Group by seller
    const sellerEarnings: Record<string, { total: number; entries: string[] }> = {}
    
    pendingEarnings.forEach(earning => {
      if (!sellerEarnings[earning.userId]) {
        sellerEarnings[earning.userId] = { total: 0, entries: [] }
      }
      sellerEarnings[earning.userId].total += earning.amount
      sellerEarnings[earning.userId].entries.push(earning.id)
    })

    // Create payouts
    const results = []
    for (const [sellerId, data] of Object.entries(sellerEarnings)) {
      try {
        // Mark all earnings as paid
        await prisma.sellerEarning.updateMany({
          where: { id: { in: data.entries } },
          data: { 
            isPaid: true,
            paidAt: new Date()
          }
        })

        // Create payout record
        const payout = await prisma.sellerPayout.create({
          data: {
            sellerId,
            amount: data.total,
            month: monthStart,
            status: 'INITIATED'
          }
        })

        results.push({
          sellerId,
          amount: data.total,
          status: 'success',
          payoutId: payout.id
        })
      } catch (error) {
        results.push({
          sellerId,
          amount: data.total,
          status: 'failed',
          error: String(error)
        })
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: results.filter(r => r.status === 'success').length,
      failedCount: results.filter(r => r.status === 'failed').length,
      results
    })
  } catch (error) {
    console.error('Payout job error:', error)
    return NextResponse.json(
      { error: 'Failed to process payouts' },
      { status: 500 }
    )
  }
}
```

## 6. Add Email Notifications

Send sellers notifications about their earnings and payouts.

**File**: `src/lib/email-templates.ts`

```typescript
import { sendEmail } from '@/lib/email'

export async function sendEarningsNotification(
  sellerEmail: string,
  earnings: { amount: number; commission: number }
) {
  await sendEmail({
    to: sellerEmail,
    subject: 'Your Earnings Are Now Available',
    html: `
      <h2>Your Monthly Earnings</h2>
      <p>Your earnings for this month are ready to be withdrawn.</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Total Amount:</strong> ₦${earnings.amount.toLocaleString()}</p>
        <p><strong>Commission Deducted:</strong> ₦${earnings.commission.toLocaleString()}</p>
        <p><strong>Your Payout:</strong> ₦${(earnings.amount - earnings.commission).toLocaleString()}</p>
      </div>

      <p>
        <a href="${process.env.NEXTAUTH_URL}/seller/payouts" 
           style="background: #3B82F6; color: white; padding: 10px 20px; 
                  text-decoration: none; border-radius: 5px;">
          View Your Payouts
        </a>
      </p>
    `
  })
}
```

## 7. Database Schema Updates

Ensure your schema has the necessary fields. Add if missing:

**File**: `prisma/schema.prisma`

```prisma
model Order {
  // ... existing fields ...
  
  // Commission tracking
  commission     Float?    // Platform commission amount
  sellerPayout   Float?    // Net amount seller receives
  
  // ... other fields ...
}

model SellerEarning {
  id        String   @id @default(cuid()) @map("_id")
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  
  orderId   String?
  order     Order?   @relation(fields: [orderId], references: [id])
  
  amount    Float    // Seller's net amount
  commission Float   // Commission deducted
  
  isPaid    Boolean  @default(false)
  createdAt DateTime @default(now())
  paidAt    DateTime?
}

model SellerPayout {
  id        String   @id @default(cuid()) @map("_id")
  sellerId  String
  user      User     @relation("SellerPayouts", fields: [sellerId], references: [id])
  
  amount    Float
  month     DateTime
  status    String   @default("INITIATED") // INITIATED, PROCESSING, COMPLETED, FAILED
  
  createdAt DateTime @default(now())
  completedAt DateTime?
}
```

Run migration:
```bash
npx prisma db push
```

## 8. Testing Integration

Create tests to verify commission calculations:

**File**: `src/__tests__/lib/commission-calculator.test.ts`

```typescript
import {
  getCommissionRate,
  calculateOrderTotal,
  getGMVToNextTier
} from '@/lib/commission-calculator'

describe('Commission Calculator', () => {
  describe('getCommissionRate', () => {
    it('should return standard tier for low GMV', () => {
      const rate = getCommissionRate(50000)
      expect(rate.percentage).toBe(15)
    })

    it('should return silver tier at 100k GMV', () => {
      const rate = getCommissionRate(100000)
      expect(rate.percentage).toBe(12)
    })

    it('should return platinum tier at 1M+ GMV', () => {
      const rate = getCommissionRate(1000000)
      expect(rate.percentage).toBe(8)
    })
  })

  describe('calculateOrderTotal', () => {
    it('should calculate correct commission for standard tier', () => {
      const result = calculateOrderTotal(100000, 0, 0, 0, 0)
      expect(result.platformFee).toBe(15000)
      expect(result.sellerPayout).toBe(85000)
    })

    it('should include shipping in total but not commission base', () => {
      const result = calculateOrderTotal(100000, 5000, 0, 0, 0)
      expect(result.total).toBe(105000)
      expect(result.platformFee).toBe(15000)
    })
  })

  describe('getGMVToNextTier', () => {
    it('should show next tier requirements', () => {
      const progress = getGMVToNextTier(50000)
      expect(progress.nextTier).toBe('Silver (₦100k-₦500k GMV)')
      expect(progress.remaining).toBe(50000)
    })

    it('should return null for highest tier', () => {
      const progress = getGMVToNextTier(2000000)
      expect(progress.nextTier).toBeNull()
    })
  })
})
```

## Deployment Checklist

- [ ] Update seller dashboard navigation
- [ ] Update admin navigation
- [ ] Run database migrations
- [ ] Update order creation endpoint
- [ ] Set up monthly payout cron job
- [ ] Configure email notifications
- [ ] Add environment variables for cron secret
- [ ] Test commission calculations
- [ ] Test payment workflows
- [ ] Verify admin access controls
- [ ] Test seller pages
- [ ] Deploy to staging
- [ ] Smoke tests in staging
- [ ] Deploy to production

## Environment Variables

Add these to your `.env.local`:

```
# For monthly payout cron job
CRON_SECRET=your_secret_here

# For email notifications (if using SendGrid)
SENDGRID_API_KEY=your_key_here
EMAIL_FROM=noreply@yourmarketplace.com
```

## Troubleshooting

### Commission rate doesn't update
- Make sure GMV calculation includes orders from last 30 days
- Verify orders have correct `createdAt` dates
- Check if orders are marked as completed/paid

### Monthly payout not running
- Verify cron job endpoint is accessible
- Check CRON_SECRET matches in request
- View logs to see error details
- Ensure database connection is working

### Commission amounts incorrect
- Verify `calculateOrderTotal()` parameters match expected
- Check if GMV includes future orders
- Ensure previous refunds are accounted for

## Support

For questions or issues:
1. Check `COMMISSION_PAYMENT_DOCS.md`
2. Review `IMPLEMENTATION_SUMMARY_COMMISSION_PAYMENTS.md`
3. Check test files for usage examples
4. Contact development team
