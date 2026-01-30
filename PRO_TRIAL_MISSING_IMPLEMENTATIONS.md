# 🚨 PRO TRIAL SYSTEM - MISSING IMPLEMENTATIONS

**Status:** New trial system added but incomplete  
**Date:** January 30, 2026

---

## 🔴 CRITICAL - MUST IMPLEMENT

### 1. **Trial Duration Check in Features** 
**Issue:** Trial status is tracked but NOT checked when granting benefits

**Missing:**
- Commission rate calculation doesn't check `proTrialActive`
- Featured listings logic doesn't check trial
- API responses don't show trial as granting pro benefits

**Files to Update:**
- `src/lib/commission-tiers.ts` - Add trial check to commission calculation
- `src/lib/tier-management.ts` - Add trial status to effective tier logic
- All API endpoints that calculate commissions

**Fix:**
```typescript
// Get commission rate - check BOTH subscription AND trial
const hasProBenefits = (proSubscriptionActive && expiresAt > now) || 
                       (proTrialActive && trialExpiresAt > now)
const rate = getCommissionRateWithTrial(earnings, hasProBenefits)
```

---

### 2. **Two-Step Verification Not Actually Implemented**
**Issue:** API accepts any 6-digit code, no actual SMS/Email sent

**Missing:**
- SMS sending via Twilio/AWS SNS
- Email sending integration
- Redis/cache for verification code storage
- Code expiry validation (10 minutes)
- Rate limiting on verification attempts

**Files to Create:**
- `src/lib/sms-verification.ts` - SMS sending logic
- `src/lib/verification-cache.ts` - Code storage and validation

**Current Code Problem:**
```typescript
// Line in pro-trial/route.ts:
// TODO: Send SMS or Email with code
// For demo: log the code
console.log(`[Pro Trial] Verification code for ${user.email}: ${code}`)

// TODO: Verify the code from Redis/cache
// For demo: accept any 6-digit code
if (!/^\d{6}$/.test(verificationCode)) {
  return NextResponse.json(...)
}
```

---

### 3. **Trial Expiration Not Checked**
**Issue:** When checking pro benefits, trial expiry is not validated

**Missing:**
- Date comparison logic in commission calculation
- Trial expiry in feature access checks

**Files to Update:**
- `src/lib/pro-trial.ts` - hasTrialExpired() function doesn't trigger automatic expiry
- All places checking `proSubscriptionActive` - also check trial dates

---

### 4. **No Cron Job for Trial Expiration**
**Issue:** Trials don't automatically expire; features won't be revoked

**Missing:**
- `/api/cron/pro-trial/expire` endpoint
- Logic to find expired trials and update user
- Email notification before expiry (day 27-28)
- Email notification on expiry
- Commission rate recalculation on expiry

**Files to Create:**
- `src/app/api/cron/pro-trial/expire/route.ts`

**Implementation:**
```typescript
// Pseudo-code
export async function GET(req: NextRequest) {
  // Find all trials where proTrialExpiresAt < now AND proTrialActivated = true
  const expiredTrials = await prisma.user.findMany({
    where: {
      proTrialActivated: true,
      proTrialExpiresAt: { lt: new Date() },
      // Don't include paid subscribers
      proSubscriptionActive: false
    }
  })
  
  // For each: send email, recalculate commission rate
}
```

---

### 5. **No Trial Status in Seller Dashboard**
**Issue:** Users won't see their trial countdown or when it expires

**Missing:**
- Seller dashboard component showing trial countdown
- Pro status card updated to show trial end date
- Reminder to subscribe before trial ends

**Files to Update:**
- `src/app/seller/dashboard/page.tsx`
- `src/components/seller/ProStatusCard.tsx` (or create new)

---

### 6. **FAQ Outdated**
**Issue:** FAQ says "No free trial" but we just added 30-day trial

**Current (Wrong):**
```tsx
<h3>Is there a free trial?</h3>
<p>No, but Pro subscriptions are permanent once purchased.</p>
```

**Should Be:**
```tsx
<h3>Is there a free trial?</h3>
<p>Yes! Every seller gets a 30-day free Pro trial. Activate it anytime from your Pro page. After 30 days, you can subscribe or revert to your current tier.</p>
```

**File to Update:**
- `src/app/seller/upgrade/page.tsx` (lines 805-820)

