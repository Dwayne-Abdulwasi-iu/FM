# Commission & Payment Systems Documentation

## 📍 Quick Links
- **Commission Tiers System:** [src/lib/commission-tiers.ts](src/lib/commission-tiers.ts)
- **Seller Components:** [src/components/seller/](src/components/seller/)
- **Admin Dashboard:** [src/components/admin/payment-reconciliation-dashboard.tsx](src/components/admin/payment-reconciliation-dashboard.tsx)
- **API Endpoint:** [src/app/api/admin/payment-reconciliation/route.ts](src/app/api/admin/payment-reconciliation/route.ts)
- **Related Docs:** [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) • [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) • [DEV_QUICK_START.md](DEV_QUICK_START.md)

## Overview

This document describes the commission and payment tracking systems implemented for the fashion marketplace. The system provides transparency, accurate calculations, and detailed audit trails for both sellers and administrators.

## 1. Commission Tiers System
📍 **Location:** [src/lib/commission-tiers.ts](src/lib/commission-tiers.ts)

The commission system handles all commission-related calculations based on seller total earnings (in USD).

### Commission Tiers

Sellers pay platform commissions based on their cumulative lifetime earnings:

| Tier | Earnings Threshold | Commission Rate | Tier Name |
|------|---|---|----------|
| STARTER | $0 - $100 | 0.1% | Nearly Free! |
| NEW | $100 - $500 | 10% | New Seller |
| BRONZE | $500 - $2,000 | 9.5% | Bronze |
| SILVER | $2,000 - $5,000 | 9% | Silver |
| GOLD | $5,000 - $10,000 | 8.5% | Gold |
| PLATINUM | $10,000 - $25,000 | 8% | Platinum |
| DIAMOND | $25,000+ | 7% | Diamond |

**Pro Subscriber Bonus:** VIP/VVIP sellers get additional 1% discount (minimum 6%)

### Key Functions

#### `getCommissionRate(monthlyGMV: number)`
Returns the applicable commission rate based on current monthly GMV.

```typescript
const { percentage, tier, description } = getCommissionRate(500000)
// Returns: { percentage: 10, tier: 'TIER_2', description: 'Gold (₦500k-₦1M GMV)' }
```

#### `calculateOrderTotal(subtotal, shippingCost, tax, discount, monthlyGMV)`
Calculates complete order breakdown with commission.

```typescript
const breakdown = calculateOrderTotal(
  50000,  // subtotal
  5000,   // shipping
  0,      // tax
  0,      // discount
  200000  // current monthly GMV
)

// Returns:
// {
//   subtotal: 50000,
//   shippingCost: 5000,
//   tax: 0,
//   discount: 0,
//   platformFee: 6000,  // 12% of subtotal
//   sellerPayout: 44000,
//   total: 55000,
//   breakdown: {
//     commissionRate: 12,
//     commissionAmount: 6000,
//     sellerNetAmount: 44000,
//     platformRetains: 6000
//   }
// }
```

#### `getGMVToNextTier(currentGMV: number)`
Shows progress to next tier and potential savings.

```typescript
const progress = getGMVToNextTier(250000)

// Returns:
// {
//   currentTier: 'Silver (₦100k-₦500k GMV)',
//   nextTier: 'Gold (₦500k-₦1M GMV)',
//   currentGMV: 250000,
//   targetGMV: 500000,
//   remaining: 250000,
//   commissionSavingsPerSale: { amount: 2, percentage: 2 }
// }
```

## 2. Commission Calculator Widget

### Component: `CommissionCalculatorWidget`

Interactive widget for sellers to preview earnings on potential sales.

**Features:**
- Real-time commission calculation
- Current tier display
- Adjustable product price, shipping, and quantity
- Next tier unlock information
- Visual breakdown of earnings

**Usage:**
```typescript
import { CommissionCalculatorWidget } from '@/components/seller/commission-calculator-widget'

export default function MyComponent() {
  return <CommissionCalculatorWidget currentMonthlyGMV={500000} />
}
```

## 3. Commission Breakdown Component

### Component: `CommissionBreakdown`
📍 **Location:** [src/components/seller/commission-breakdown.tsx](src/components/seller/commission-breakdown.tsx)

Comprehensive breakdown of seller's commission structure and payment information.

**Features:**
- Monthly GMV summary
- Commission tier display
- What's currently owed (pending vs. paid)
- Payment schedule visualization
- Commission tiers comparison
- Deductions breakdown

**Props:**
```typescript
interface CommissionBreakdownProps {
  monthlyGMV: number
  monthlyCommissions: number
  pendingEarnings: number
  paidOutEarnings: number
  nextPayoutDate?: Date
}
```

## 4. Seller Payout Dashboard
📍 **Page Location:** [src/app/seller/payouts/page.tsx](src/app/seller/payouts/page.tsx)
📍 **Route:** `/seller/payouts`

