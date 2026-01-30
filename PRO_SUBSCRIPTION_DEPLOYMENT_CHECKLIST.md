# Pro Subscription - Deployment Checklist

## ✅ Completed
- [x] Code audit and quality review
- [x] Fix all critical bugs (5 issues)
- [x] Fix all high priority issues (4 issues)
- [x] Add webhook idempotency protection
- [x] Add seller account validation
- [x] Verify no TypeScript errors
- [x] Document all changes

## ⏳ Next Steps

### Immediate (Required for launch)
- [ ] 1. Sync database schema
  ```bash
  npm run db:push
  ```
  This creates the `ProSubscription` model and new User fields

- [ ] 2. Configure Stripe prices
  - Go to: https://dashboard.stripe.com/products
  - Create Product "Pro Subscription"
  - Add Price: Monthly ($9.99)
  - Add Price: Yearly ($99.99)
  - Update `.env.local`:
    ```
    STRIPE_PRICE_PRO_MONTHLY=price_xxxxx
    STRIPE_PRICE_PRO_YEARLY=price_xxxxx
    ```

- [ ] 3. Set up daily expiration cron
  - Add to `.env.local`:
    ```
    CRON_SECRET=your-random-secret-here
    ```
  - Schedule `/api/cron/subscriptions/expire-daily` to run daily at midnight UTC

### Testing (Recommended before production)
- [ ] 4. Test Stripe workflow
  ```bash
  npm run dev
  # Use Stripe test mode
  # Visit: http://localhost:3000/seller/upgrade
  # Try upgrade with test card: 4242 4242 4242 4242
  ```

- [ ] 5. Test Paystack workflow
  ```bash
  # Use Paystack test mode
  # Test NGN payments if applicable
  ```

- [ ] 6. Test webhook handlers
  ```bash
  # Using Stripe CLI
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  stripe trigger payment_intent.succeeded
  ```

- [ ] 7. Test subscription expiration
  ```bash
  node scripts/test-subscription-expiration.js
  # Manually trigger: curl http://localhost:3000/api/cron/subscriptions/expire-daily
  ```

### Polish (Optional, can be deferred)
- [ ] 8. Add email notifications (medium priority #3, #4, #5)
- [ ] 9. Implement transaction support (low priority #9)
- [ ] 10. Add request rate limiting (low priority #6)

## Testing Scenarios

### Scenario 1: Basic Upgrade
```
1. Seller with 0 designs → Upgrade to Pro (USD)
2. Verify: Pro tag shows, commission rate is 7.5%
3. Check dashboard shows "Active Pro"
```

### Scenario 2: Tier Boost Validation
```
1. Seller at GOLD tier → Upgrade to Pro
2. Verify: Effective tier is PLATINUM (not GOLD)
3. Verify: Commission = PLATINUM rate (7.5%) not GOLD
```

### Scenario 3: Yearly Discount
```
1. Compare: Monthly ($9.99/mo) vs Yearly ($99.99/year)
2. Verify: Yearly shows 17% savings message
3. Annual = $120 value, so $99.99 is correct (~17% off)
```

### Scenario 4: Cancellation & Renewal
```
1. Seller cancels Pro in month 2
2. Verify: Commission reverts to tier rate
3. Can re-subscribe immediately without waiting
4. Verify: New subscription ID created
```

### Scenario 5: Webhook Retry Safety
```
1. Trigger Stripe webhook manually twice
2. Verify: Subscription only activated once
3. Check logs: "Already activated, skipping" appears
```

### Scenario 6: Expiration
```
1. Set test subscription to expire soon (manually in DB)
2. Run: npm run dev (includes cron)
3. Wait for midnight UTC or trigger manually
4. Verify: Commission rate reverted to tier rate
```

### Scenario 7: Paystack NGN
```
1. Seller in Nigeria → Upgrade to Pro (NGN)
2. Verify: ₦ pricing shows correctly
3. Verify: Paystack webhook activates subscription
```

### Scenario 8: Seller Without Account
```
1. Non-seller user → Try to upgrade
2. Verify: 403 error "You must have a seller account"
3. Only sellers can see upgrade button
```

## Verification Commands

```bash
# Check current subscriptions
npm run dev
# Then in another terminal:
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const subs = await prisma.proSubscription.findMany({
    include: { user: { select: { email: true } } }
  });
  console.table(subs);
})();
"

# Check tier commission rates
node -e "
const { getCommissionRateWithSubscription } = require('./src/lib/tier-management');
console.log('GOLD without:', getCommissionRateWithSubscription('GOLD', false));
console.log('GOLD with:', getCommissionRateWithSubscription('GOLD', true));
"
```

## Troubleshooting

### 🔴 "Seller account required" error during upgrade
**Fix**: Run `npm run db:push` to ensure `sellerAccount` field exists

### 🔴 Webhook handler errors
**Fix**: Check that Stripe webhook secret matches in `.env.local`

### 🔴 Commission rates not updating
**Fix**: Verify cron runs daily, check logs for `[Pro Subscription] Expiring subscriptions`

### 🔴 Database sync fails
**Fix**: Check `DATABASE_URL` is correct, ensure MongoDB connection works
```bash
node -e "console.log(process.env.DATABASE_URL)"
npm run db:push
```

## Success Criteria

✅ All criteria must pass before marking as complete:

- [ ] Database schema synced (ProSubscription model exists)
- [ ] Seller can upgrade to Pro monthly/yearly
- [ ] Commission rate shows 1% discount (7.5% for GOLD)
- [ ] Tier is boosted (GOLD → PLATINUM with Pro)
- [ ] Webhook events activate subscription
- [ ] Webhook retries don't create duplicates
- [ ] Cancellation restores normal commission rate
- [ ] Daily expiration job runs and restores rates
- [ ] Non-sellers cannot upgrade (403 error)
- [ ] Paystack NGN pricing works if enabled
