# Pro Subscription Implementation - Issues Found & Fixes

## 🔴 CRITICAL ISSUES

### 1. **expireAndRestoreSubscriptions() - Wrong sellerAccount Access Pattern**

**Location**: `src/lib/tier-management.ts` line 566

**Problem**: 
```typescript
if (sub.user.sellerAccount?.[0]?.subaccountCode) {  // ❌ WRONG - treating as array
```

Should be:
```typescript
if (sub.user.sellerAccount?.subaccountCode) {  // ✅ CORRECT - it's a single object
```

**Impact**: Subscription expiration will fail to update Paystack rates because it tries to access `[0]` on an object.

---

### 2. **getCommissionRateWithSubscription() - Logic Flaw**

**Location**: `src/lib/tier-management.ts` line 322

**Problem**: 
```typescript
export function getCommissionRateWithSubscription(
  totalEarnings: number,
  isProSubscriber: boolean,
  hasActiveProSubscription: boolean
): number {
  const baseRate = getCommissionRate(totalEarnings, isProSubscriber || hasActiveProSubscription)
  // ❌ This line applies subscription boost twice!
  
  if (hasActiveProSubscription) {
    return Math.max(baseRate - 0.01, 0.06)
  }
  return baseRate
}
```

**Explanation**: 
- Line calls `getCommissionRate(totalEarnings, true)` when `hasActiveProSubscription=true`
- Then subtracts 0.01 again
- **Results in 2% discount instead of 1%**

**Fix**:
```typescript
export function getCommissionRateWithSubscription(
  totalEarnings: number,
  isProSubscriber: boolean,
  hasActiveProSubscription: boolean
): number {
  // Don't pass subscription status to getCommissionRate - it only checks isProSubscriber
  const baseRate = getCommissionRate(totalEarnings, isProSubscriber)
  
  // Only apply 1% discount if active subscription
  if (hasActiveProSubscription) {
    return Math.max(baseRate - 0.01, 0.06)
  }
  return baseRate
}
```

**Impact**: Sellers with Pro subscriptions pay 2% less than intended, reducing platform revenue.

---

### 3. **activateProSubscription() - Wrong Tier Boost Calculation**

**Location**: `src/lib/tier-management.ts` line 418

**Problem**:
```typescript
const newRate = getCommissionRate(seller.totalEarnings, false) - 0.01 // Apply 1% subscription discount
```

This only applies the 1% discount but doesn't account for the tier boost! It should:
1. Get effective tier (natural + 1)
2. Get rate for effective tier
3. Apply subscription discount

**Current**: GOLD (8.5%) → 7.5% ❌
**Should be**: GOLD boosted to PLATINUM (8%) → 7% ✅

---

### 4. **Missing getSellerEffectiveTierInfo() Relationship**

**Location**: `src/lib/tier-management.ts` line 596

**Problem**:
```typescript
select: {
  totalEarnings: true,
  proSubscriptionActive: true,
  proSubscriptionExpiresAt: true,
  proSubscription: { select: { billingPeriod: true, expiresAt: true } }
}
```

The field name is `proSubscription` but the field doesn't exist in User model! It exists as separate fields.

**Should be**:
```typescript
select: {
  totalEarnings: true,
  proSubscriptionActive: true,
  proSubscriptionExpiresAt: true,
  proSubscriptionTier: true  // This is the field name
}
```

**Impact**: Query will fail - `proSubscription` relation doesn't exist.

---

### 5. **expireAndRestoreSubscriptions() - Missing sellerAccount Include**

**Location**: `src/lib/tier-management.ts` line 541

**Problem**:
```typescript
const expiredSubs = await prisma.proSubscription.findMany({
  where: {
    status: 'ACTIVE',
    expiresAt: { lte: now }
  },
  include: { user: { select: { id: true, name: true, totalEarnings: true, sellerAccount: true } } }
})
```

Tries to include `sellerAccount` but doesn't properly select nested fields.

**Should be**:
```typescript
include: { 
  user: { 
    select: { 
      id: true, 
      name: true, 
      totalEarnings: true, 
      sellerAccount: { 
        select: { subaccountCode: true }
      } 
    } 
  } 
}
```

---

## 🟡 HIGH PRIORITY ISSUES

### 6. **Missing Validation in API Routes**

**Location**: `src/app/api/subscriptions/pro/route.ts` POST handler

**Problem**: No validation that user is actually a seller

**Add**:
```typescript
const seller = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { id: true, sellerAccount: true }
})

if (!seller?.sellerAccount) {
  return NextResponse.json({ 
    error: 'You must have a seller account to upgrade' 
  }, { status: 403 })
}
```

