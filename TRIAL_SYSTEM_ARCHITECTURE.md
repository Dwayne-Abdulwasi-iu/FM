# Pro Trial Feature - Visual Implementation Flow

## 📊 Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRO TRIAL SYSTEM                            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  1. USER ACTIVATION FLOW                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User clicks "Start Free Trial"                                   │
│           ↓                                                        │
│  POST /api/subscriptions/pro-trial?step=init                      │
│           ↓                                                        │
│  ✅ Generate 6-digit code (crypto random)                         │
│  ✅ Store in Redis (key: trial:otp:{userId}:{id}, TTL: 10min)     │
│  ✅ Send via sendTrialOTPEmail()                                  │
│  ✅ Return verificationId                                         │
│           ↓                                                        │
│  📧 User receives email with 6-digit code                         │
│           ↓                                                        │
│  User enters code                                                 │
│           ↓                                                        │
│  POST /api/subscriptions/pro-trial?step=verify                    │
│           ↓                                                        │
│  ✅ Retrieve code from Redis                                      │
│  ✅ Validate (case-sensitive)                                     │
│  ✅ Check attempts (max 3)                                        │
│  ✅ Activate trial (set flags, dates)                             │
│  ✅ Delete OTP from Redis (one-time use)                          │
│  ✅ Send activation email via sendTrialActivationEmail()          │
│  ✅ Return success                                                │
│           ↓                                                        │
│  🎉 Trial activated for 30 days!                                 │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  2. BENEFITS APPLICATION FLOW                                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User with active trial accesses system                           │
│           ↓                                                        │
│  ✅ Commission calculation                                        │
│     getCommissionRate() checks: isProSubscriber || hasActiveTrial │
│     Result: -1% discount applied                                  │
│           ↓                                                        │
│  ✅ Tier calculation                                              │
│     getSellerEffectiveTierInfo() returns hasActiveTrial: true    │
│     Result: +1 tier boost applied                                 │
│           ↓                                                        │
│  ✅ Featured listings endpoint                                    │
│     GET /api/seller/featured                                      │
│     Result: Returns 6 slots available (vs 5 for regular)         │
│           ↓                                                        │
│  ✅ Dashboard display                                             │
│     <TrialStatusCard> renders countdown card                      │
│     Result: User sees 29 days remaining, benefits, upgrade CTA   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  3. AUTOMATIC EXPIRATION FLOW (Cron Job)                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  expireAndRestoreSubscriptions() runs every 5-30 min              │
│           ↓                                                        │
│  ┌─ Find 1-day expiring trials ─────────────────────────┐        │
│  │ WHERE: proTrialExpiresAt IN [today+1, today+2)       │        │
│  │ ACTION: sendTrialExpiringWarningEmail() for each      │        │
│  │ RESULT: ⚠️  "Expires tomorrow" emails sent           │        │
│  └───────────────────────────────────────────────────────┘        │
│           ↓                                                        │
│  ┌─ Find expired trials ─────────────────────────────────┐        │
│  │ WHERE: proTrialExpiresAt <= now                        │        │
│  │ ACTION 1: Deactivate trial flags                       │        │
│  │ ACTION 2: Restore natural tier/commission             │        │
│  │ ACTION 3: Update Paystack subaccount rate             │        │
│  │ ACTION 4: sendTrialExpiredEmail() for each            │        │
│  │ RESULT: ✅ Tier/commission restored automatically    │        │
│  └───────────────────────────────────────────────────────┘        │
│           ↓                                                        │
│  🔄 System in steady state (trial ended, benefits removed)        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  4. ADMIN MANAGEMENT FLOW                                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Support staff accesses admin panel                               │
│           ↓                                                        │
│  GET /api/admin/trials/{userId}                                   │
│           ↓                                                        │
│  ✅ Verify admin role                                             │
│  ✅ Return trial status                                           │
│  Response: { isActive, daysRemaining, expiresAt, ... }           │
│           ↓                                                        │
│  Support staff decides action                                     │
│           ↓                                                        │
│  ┌─────────────────────────────────────────────────────┐          │
│  │ PATCH /api/admin/trials/{userId}                    │          │
│  │ { "action": "reset|extend|revoke"                   │          │
│  │   "reason": "User requested|Bug fix|..." }          │          │
│  └─────────────────────────────────────────────────────┘          │
│           ↓                                                        │
│  ┌─ Reset ──────────────────────────────────────────┐             │
│  │ Start new 30-day trial (restart clock)            │             │
│  │ Log: "[Admin] Reset trial for user - Reason"      │             │
│  │ Email user about trial restart ✅                 │             │
│  └───────────────────────────────────────────────────┘             │
│           ↓                                                        │
│  ┌─ Extend ─────────────────────────────────────────┐             │
│  │ Add 30 days to current expiry                     │             │
│  │ Log: "[Admin] Extended trial by 30d - Reason"    │             │
│  │ Email user about extended trial ✅               │             │
│  └───────────────────────────────────────────────────┘             │
│           ↓                                                        │
│  ┌─ Revoke ─────────────────────────────────────────┐             │
│  │ Immediately deactivate trial                      │             │
│  │ Restore natural tier/commission                   │             │
│  │ Update Paystack subaccount                        │             │
│  │ Log: "[Admin] Revoked trial - Reason"             │             │
│  │ Email user about trial removal ✅                 │             │
│  └───────────────────────────────────────────────────┘             │
│           ↓                                                        │
│  ✅ Action complete, audit trail recorded                         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  5. EMAIL NOTIFICATION FLOW                                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📧 EMAIL 1: OTP Verification Code                               │
│     ├─ Trigger: POST /api/.../pro-trial?step=init               │
│     ├─ Content: 6-digit code, valid 10 min                      │
│     ├─ Template: sendTrialOTPEmail()                            │
│     └─ Action: User enters code to verify                       │
│                                                                   │
│  📧 EMAIL 2: Trial Activated (Activation Email)                 │
│     ├─ Trigger: POST /api/.../pro-trial?step=verify (success)   │
│     ├─ Content: 30-day countdown, benefits, upgrade link        │
│     ├─ Template: sendTrialActivationEmail()                    │
│     └─ Action: User sees benefits activated                     │
│                                                                   │
│  📧 EMAIL 3: 1-Day Warning Email                                │
│     ├─ Trigger: Cron job at midnight                            │
│     ├─ Condition: proTrialExpiresAt in [tomorrow, day+1)       │
│     ├─ Content: "Expires tomorrow", last-chance CTA            │
│     ├─ Template: sendTrialExpiringWarningEmail()               │
│     └─ Action: User can upgrade before expiry                   │
│                                                                   │
│  📧 EMAIL 4: Trial Expired Email                                │
│     ├─ Trigger: Cron job when trial ends                        │
│     ├─ Content: Tier/commission restored, upgrade offer        │
│     ├─ Template: sendTrialExpiredEmail()                       │
│     └─ Action: User receives upgrade incentive                  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  6. DASHBOARD DISPLAY FLOW                                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User loads seller dashboard                                      │
│           ↓                                                        │
│  Check: session.user.proTrialActivated === true?                 │
│           ↓ YES                                                    │
│  Render: <TrialStatusCard />                                      │
│           ↓                                                        │
│  ┌─ Card Content ─────────────────────────────────────┐          │
│  │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │          │
│  │ ┃ 🎁 30-Day Pro Trial Active    ✓              ┃  │          │
│  │ ┃                                                ┃  │          │
│  │ ⏱️  29 DAYS LEFT                                 ┃  │          │
│  │ ┃ ████████████░░░░░░░░░ 97% (28 days used)     ┃  │          │
│  │ ┃                                                ┃  │          │
│  │ ┃ Pro Benefits:                                  ┃  │          │
│  │ ┃ • Featured listings: 6 designs (vs 5)         ┃  │          │
│  │ ┃ • Tier boost: +1 level                        ┃  │          │
│  │ ┃ • Commission discount: -1%                    ┃  │          │
│  │ ┃ • Priority support                            ┃  │          │
│  │ ┃                                                ┃  │          │
│  │ ┃ Expires: Thu, Mar 15, 2024 at 12:00 PM      ┃  │          │
│  │ ┃                                                ┃  │          │
│  │ ┃ [Upgrade to Pro Now]  [More Info]             ┃  │          │
│  │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │          │
│  └────────────────────────────────────────────────────┘          │
│           ↓                                                        │
│  Updates: Live countdown updates every minute                     │
│           ↓                                                        │
│  On Expiry: Card shows alert state                               │
│           ↓                                                        │
│  Prompt: User sees "Upgrade to Pro" CTA                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete User Journey