Main dashboard for sellers to track earnings, commissions, and payment history.

**Features:**
- Commission and payout summary
- Commission calculator widget
- Recent earnings table
- Quick links to related pages
- FAQ and help resources

**Data Calculation:**
```typescript
// Monthly GMV (last 30 days)
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
const monthlyOrders = await prisma.order.findMany({
  where: {
    createdAt: { gte: thirtyDaysAgo },
    items: { some: { design: { userId: sellerId } } }
  }
})
const monthlyGMV = monthlyOrders.reduce((sum, order) => sum + order.total, 0)
```

## 5. Payment Audit Trail

### Component: `PaymentAuditTrail`
📍 **Location:** [src/components/seller/payment-audit-trail.tsx](src/components/seller/payment-audit-trail.tsx)

Detailed transaction history with complete breakdown of each payment.

**Features:**
- Filterable transaction history
- Transaction type indicators (Sale, Refund, Chargeback, Adjustment, Payout)
- Expandable transaction details
- CSV export functionality
- Summary statistics

**Transaction Types:**
- **SALE**: Product purchase
- **REFUND**: Customer refund
- **CHARGEBACK**: Payment dispute/reversal
- **ADJUSTMENT**: Manual adjustment by admin
- **PAYOUT**: Monthly payout to seller

**Transaction Fields:**
```typescript
interface PaymentAuditEntry {
  id: string
  date: Date
  type: 'SALE' | 'REFUND' | 'CHARGEBACK' | 'ADJUSTMENT' | 'PAYOUT'
  amount: number           // Gross amount
  commission?: number      // Commission deducted
  netAmount: number        // Seller's net amount
  processor: string        // Payment processor
  orderId?: string         // Related order ID
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
  description: string
  metadata?: Record<string, any>
}
```

### Route: `/seller/payments/audit-trail`
📍 **Page Location:** [src/app/seller/payments/audit-trail/page.tsx](src/app/seller/payments/audit-trail/page.tsx)

Seller-facing page displaying complete transaction history with audit trail.

## 6. Admin Payment Reconciliation

### API Route: `/api/admin/payment-reconciliation`
📍 **Location:** [src/app/api/admin/payment-reconciliation/route.ts](src/app/api/admin/payment-reconciliation/route.ts)

Admin API for fetching and managing payment reconciliation data.

**GET Parameters:**
- `month` (YYYY-MM): Filter by specific month
- `status` (all|pending|paid): Filter by payment status

**Response:**
```typescript
{
  summary: {
    totalAmount: number
    totalCommission: number
    totalEarningsCount: number
    paidCount: number
    pendingCount: number
    totalPaid: number
    totalPending: number
    pendingPercentage: number
  },
  earnings: PaymentTransaction[],
  sellerSummary: SellerPaymentSummary[],
  paymentMethodBreakdown: PaymentMethodBreakdown[]
}
```

**POST Body** (to mark earnings as paid):
```typescript
{
  earningIds: string[],
  paymentDate?: ISO8601Date
}
```

### Component: `PaymentReconciliationDashboard`
📍 **Location:** [src/components/admin/payment-reconciliation-dashboard.tsx](src/components/admin/payment-reconciliation-dashboard.tsx)

Admin dashboard for payment reconciliation across all processors.

**Features:**
- Summary cards (total revenue, commissions, pending/paid)
- Month and status filtering
- Daily revenue trend chart
- Revenue by payment method chart
- Transactions table with status indicators
- Mark as paid functionality
- CSV export

**Route:** `/admin/payments/reconciliation`

## 7. Payment Flow Timeline

### From Order to Payout

```
1. Order Placed (T+0)
   └─ Commission calculated based on seller's current GMV
   └─ Gross amount, commission, net payout recorded

2. Payment Processing (T+0 to T+1)
   └─ Payment processed by Stripe/Paystack
   └─ Transaction created with processor-specific details
   └─ Status: PENDING (7-day hold)

3. Hold Period (T+1 to T+7)
   └─ Funds held to allow for:
     - Customer disputes
     - Refund requests
     - Chargeback challenges
   └─ Transaction visible in audit trail with PENDING status

4. Hold Released (T+7)
   └─ Transaction marked as COMPLETED
   └─ Amount added to seller's pending earnings for current month
   └─ Available for monthly payout

5. Monthly Payout (First of Month)
   └─ All COMPLETED transactions from previous month aggregated
   └─ Platform calculates net amount:
     - Subtract any refunds
     - Subtract any chargebacks
     - Add any adjustments
   └─ Payment initiated to seller's bank account
   └─ Status updated to PAID
   └─ Transaction visible in audit trail with PAID status
```

## 8. Refund and Chargeback Handling

### Refunds

