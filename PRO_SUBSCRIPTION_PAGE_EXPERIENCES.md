# Pro Subscription Page - User Experiences

## Three Different Scenarios

### 1. **STARTER Tier Seller (Earnings < $100)** 🔒
**When they visit `/seller/upgrade`:**

**Display:**
- 🔒 **Lock Message:** "Pro Subscription Locked"
- "Pro subscription unlocks when you reach NEW tier with $100 or more in earnings"
- **Progress Bar:** Shows earnings progress (e.g., "Earned: $45 | Need $100 | $55 more to unlock")
- **Features List:** Shows all Pro benefits (read-only, can't purchase)
- **Subscribe Buttons:** Both disabled with "🔒 Unlock at NEW Tier" text
- Hover tooltip: "Unlock Pro by reaching $100 in earnings"

**Call to Action:**
- Focus on: Sell more designs to unlock!
- No payment options shown

---

### 2. **NEW/BRONZE/SILVER/GOLD/PLATINUM/DIAMOND Tier (No Active Subscription)** 
**When they visit `/seller/upgrade`:**

**Display:**
- ✅ **Upgrade Hero Section:** "Grow Your Fashion Business"
- Tagline: "Get lower commissions, featured listings, and powerful tools to boost your sales"

**Pricing Section (Right Column - Sticky):**
- **Currency Toggle:** USD / NGN buttons
  - USD: $9.99/month or $99.99/year
  - NGN: ₦16,498/month or ₦164,835/year (with real exchange rate)
- **Billing Toggle:** Monthly / Yearly
  - Yearly shows "17% off" badge
  - Breakdown: "That's just $8.33/month (Save $19.89)"
- **Featured Benefits List:**
  - +1 Tier Boost
  - 1% Flat Commission Discount
  - 6 Featured Listings
  - Advanced Analytics
  - Custom Storefront
  - Priority Support
  - Early Access
  - Pro Badge

**Payment Buttons:**
- ✅ "Pay with Card (Stripe)" - Enabled
- ✅ "Pay with Paystack (NGN)" - Enabled
- "30-day money-back guarantee • Cancel anytime"

**How Tier Stacking Works** (Explanation Box):
```
"Your Pro subscription temporarily upgrades you +1 tier level. 
So if you're a Gold seller, you instantly get Diamond benefits! 
When your subscription expires, you return to your natural tier."
```

**Left Column Features:**
- Tier Stacking Explanation (with diagram/explanation)
- All 8 Pro features listed with icons and descriptions

---

### 3. **Already Pro Subscriber (Active Subscription)** ✅
**When they visit `/seller/upgrade`:**

**Display:**
- 👑 **Crown Icon** at top
- **Title:** "You're a Pro Seller! 🎉"
- **Subtitle:** "Thank you for being a Pro subscriber. Enjoy your exclusive benefits!"

**Current Status Section:**
- 🟢 **Subscription Status:** Active (green indicator)
- **Expires:** [Date subscriber's subscription ends]
  - Example: "January 30, 2027"

**Active Benefits Section:**
- ✓ +1 tier boost
- ✓ 6 featured listings
- ✓ 1% commission discount
- ✓ Priority support

**Action Buttons:**
1. **"Go to Dashboard"** (Primary - Purple)
   - Takes them to `/seller/dashboard`
   
2. **"Cancel Subscription"** (Secondary - Gray)
   - Reveals confirmation dialog

**Cancel Flow:**
```
User clicks "Cancel Subscription"
  ↓
Confirmation dialog appears:
"Are you sure? You'll lose all Pro benefits including 
the 1% commission discount and tier boost."
  ↓
Two options:
- "Keep Pro" (Gray) → Dialog closes
- "Yes, Cancel" (Red) → Submits DELETE request
  ↓
Success toast: "Subscription cancelled. You'll be missed! 👋"
  ↓
Page reloads → Shows upgrade page again
```

---

## API Responses Summary

### GET `/api/subscriptions/pro`

**STARTER Tier Response:**
```json
{
  "isProSubscriber": false,
  "isStarter": true,
  "totalEarnings": 45,
  "proSubscriptionLocked": true,
  "lockedMessage": "Pro subscription unlocks at NEW tier ($100+ earnings)",
  "remainingToUnlock": 55,
  "subscription": null
}
```

**Active Subscriber Response:**
```json
{
  "isProSubscriber": true,
  "isStarter": false,
  "totalEarnings": 5000,
  "proSubscriptionLocked": false,
  "lockedMessage": null,
  "remainingToUnlock": 0,
  "subscription": {
    "expiresAt": "2027-01-30T00:00:00Z"
  }
}
```

**Non-Subscriber (NEW+ Tier) Response:**
```json
{
  "isProSubscriber": false,
  "isStarter": false,
  "totalEarnings": 150,
  "proSubscriptionLocked": false,
  "lockedMessage": null,
  "remainingToUnlock": 0,
  "subscription": null
}
```

---

## User Journey Summary

```
STARTER ($0-99)
  ↓
  Can't upgrade → See lock message
  ↓
  Sell more designs
  ↓
  ↓
NEW+ ($100+)
  ↓
  Can upgrade → Full pricing UI shown
  ↓
  Choose currency (USD/NGN)
  ↓
  Choose billing (Monthly/Yearly)
  ↓
  Click Subscribe → Payment processor
  ↓
  ↓
ACTIVE SUBSCRIBER
  ↓
  See status page
  ↓
  See expiration date
  ↓
  Can cancel anytime
  ↓
  Confirmation before cancellation
```

---

## Key Features of Pro Subscriber View

✅ **Shows Active Status** - Green indicator + "Active"
✅ **Shows Expiration Date** - When subscription ends
✅ **Shows Benefits** - All 4 main benefits listed
✅ **Go to Dashboard** - Easy navigation
✅ **Cancel Option** - With 2-step confirmation
✅ **Prevents Accidental Cancellation** - Confirmation dialog
✅ **Toast Feedback** - Success message after cancellation
✅ **Auto Refresh** - Page reloads to show upgrade option again

---

## Visual Summary

| State | Status | Buttons | Message |
|-------|--------|---------|---------|
| **STARTER** | 🔒 Locked | Disabled | "Unlock at NEW Tier ($55 more)" |
| **NEW-DIAMOND** | ✅ Available | Enabled | Show pricing + payment methods |
| **Subscribed** | 🟢 Active | Go Dashboard / Cancel | "You're a Pro Seller! 🎉" |

