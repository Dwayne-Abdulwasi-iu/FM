# Pro Subscription - Commission Structure Clarification

## How the -1% Discount Works

### Structure
The Pro Subscription provides **TWO separate benefits**:

1. **Tier Boost** - Instantly upgrade to the next tier level for features/benefits
2. **1% Flat Commission Discount** - Additional 1% off commission rate (separate from tier boost)

---

## Example Calculations

### Scenario 1: Tier 1 Seller (Natural Rate: 9.5%)

**Without Pro Subscription:**
- Natural Tier: Bronze (Tier 1)
- Commission Rate: 9.5%
- Featured Listings: 5
- Tier Features: Bronze benefits

**With Pro Subscription:**
- Natural Tier: Still Bronze
- Effective Tier (for features): Silver (tier boost applies)
- Commission Rate: 9.5% - 1% = **8.5%** ✓
- Featured Listings: 6 (from tier boost)
- Tier Features: Silver benefits
- Plus: All Pro benefits (priority support, advanced analytics, etc.)

**Key Point:** Seller gets 8.5% rate + Silver features. Same commission as natural Silver (9%)!

---

### Scenario 2: Tier 2 Seller (Natural Rate: 9%)

**Without Pro Subscription:**
- Natural Tier: Silver (Tier 2)
- Commission Rate: 9%

**With Pro Subscription:**
- Natural Tier: Still Silver
- Effective Tier (for features): Gold (tier boost applies)
- Commission Rate: 9% - 1% = **8%** ✓
- Tier Features: Gold benefits

---

### Scenario 3: Tier 5 (Highest - DIAMOND, Natural Rate: 7%)

**Without Pro Subscription:**
- Natural Tier: Diamond (Tier 5)
- Commission Rate: 7%

**With Pro Subscription:**
- Natural Tier: Still Diamond
- Effective Tier: Diamond (already at max, no boost)
- Commission Rate: 7% - 1% = **6%** ✓
- Tier Features: Diamond benefits (unchanged)

**Note:** Even highest tier sellers get the 1% discount!

---

## Implementation Details

### Code Flow

**File:** `src/lib/commission-tiers.ts`
```typescript
export const PRO_SUBSCRIBER_DISCOUNT = 0.01 // 1% = 0.01
export const MINIMUM_COMMISSION_RATE = 0.06 // 6% minimum

export function getCommissionRate(totalEarnings: number, isProSubscriber: boolean = false): number {
  const tier = getCommissionTier(totalEarnings)
  const baseRate = COMMISSION_TIERS[tier].rate
  
  // If Pro subscriber, apply -1% discount (minimum 6%)
  if (isProSubscriber) {
    return Math.max(baseRate - PRO_SUBSCRIBER_DISCOUNT, MINIMUM_COMMISSION_RATE)
  }
  return baseRate
}
```

**File:** `src/lib/tier-management.ts`
```typescript
// When activating subscription, get the correct rate WITH 1% discount
const newRate = getCommissionRate(seller.totalEarnings, true) // ✓ Correct
// NOT: getCommissionRate(seller.totalEarnings, false) - 0.01  // ✗ Wrong

// Update Paystack with the new rate
const paystackPercentage = rateToPaystackPercentage(newRate)
```

---

## Commission Rate Chart - With Pro Subscription

| Tier | Natural Rate | With Pro (-1%) | Savings |
|------|-------------|----------------|---------|
| STARTER | ~0.1% | 0.1%* | N/A |
| BRONZE | 9.5% | 8.5% | 1% |
| SILVER | 9% | 8% | 1% |
| GOLD | 8.5% | 7.5% | 1% |
| PLATINUM | 8% | 7% | 1% |
| DIAMOND | 7% | 6% | 1% |

*Starter tier uses Paystack minimum (0.1%), cannot go lower

---

## Features Chart - Tier Boost

| Feature | Bronze | +1 Tier Boost | Natural Silver |
|---------|--------|--------------|-----------------|
| Commission Rate | 9.5% | 8.5% | 9% |
| Featured Listings | 5 | 6 | 6 |
| Priority Support | ✓ | ✓ | ✓ |
| Analytics | Basic | Advanced | Advanced |

**Result:** With Pro, Bronze seller gets:
- Silver features (6 listings, advanced analytics)
- Bronze commission rate MINUS 1% = 9.5% - 1% = 8.5%
- Which is better than natural Silver (9%)!

---

## Pricing

### Monthly Plan
- **USD:** $9.99/month
- **NGN:** ₦16,498/month (approx, based on current exchange rate)

### Yearly Plan  
- **USD:** $99.99/year = $8.33/month (17% savings)
- **NGN:** ₦164,835/year (approx, 17% savings)

---

## How It's Displayed to Users

### On Upgrade Page
- Currency toggle (USD / NGN)
- Real-time exchange rate shown
- Clear discount messaging for yearly plan
- "17% savings vs monthly" highlighted

### In Seller Dashboard
- Active tier badge
- Effective tier (with Pro label if boosted)
- Current commission rate
- Pro subscription expiry date
- One-click "Cancel Subscription" option

---

## Key Implementation Points

✅ **1% discount is FLAT** - applies to seller's natural tier rate
✅ **Tier boost is SEPARATE** - for features, not commission calculation
✅ **Both stack together** - Tier 1 (12%) with Pro = 11% + Tier 2 features
✅ **Minimum floor: 6%** - even with Pro, won't go below 6%
✅ **Applies to all currencies** - USD and NGN get same 1% discount
✅ **Paystack synced** - subaccount percentages updated immediately
✅ **Expiration restores** - commission reverts to natural rate when subscription expires

---

## Testing the -1% Discount

### Manual Test Checklist
- [ ] Create Bronze seller (verify 9.5% natural rate)
- [ ] Activate Pro subscription
- [ ] Verify commission rate is 9.5% - 1% = 8.5%
- [ ] Check Paystack subaccount shows correct rate
- [ ] Wait for expiration (or manually set pastDate)
- [ ] Run cron job: `npm run dev` + trigger `/api/cron/subscriptions/expire-daily`
- [ ] Verify rate restored to 9.5%
- [ ] Test for Diamond tier (7% - 1% = 6%)
- [ ] Verify NGN pricing converts correctly

---

**Status:** ✅ Implemented and fixed  
**Last Updated:** January 30, 2026
