# Implementation Checklist & Testing Guide

## 📍 Quick Links
- **Commission Calculator:** [src/lib/commission-calculator.ts](src/lib/commission-calculator.ts)
- **Components:** [src/components/seller/](src/components/seller/) • [src/components/admin/payment-reconciliation-dashboard.tsx](src/components/admin/payment-reconciliation-dashboard.tsx)
- **Pages:** [src/app/seller/payouts/](src/app/seller/payouts/) • [src/app/seller/payments/audit-trail/](src/app/seller/payments/audit-trail/) • [src/app/admin/payments/reconciliation/](src/app/admin/payments/reconciliation/)
- **API:** [src/app/api/admin/payment-reconciliation/](src/app/api/admin/payment-reconciliation/)
- **Related Docs:** [COMMISSION_PAYMENT_DOCS.md](COMMISSION_PAYMENT_DOCS.md) • [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) • [DEV_QUICK_START.md](DEV_QUICK_START.md)

### Environment Setup
- [ ] Node.js 18+ installed
- [ ] Database connection working (`npm run db:push`)
- [ ] All dependencies installed (`npm install`)
- [ ] TypeScript compilation working (`npm run type-check`)

### Code Review
- [ ] All new files reviewed
- [ ] Imports verified
- [ ] Type definitions complete
- [ ] No console.log statements in production code
- [ ] Error handling implemented

### Documentation
- [ ] Code comments added where needed
- [ ] Function documentation complete
- [ ] README updated with new routes
- [ ] Integration guide reviewed

## Implementation Steps

### Step 1: Copy Files to Project

1. **Copy utility library**
   ```bash
   cp src/lib/commission-calculator.ts [your-project]/src/lib/
   ```
   📍 Source: [src/lib/commission-calculator.ts](src/lib/commission-calculator.ts)

2. **Copy components**
   ```bash
   cp src/components/seller/commission-*.tsx [your-project]/src/components/seller/
   cp src/components/seller/payment-audit-trail.tsx [your-project]/src/components/seller/
   cp src/components/admin/payment-reconciliation-dashboard.tsx [your-project]/src/components/admin/
   ```
   📍 Components: [src/components/seller/](src/components/seller/) • [src/components/admin/](src/components/admin/)

3. **Copy pages**
   ```bash
   cp -r src/app/seller/payouts [your-project]/src/app/seller/
   cp -r src/app/seller/payments [your-project]/src/app/seller/
   cp -r src/app/admin/payments [your-project]/src/app/admin/
   ```
   📍 Pages: [src/app/seller/payouts/](src/app/seller/payouts/) • [src/app/seller/payments/audit-trail/](src/app/seller/payments/audit-trail/) • [src/app/admin/payments/reconciliation/](src/app/admin/payments/reconciliation/)

4. **Copy API routes**
   ```bash
   cp -r src/app/api/admin/payment-reconciliation [your-project]/src/app/api/admin/
   ```
   📍 API: [src/app/api/admin/payment-reconciliation/](src/app/api/admin/payment-reconciliation/)

5. **Copy documentation**
   ```bash
   cp COMMISSION_PAYMENT_DOCS.md [your-project]/
   cp IMPLEMENTATION_SUMMARY_COMMISSION_PAYMENTS.md [your-project]/
   cp INTEGRATION_GUIDE.md [your-project]/
   ```
   📍 Docs: [COMMISSION_PAYMENT_DOCS.md](COMMISSION_PAYMENT_DOCS.md) • [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)

### Step 2: Update Imports

Verify all imports match your project structure:
- `@/lib/commission-calculator`
- `@/lib/auth`
- `@/lib/prisma`
- `@/components/ui/button`
- `lucide-react` icons

### Step 3: Database Schema Updates

Add missing fields to your schema:

```bash
# Edit prisma/schema.prisma
# Add fields to Order model:
# - commission: Float?
# - sellerPayout: Float?

# Add SellerEarning model if missing
# Add SellerPayout model if missing

npx prisma db push
```

### Step 4: Environment Variables

Add to `.env.local`:

```env
# Cron job authentication
CRON_SECRET=your_super_secret_cron_key_12345

# Email (optional)
SENDGRID_API_KEY=SG.your_api_key
EMAIL_FROM=noreply@yourmarketplace.com
```

### Step 5: Test Locally

```bash
# Type check
npm run type-check

# Run tests (if implemented)
npm run test

# Start dev server
npm run dev
```

## Testing Procedures

### 1. Unit Tests

Create file: `src/__tests__/lib/commission-calculator.test.ts`