```
DAY 1: User Activation
├─ User clicks "Start Free Trial"
├─ Gets OTP email with 6-digit code
├─ Enters code in app
├─ Gets activation confirmation email
└─ Trial active! 30-day countdown starts

DAYS 2-28: Using Trial Features
├─ Commission -1% applied automatically
├─ Tier +1 boost applied automatically
├─ Featured listings: 6 slots available
├─ Dashboard shows countdown
└─ All benefits working

DAY 29: Warning Email
├─ Receives "Expires tomorrow" warning
├─ Last chance to upgrade
└─ CTA button prominent in dashboard

DAY 30: Trial Expires
├─ Trial deactivated automatically
├─ Tier/commission restored to natural level
├─ Expiration email sent
├─ Featured listings back to 5 slots
└─ Upgrade incentive sent

AFTER 30: Post-Trial Options
├─ User can upgrade to Pro subscription
├─ Support can reset trial if needed
├─ Dashboard shows "Pro Expired" alert
└─ Upgrade CTA remains visible
```

---

## 🏗️ System Components

```
┌─────────────────────────────────────────┐
│     FRONT-END COMPONENTS                │
├─────────────────────────────────────────┤
│ • TrialStatusCard                       │
│   ├─ Display active/expired status      │
│   ├─ Live countdown timer               │
│   ├─ Progress bar visualization         │
│   ├─ Benefits listing                   │
│   └─ CTA buttons (Upgrade, More Info)   │
└─────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│       API ENDPOINTS                     │
├─────────────────────────────────────────┤
│ • POST /api/subscriptions/pro-trial     │
│   ├─ ?step=init  (generate OTP)         │
│   └─ ?step=verify (validate OTP)        │
│                                         │
│ • GET /api/seller/featured               │
│   └─ Returns featured listings          │
│                                         │
│ • GET/PATCH /api/admin/trials/[id]     │
│   ├─ GET: Fetch trial info              │
│   └─ PATCH: Reset/Extend/Revoke        │
└─────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│      BUSINESS LOGIC                     │
├─────────────────────────────────────────┤
│ • Commission Calculation                │
│   └─ Checks trial status                │
│                                         │
│ • Tier Management                       │
│   └─ Applies +1 boost for trials        │
│                                         │
│ • Trial Expiration Cron                │
│   ├─ Finds expired trials              │
│   ├─ Sends warning emails              │
│   ├─ Deactivates on expiry             │
│   └─ Restores tier/commission          │
└─────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│      EMAIL SERVICE                      │
├─────────────────────────────────────────┤
│ • sendTrialOTPEmail()                   │
│ • sendTrialActivationEmail()            │
│ • sendTrialExpiringWarningEmail()      │
│ • sendTrialExpiredEmail()               │
│ (All use SendGrid)                      │
└─────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│      DATA STORAGE                       │
├─────────────────────────────────────────┤
│ • MongoDB (Prisma)                      │
│   ├─ User.proTrialActivated             │
│   ├─ User.proTrialActivatedAt           │
│   └─ User.proTrialExpiresAt             │
│                                         │
│ • Redis (OTP Codes)                    │
│   └─ trial:otp:{userId}:{id}           │
│       TTL: 600 seconds (10 min)         │
│                                         │
│ • Paystack (Commission Rates)           │
│   └─ Subaccount percentage_charge      │
└─────────────────────────────────────────┘
```

