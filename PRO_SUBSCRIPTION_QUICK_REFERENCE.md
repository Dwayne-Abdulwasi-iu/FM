# Pro Subscription - Quick Reference Card

## 🎯 What Was Built

A complete Pro subscription tier stacking system allowing sellers to:
- Pay monthly ($99.99) or yearly ($999)
- Instantly boost +1 tier level (GOLD → PLATINUM)
- Get 6 featured listings (vs 5 normally)
- Receive 1% commission discount
- Auto-revert to natural tier when subscription expires

## 📋 Files Modified/Created

### API Routes
| Path | Method | Purpose |
|------|--------|---------|
| `/api/subscriptions/pro` | GET | Check subscription status |
| `/api/subscriptions/pro` | POST | Initiate subscription (Stripe/Paystack) |
| `/api/subscriptions/pro/cancel` | DELETE | Cancel active subscription |
| `/api/cron/subscriptions/expire` | GET | Auto-expire old subscriptions |

### Webhook Handlers
| File | Events Added | Count |
|------|--------------|-------|
| `src/app/api/webhooks/stripe/route.ts` | `customer.subscription.*`, `invoice.payment_succeeded` | 4 |
| `src/app/api/webhooks/paystack/route.ts` | `charge.success` for pro subscriptions | 1 |

### Business Logic
| File | Functions | Lines |
|------|-----------|-------|
| `src/lib/tier-management.ts` | 6 new functions | 400+ |

### UI
| File | Changes |
|------|---------|
| `src/app/seller/upgrade/page.tsx` | Pricing, tier explanation, dual payment buttons |

### Database
| Model | Fields | Purpose |
|-------|--------|---------|
| User | 7 new | Subscription tracking |
| ProSubscription | 35 | Complete subscription record |

## 💰 Pricing

```
Monthly:  $99.99 USD  (~₦164,980)
Yearly:   $999 USD    (~₦1,648,350) — 17% discount
```

## 🔄 Tier Stacking Algorithm

```typescript
// 1. Get natural tier from sales
naturalTier = getCommissionTier(totalEarnings)  // GOLD

// 2. Check if Pro subscription active
isProActive = proSubscriptionActive && expiresAt > now  // true

// 3. Boost tier (+1)
effectiveTier = getEffectiveTier(naturalTier, isProActive)  // PLATINUM

// 4. Apply commission discount (1% off)
rate = getCommissionRateWithSubscription(
  totalEarnings,
  false,           // not a Pro tier seller
  isProActive      // but has active subscription
)  // 8% - 1% = 7%

// Minimum: 6% even with max discount
```

## ⚡ Key Functions in tier-management.ts

```typescript
// Get boosted tier if subscription active
getEffectiveTier(GOLD, true)  // Returns PLATINUM

// Get commission rate with subscription discount
getCommissionRateWithSubscription(100000, false, true)  // 7% vs 8.5%

// Activate subscription and update Paystack
activateProSubscription(sellerId, 'MONTHLY', 99.99, stripeId)

// Cancel subscription and restore natural tier
cancelProSubscription(sellerId, 'user_requested')

// Expire old subscriptions (cron job)
expireAndRestoreSubscriptions()

// Get seller's full tier info
getSellerEffectiveTierInfo(sellerId)
```

## 🔐 Authentication

All endpoints require NextAuth session:
```typescript
const session = await getServerSession(authOptions)
if (!session?.user?.id) return 401 Unauthorized
```

Cron endpoint requires bearer token:
```bash
Authorization: Bearer CRON_SECRET
```

## 🔗 Integration Checklist

- [ ] When processing commissions, use `getCommissionRateWithSubscription()`
- [ ] When displaying featured listings, check `proSubscriptionActive`
- [ ] When showing seller tier, use `getEffectiveTier()`
- [ ] Call cron endpoint daily: `GET /api/cron/subscriptions/expire`
- [ ] Monitor webhook logs for Stripe/Paystack events

## 📊 Database Queries

```javascript
// Find all active Pro subscribers
db.ProSubscription.find({ status: 'ACTIVE' })

// Count by billing period
db.ProSubscription.aggregate([
  { $group: { _id: '$billingPeriod', count: { $sum: 1 } } }
])

// Find expired subscriptions (for manual testing)
db.ProSubscription.find({ expiresAt: { $lt: new Date() } })

// Seller's subscription status
db.User.findOne({ id: sellerId }).select('proSubscriptionActive proSubscriptionExpiresAt')
```

## 🚀 Deployment Steps

```bash
# 1. Sync database schema
npm run db:push

# 2. Configure environment
echo "STRIPE_PRICE_PRO_MONTHLY=price_xxxxx" >> .env.local
echo "STRIPE_PRICE_PRO_YEARLY=price_xxxxx" >> .env.local
echo "CRON_SECRET=your_secret_key" >> .env.local

# 3. Test locally
npm run dev
# Visit http://localhost:3000/seller/upgrade

# 4. Deploy
npm run build
npm run start:standalone:3000

# 5. Set up daily cron job (in hosting provider)
# Daily at 00:00 UTC: GET /api/cron/subscriptions/expire?token=CRON_SECRET
```

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Property 'proSubscription' does not exist" | Run `npm run db:push` |
| Stripe checkout not loading | Check STRIPE_PRICE_PRO_* env vars |
| Webhook not firing | Verify Stripe/Paystack webhook URLs in dashboard |
| Tier not boosting | Check `proSubscriptionActive` and `proSubscriptionExpiresAt` |
| Commission not discounted | Use `getCommissionRateWithSubscription()` not `getCommissionRate()` |

## 📈 Success Metrics

Track after launch:
- New Pro subscribers per week
- Monthly Recurring Revenue (MRR)
- Churn rate (% cancellations)
- Average subscription duration
- Revenue per subscriber
- Tier upgrade rate for Pro subscribers

## 🔍 Debugging

```bash
# Check subscription status for a user
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.proSubscription.findUnique({ 
  where: { userId: 'USER_ID_HERE' }
}).then(s => console.log(s)).catch(e => console.error(e));
"

# Test Stripe webhook locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger customer.subscription.created
```

## 📞 Support Resources

- Full docs: `PRO_SUBSCRIPTION_IMPLEMENTATION.md`
- Deployment guide: `PRO_SUBSCRIPTION_DEPLOYMENT.md`
- Tier management: `src/lib/tier-management.ts` (line 301+)
- Webhook reference: See handler functions in Stripe/Paystack routes

---

**Status**: ✅ Complete & Ready
**Next**: Run `npm run db:push` to sync database schema