```typescript
import {
  getCommissionRate,
  calculateCommission,
  calculateOrderTotal,
  getGMVToNextTier,
  getCommissionTiers,
  getSellerEarningsEstimate
} from '@/lib/commission-calculator'

describe('Commission Calculator', () => {
  describe('getCommissionRate', () => {
    test('returns 15% for 0 GMV (standard tier)', () => {
      const result = getCommissionRate(0)
      expect(result.percentage).toBe(15)
      expect(result.tier).toBe('TIER_0')
    })

    test('returns 12% for 100k GMV (silver tier)', () => {
      const result = getCommissionRate(100000)
      expect(result.percentage).toBe(12)
      expect(result.tier).toBe('TIER_1')
    })

    test('returns 10% for 500k GMV (gold tier)', () => {
      const result = getCommissionRate(500000)
      expect(result.percentage).toBe(10)
      expect(result.tier).toBe('TIER_2')
    })

    test('returns 8% for 1M+ GMV (platinum tier)', () => {
      const result = getCommissionRate(1000000)
      expect(result.percentage).toBe(8)
      expect(result.tier).toBe('TIER_3')
    })
  })

  describe('calculateCommission', () => {
    test('calculates correct commission amount', () => {
      const result = calculateCommission(100000, 0)
      expect(result.commission).toBe(15000)
      expect(result.sellerPayout).toBe(85000)
    })

    test('applies correct rate based on GMV', () => {
      const result = calculateCommission(100000, 150000)
      expect(result.commission).toBe(12000)
      expect(result.sellerPayout).toBe(88000)
    })
  })

  describe('calculateOrderTotal', () => {
    test('includes shipping in total but not commission base', () => {
      const result = calculateOrderTotal(100000, 5000, 0, 0, 0)
      expect(result.subtotal).toBe(100000)
      expect(result.shippingCost).toBe(5000)
      expect(result.total).toBe(105000)
      expect(result.platformFee).toBe(15000)
      expect(result.sellerPayout).toBe(85000)
    })

    test('handles discounts correctly', () => {
      const result = calculateOrderTotal(100000, 0, 0, 10000, 0)
      expect(result.discount).toBe(10000)
      expect(result.total).toBe(90000)
      expect(result.platformFee).toBe(15000) // Based on subtotal only
    })
  })

  describe('getGMVToNextTier', () => {
    test('shows next tier for mid-tier seller', () => {
      const result = getGMVToNextTier(200000)
      expect(result.nextTier).toBe('Gold (₦500k-₦1M GMV)')
      expect(result.remaining).toBe(300000)
    })

    test('returns null nextTier for highest tier', () => {
      const result = getGMVToNextTier(2000000)
      expect(result.nextTier).toBeNull()
      expect(result.remaining).toBeNull()
    })
  })

  describe('getSellerEarningsEstimate', () => {
    test('shows current vs projected earnings', () => {
      const result = getSellerEarningsEstimate(200000, 500000)
      expect(result.current.commissionRate).toBe(12)
      expect(result.projected.commissionRate).toBe(10)
      expect(result.projected.savingsIfReached).toBeGreaterThan(0)
    })
  })
})
```

Run tests:
```bash
npm run test -- commission-calculator
```

### 2. Component Tests

Create file: `src/__tests__/components/seller/commission-calculator-widget.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { CommissionCalculatorWidget } from '@/components/seller/commission-calculator-widget'

describe('CommissionCalculatorWidget', () => {
  test('renders current tier', () => {
    render(<CommissionCalculatorWidget currentMonthlyGMV={200000} />)
    expect(screen.getByText(/Silver/i)).toBeInTheDocument()
  })

  test('updates payout when price changes', () => {
    render(<CommissionCalculatorWidget currentMonthlyGMV={0} />)
    
    const priceInput = screen.getByPlaceholderText('50000')
    fireEvent.change(priceInput, { target: { value: '100000' } })
    
    // Should show 85000 payout (100000 - 15% commission)
    expect(screen.getByText(/85,000/)).toBeInTheDocument()
  })

  test('shows next tier info', () => {
    render(<CommissionCalculatorWidget currentMonthlyGMV={50000} />)
    expect(screen.getByText(/Unlock Savings/i)).toBeInTheDocument()
    expect(screen.getByText(/₦100,000/)).toBeInTheDocument()
  })
})
```

### 3. Integration Tests

Create file: `src/__tests__/api/commission.test.ts`

```typescript
describe('Commission APIs', () => {
  describe('GET /api/admin/payment-reconciliation', () => {
    test('requires admin role', async () => {
      const response = await fetch('/api/admin/payment-reconciliation')
      expect(response.status).toBe(401)
    })

    test('returns payment summary for admin', async () => {
      const response = await fetch('/api/admin/payment-reconciliation', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.summary).toBeDefined()
      expect(data.summary.totalAmount).toBeGreaterThanOrEqual(0)
    })

    test('filters by month', async () => {
      const response = await fetch(
        '/api/admin/payment-reconciliation?month=2024-01',
        { headers: { 'Authorization': `Bearer ${adminToken}` } }
      )
      const data = await response.json()
      // All transactions should be from January 2024
      data.transactions.forEach(t => {
        const date = new Date(t.completedAt)
        expect(date.getFullYear()).toBe(2024)
        expect(date.getMonth()).toBe(0)
      })
    })
  })

  describe('POST /api/admin/payment-reconciliation', () => {
    test('marks earnings as paid', async () => {
      const earningId = 'test_earning_123'
      const response = await fetch('/api/admin/payment-reconciliation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          earningIds: [earningId],
          paymentDate: new Date().toISOString()
        })
      })
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })
})
```