When a refund is issued:
1. Calculate refund amount with commission adjustment
2. Create REFUND transaction entry
3. Deduct from seller's net earnings
4. If already paid out, adjust next payout

### Chargebacks

When a chargeback occurs:
1. Deduct full amount from seller earnings
2. Charge chargeback fee (typically ₦2,000 - ₦5,000)
3. Create CHARGEBACK transaction entry
4. Mark as FAILED/DISPUTED
5. Notify seller of chargeback
6. If seller doesn't respond, resolve in platform's favor

## 9. Database Schema

### PaymentTransaction Model
```prisma
model PaymentTransaction {
  id                        String    @id @default(cuid()) @map("_id")
  orderId                   String
  order                     Order     @relation(fields: [orderId], references: [id])
  
  // Processor info
  processor                 String    // "stripe", "paystack", "bank"
  processorTransactionId    String    // External transaction ID
  processorStatus           String    // From processor webhook
  
  // Amount breakdown
  buyerAmount               Float     // Total paid by customer
  processorFee              Float     // Fee charged by processor
  platformFee               Float     // Platform commission
  sellerPayout              Float     // Net amount to seller
  currency                  String    @default("NGN")
  
  // Status tracking
  payoutStatus              String    @default("PENDING")  // PENDING, COMPLETED, FAILED
  reconciliationStatus      String?   // For admin reconciliation
  failureReason             String?
  
  // Dates
  createdAt                 DateTime  @default(now())
  completedAt               DateTime?
  payoutCompletedAt         DateTime?
  
  // Seller info
  seller                    User      @relation("SellerTransactions", fields: [sellerId], references: [id])
  sellerId                  String
  buyer                     User      @relation("BuyerTransactions", fields: [buyerId], references: [id])
  buyerId                   String
}

model SellerEarning {
  id          String    @id @default(cuid()) @map("_id")
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  
  orderId     String?
  order       Order?    @relation(fields: [orderId], references: [id])
  
  amount      Float     // Net amount seller receives
  commission  Float     // Commission deducted
  
  isPaid      Boolean   @default(false)
  createdAt   DateTime  @default(now())
  paidAt      DateTime?
}
```

## 10. Best Practices

### For Sellers
1. **Monitor your GMV**: Track sales toward next tier to unlock better rates
2. **Plan refunds**: Understand that refunds affect your net earnings
3. **Check audit trail**: Review all transactions monthly
4. **Report discrepancies**: Contact support if amounts don't match

### For Admins
1. **Regular reconciliation**: Perform weekly/monthly reconciliation
2. **Verify processor data**: Compare platform records with processor statements
3. **Monitor chargebacks**: Track chargeback rates and investigate patterns
4. **Update tiers**: Review tier rates quarterly based on market conditions
5. **Export reports**: Keep detailed records for auditing purposes

## 11. Testing

### Commission Calculator
```typescript
describe('Commission Calculator', () => {
  it('should calculate correct commission for standard tier', () => {
    const result = calculateCommission(100000, 0)
    expect(result.commission).toBe(15000)
    expect(result.sellerPayout).toBe(85000)
  })

  it('should apply silver tier for ₦100k+ GMV', () => {
    const result = getCommissionRate(150000)
    expect(result.percentage).toBe(12)
    expect(result.description).toContain('Silver')
  })
})
```

### Payment Reconciliation
```typescript
describe('Payment Reconciliation', () => {
  it('should sum payments correctly', async () => {
    const response = await fetch('/api/admin/payment-reconciliation')
    const data = await response.json()
    
    expect(data.summary.totalAmount).toBeGreaterThanOrEqual(0)
    expect(data.summary.totalPaid + data.summary.totalPending)
      .toBe(data.summary.totalAmount)
  })
})
```

## 12. Troubleshooting

### Issue: Commission rate shows as 15% but seller should be on 12%

**Solution:**
1. Check if GMV calculation includes only completed orders
2. Verify date range (should be last 30 days)
3. Check if orders are in correct currency
4. Recalculate rate manually

### Issue: Pending earnings don't match audit trail

**Solution:**
1. Filter audit trail for PENDING status transactions
2. Exclude REFUND and CHARGEBACK entries
3. Check hold period (must be > 7 days)
4. Verify no overlapping payouts

### Issue: Payment reconciliation shows discrepancy

**Solution:**
1. Check processor webhook log for missed transactions
2. Verify all transactions marked as PAID in platform
3. Check for pending/in-flight transactions
4. Contact payment processor support if needed

## 13. Future Enhancements

- [ ] Automated monthly payout scheduling
- [ ] Multi-currency support for sellers
- [ ] Tax document generation (1099-equivalent)
- [ ] Chargeback prediction analytics
- [ ] Real-time commission rate notifications
- [ ] Seller performance bonuses
- [ ] Tiered payout schedules (weekly/bi-weekly)
- [ ] Commission negotiation for high-volume sellers