---

### 7. **Cancel Endpoint Needs Seller Validation**

**Location**: `src/app/api/subscriptions/pro/cancel.ts`

**Problem**: Returns generic success without checking if subscription actually exists

**Current**:
```typescript
return NextResponse.json({
  success: true,
  message: 'Subscription cancellation initiated',
  reason
})
```

**Should check**:
```typescript
const existing = await prisma.proSubscription.findUnique({
  where: { userId: session.user.id }
})

if (!existing) {
  return NextResponse.json({ 
    error: 'No active subscription found' 
  }, { status: 404 })
}
```

---

### 8. **Stripe Webhook Handlers Missing Customer Email**

**Location**: `src/app/api/webhooks/stripe/route.ts` handleSubscriptionCreated

**Problem**: Doesn't retrieve customer email for logging/debugging

**Add after line 800**:
```typescript
const customer = await stripe.customers.retrieve(sub.customer)
if (customer.email) {
  console.log(`[Pro Subscription] Customer email: ${customer.email}`)
}
```

---

### 9. **Paystack Webhook - Missing Payment Status Check**

**Location**: `src/app/api/webhooks/paystack/route.ts` line 133

**Problem**: `handleProSubscriptionPayment` doesn't verify `status` is successful

**Add validation**:
```typescript
if (!response.status) {
  return { success: false, message: 'Payment failed: ' + response.message }
}
```

---

## 🟠 MEDIUM PRIORITY ISSUES

### 10. **UI Component - Missing Loading State in Featured Listings**

**Location**: `src/app/seller/upgrade/page.tsx`

**Issue**: Shows "5 Featured Listings/Month" statically, should vary based on status

**Current**:
```typescript
{
  icon: <Star className="h-5 w-5" />,
  title: '6 Featured Listings',
  description: 'Premium placements on category pages (vs 5 for standard)',
  highlight: true,
}
```

This is hardcoded. When user is already subscribed, it should show "6" in the benefits, but when not subscribed it should show "5".

---

### 11. **Cron Endpoint - No Rate Limiting**

**Location**: `src/app/cron/subscriptions/expire.ts`

**Issue**: Anyone with CRON_SECRET can spam the endpoint

**Should add**: Request limiting per hour
```typescript
// Prevent abuse
const lastRun = await redis.get(`cron:expire:last_run`)
if (lastRun) {
  return NextResponse.json({ 
    error: 'Cron already ran in last hour' 
  }, { status: 429 })
}
```

---

### 12. **Missing Transaction Support**

**Location**: All database write operations

**Issue**: If payment processor update fails, database state is inconsistent

**Example in activateProSubscription**:
```typescript
// These happen separately - if Paystack fails, subscription is still active
await prisma.proSubscription.upsert(...)  // ✅ Success
await prisma.user.update(...)             // ✅ Success
await paystack.subaccount.update(...)     // ❌ Fails - but subscription still active!
```

**Should use**: Prisma transactions
```typescript
await prisma.$transaction(async (tx) => {
  await tx.proSubscription.upsert(...)
  await tx.user.update(...)
})
// Then update Paystack separately
```

---

## 🔵 LOW PRIORITY / NICE-TO-HAVES

### 13. **Missing Email Notifications**

The Paystack webhook sends email, but Stripe webhook doesn't.

**Add to handleSubscriptionCreated**:
```typescript
await sendEmail({
  to: seller.email,
  subject: 'Pro Subscription Activated',
  html: `Your Pro subscription is now active!`
})
```

---

### 14. **No Subscription Metadata Logging**

**Issue**: Hard to debug which subscriptions are from which processor

**Add**:
```typescript
processor: billingPeriod === 'YEARLY' ? 'stripe_yearly' : 'stripe_monthly'
// Store in ProSubscription for filtering
```

---

### 15. **Missing Idempotency for Webhook**

**Location**: Stripe webhook handlers

**Issue**: If webhook retries, subscription gets activated twice

**Add**:
```typescript
const existing = await prisma.proSubscription.findUnique({
  where: { userId }
})
if (existing?.status === 'ACTIVE') {
  return // Already activated
}
```

---

## Summary of Fixes Needed

| Priority | Count | Impact |
|----------|-------|--------|
| 🔴 Critical | 5 | System breaking bugs |
| 🟡 High | 4 | Major feature failures |
| 🟠 Medium | 3 | Data inconsistency issues |
| 🔵 Low | 3 | Edge cases & nice-to-haves |

**Total**: 15 issues found

**Recommended Action**: Fix all 5 critical + 4 high priority items before deployment.