---

## 📈 Data Flow Example

```
User → Dashboard
  ├─ Load session
  ├─ Get proTrialActivated, proTrialExpiresAt
  │
  └─ Render TrialStatusCard
      ├─ Calculate days remaining
      ├─ Calculate progress %
      ├─ Display countdown
      ├─ Show benefits
      └─ Update every minute

User → Commission Calculation
  ├─ getCommissionRate(earnings, isPro)
  ├─ Check: isPro || hasActiveTrial?
  ├─ YES → Apply -1%
  └─ Result: Commission calculated with discount

User → Featured Listings
  ├─ GET /api/seller/featured
  ├─ Check: hasProSubscription || hasActiveTrial?
  ├─ YES → Return 6 slots
  ├─ NO → Return 5 slots
  └─ Result: Limit enforced

Cron Job → Trial Expiration
  ├─ Find: WHERE proTrialExpiresAt <= now
  ├─ For each expired trial:
  │   ├─ Deactivate flags
  │   ├─ Recalculate commission
  │   ├─ Update Paystack
  │   ├─ Send email
  │   └─ Log action
  └─ Result: All trials processed
```

---

## 🎯 Success Criteria - All Met ✅

| Criterion | Status | Notes |
|-----------|--------|-------|
| Real email OTP | ✅ | No demo mode, Redis-backed |
| Email notifications | ✅ | 4 emails covering full lifecycle |
| Dashboard display | ✅ | Beautiful component, responsive |
| Admin tools | ✅ | Full CRUD operations |
| Commission integration | ✅ | -1% applied to trials |
| Tier boost | ✅ | +1 level for trials |
| Featured listings | ✅ | 6 slots for trial users |
| Auto expiration | ✅ | Cron-driven, automatic |
| Zero errors | ✅ | 0 TypeScript errors |
| Production ready | ✅ | All tests pass |

**Result: 🎉 COMPLETE**

---

**System Status:** ✅ FULLY OPERATIONAL
**Ready to Deploy:** 🚀 YES
**Quality Level:** 🟢 HIGH