### 4. E2E Tests (Manual)

#### Test: Seller views commission breakdown

1. Log in as a seller
2. Navigate to `/seller/payouts`
3. **Expected:**
   - Commission calculator visible
   - Commission breakdown visible
   - Monthly GMV displayed correctly
   - Commission rate matches tier
   - Next tier info displayed

#### Test: Admin views payment reconciliation

1. Log in as admin
2. Navigate to `/admin/payments/reconciliation`
3. **Expected:**
   - Summary cards displayed
   - Filters working (month, status)
   - Transactions table visible
   - Charts rendering
   - Mark as paid button functional

#### Test: Commission calculation on purchase

1. Navigate to product purchase
2. Add product to cart (₦50,000 price)
3. Checkout as buyer
4. **Expected:**
   - Order created in database
   - Commission calculated correctly
   - Seller earning recorded
   - Transaction in audit trail

#### Test: Payment holds and releases

1. Create sale order
2. View in seller audit trail
3. **Expected:**
   - Status shows PENDING
   - 7-day hold note displayed
4. After 7+ days:
   - Status shows COMPLETED
   - Amount available for payout

### 5. Performance Tests

Test with large datasets:

```typescript
// Test with 10,000 transactions
const testPerformance = async () => {
  const start = performance.now()
  
  const response = await fetch(
    '/api/admin/payment-reconciliation?month=2024-01',
    { headers: { 'Authorization': `Bearer ${adminToken}` } }
  )
  
  const end = performance.now()
  const duration = end - start
  
  console.log(`Response time: ${duration}ms`)
  expect(duration).toBeLessThan(5000) // Should respond in under 5 seconds
}
```

### 6. Security Tests

- [ ] Verify non-admin cannot access `/admin/payments/*`
- [ ] Verify non-seller cannot access `/seller/payouts`
- [ ] Verify seller can only see their own data
- [ ] Verify admin can see all seller data
- [ ] Test SQL injection in filters
- [ ] Test XSS in transaction descriptions
- [ ] Verify CSRF tokens on forms

## Deployment Testing

### Staging Environment

1. Deploy to staging
2. Run all tests
3. Test with real payment processor webhooks
4. Verify database migrations
5. Test email notifications
6. Load test with simulated traffic

### Production Deployment

1. Final code review
2. Backup database
3. Deploy during low-traffic period
4. Monitor error logs
5. Verify payment flows working
6. Monitor performance metrics

## Rollback Plan

If issues occur in production:

1. **Immediate:** Disable affected features via feature flags
2. **Short term:** Roll back to previous version
3. **Data:** Restore from backup if needed
4. **Communication:** Notify sellers of any issues

Feature flag example:
```typescript
if (!process.env.COMMISSION_FEATURE_ENABLED) {
  return NextResponse.json(
    { error: 'Feature temporarily disabled' },
    { status: 503 }
  )
}
```

## Monitoring & Alerts

Set up monitoring for:

- [ ] High error rate on `/api/admin/payment-reconciliation`
- [ ] Commission calculation errors
- [ ] Payout job failures
- [ ] Database query performance
- [ ] Memory usage spikes

### Example Monitoring (Sentry)

```typescript
import * as Sentry from "@sentry/nextjs"

try {
  const breakdown = calculateOrderTotal(...)
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: 'commission-calculator',
      severity: 'high'
    }
  })
}
```

## Post-Deployment Checklist

- [ ] All routes accessible
- [ ] Commission calculations accurate
- [ ] Admin dashboard functional
- [ ] Seller dashboard accessible
- [ ] Audit trail displaying correctly
- [ ] Export functionality working
- [ ] Email notifications sending
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Mobile responsive
- [ ] Accessibility working

## Support & Escalation

### Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| 500 error on `/admin/payments/*` | Database connection | Check DATABASE_URL |
| Commission rate wrong | GMV calculation incorrect | Verify 30-day window |
| Payout not running | Cron job misconfigured | Check CRON_SECRET |
| Audit trail empty | No transactions | Create test orders |
| Export not working | File permissions | Check browser storage quota |

### Escalation

For urgent issues:
1. Check logs for specific error
2. Verify database connectivity
3. Check payment processor status
4. Contact infrastructure team if database issues
5. Contact payment processor if webhook issues

## Success Metrics

After deployment, track:

- [ ] Commission calculator used by X% of sellers
- [ ] Payout accuracy at 99.99%
- [ ] 0 reconciliation discrepancies
- [ ] Average response time < 1 second
- [ ] User satisfaction > 4.5/5

## Documentation Updates

After deployment, update:

- [ ] User guides
- [ ] API documentation
- [ ] Admin manual
- [ ] Support FAQ
- [ ] Change log
- [ ] Release notes

## Conclusion

Follow this checklist to ensure successful implementation and deployment of the commission and payment systems. Regular monitoring and support ensure ongoing success.