---

## 🟡 HIGH PRIORITY - SHOULD IMPLEMENT

### 7. **Trial Not Checked in Paid Subscription Check**
**Issue:** If someone has trial + tries to pay, unclear behavior

**Missing:**
- Handle case where user has active trial AND tries to pay
- Should prevent double-billing or show clear message

**Fix in `/api/subscriptions/pro/route.ts` POST:**
```typescript
// Check if already in active trial
if (user.proTrialActivated && user.proTrialExpiresAt && user.proTrialExpiresAt > now) {
  return NextResponse.json({
    error: 'You already have an active Pro trial. Complete it first!',
    trialExpiresAt: user.proTrialExpiresAt
  }, { status: 400 })
}
```

---

### 8. **No Trial to Subscription Transition**
**Issue:** When trial ends, unclear how to upgrade to paid

**Missing:**
- Upgrade CTA becomes visible day 29-30
- Email reminder: "Your trial ends in 2 days! Subscribe now to keep benefits"
- One-click upgrade from expiry email

**Files to Create:**
- Email template for trial expiry reminder
- Email template for trial expiry

---

### 9. **Commission Rate Recalculation on Trial Expiry**
**Issue:** Trial expires but seller's effective tier/commission doesn't update

**Missing:**
- Background job to recalculate tiers when trial expires
- Update `effectiveTier` field

**Note:** Orders placed during trial should have correct trial rate stored in OrderCommission table

---

### 10. **No Audit Trail for Trial Activation**
**Issue:** Admin can't see who activated trial, when, or if they should have

**Missing:**
- Log trial activation in an audit table
- Admin view of trial activations

**Suggested Table:**
```typescript
model ProTrialAudit {
  id        String   @id @default(cuid()) @map("_id")
  userId    String
  user      User     @relation("proTrialAudits", fields: [userId], references: [id])
  action    String   // 'ACTIVATED', 'EXPIRED', 'CONVERTED_TO_PAID', 'RESET'
  activatedAt DateTime?
  expiresAt DateTime?
  convertedToPaidAt DateTime?
  adminNote String?
  createdAt DateTime @default(now())
}
```

---

### 11. **Order Commission Not Storing Trial Status**
**Issue:** OrderCommission table doesn't record if trial was active during order

**Missing:**
- `wasProTrialActive` field in OrderCommission
- Recalc to show correct rate

---

## 🟠 MEDIUM PRIORITY - NICE TO HAVE

### 12. **No Admin Reset Trial Eligibility**
**Issue:** Admins can't reset trial for one-off cases

**Missing:**
- Admin endpoint: `DELETE /api/admin/pro-trials/[userId]`
- UI in admin panel to reset trial

---

### 13. **Trial Verification Code Not Rate Limited**
**Issue:** Attacker can spam verification requests

**Missing:**
- Rate limit: max 3 attempts per user per 15 minutes
- Lock account after 3 failed attempts
- Add to `middleware.ts` or in the route handler

---

### 14. **No Analytics on Trial Conversion**
**Issue:** No data on how many trialists convert to paid

**Missing:**
- Segment event: trial_activated, trial_expired, trial_converted_to_paid
- Analytics dashboard showing trial → paid conversion rate

---

## ✅ ALREADY IMPLEMENTED

- ✅ Prisma schema updated with trial fields
- ✅ Pro trial utility functions
- ✅ Trial activation API endpoint (GET status, POST init/verify)
- ✅ Upgrade page UI with trial sections
- ✅ GET endpoint returns trial status
- ✅ Two-step verification modal in UI

---

## 📋 IMPLEMENTATION PRIORITY ORDER

1. **MUST DO FIRST:**
   - Fix trial checks in commission calculation (affects payments)
   - Implement actual SMS/Email verification
   - Add cron job for trial expiration
   - Update FAQ

2. **DO SOON:**
   - Trial countdown in seller dashboard
   - Trial expiry email reminders
   - Prevent double-billing (trial + paid)

3. **DO EVENTUALLY:**
   - Admin trial reset
   - Audit logging
   - Rate limiting
   - Analytics

---

## 📌 SUMMARY

**Current State:** Trial UI exists but doesn't actually grant benefits or expire
**Risk:** Sellers activate trial but don't get pro features, or trial never expires

**Estimated Work:** 6-8 hours to implement all critical items
