# Setup Cron Job for Seller Payouts

## Overview
Your system now automatically:
1. **Calculates seller payout** when buyer pays (90% of order value)
2. **Schedules release** for 2 days after delivery confirmation
3. **Releases automatically** via daily cron job
4. **Notifies sellers** via email when funds are available

## Cron Job Options

### Option 1: EasyCron (Easiest)

**Steps:**
1. Go to https://www.easycron.com/user/register (free account)
2. Click "Create Cron Job"
3. Fill in:
   - **URL:** `https://your-production-domain.com/api/cron/process-payouts`
   - **HTTP Method:** GET
   - **Cron Expression:** `0 2 * * *` (Daily at 2:00 AM UTC)
   - Add Custom Headers:
     - **Header Name:** `Authorization`
     - **Header Value:** `Bearer YOUR_CRON_SECRET`

4. Save and verify it shows "OK"

**Cost:** Free (up to 10 free jobs)

---

### Option 2: GitHub Actions (Free, Integrated)

**Create file:** `.github/workflows/process-payouts.yml`

```yaml
name: Process Seller Payouts
on:
  schedule:
    # Run daily at 2:00 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:  # Allow manual trigger

jobs:
  process_payouts:
    runs-on: ubuntu-latest
    steps:
      - name: Process scheduled payouts
        run: |
          curl -X GET https://your-production-domain.com/api/cron/process-payouts \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

**Setup:**
1. Create `.github/workflows/process-payouts.yml` in your repo
2. Go to GitHub → Settings → Secrets and Variables → Actions
3. Create new secret: `CRON_SECRET` = your secret value
4. Push the workflow file
5. Go to Actions tab to see it running

**Cost:** Free

---

### Option 3: Render (If Deployed on Render)

**In your `render.yaml`:**

```yaml
services:
  - type: cron
    name: process-payouts
    runtime: docker
    dockerfilePath: ./Dockerfile
    schedule: '0 2 * * *'
    command: 'curl -X GET https://your-app.onrender.com/api/cron/process-payouts -H "Authorization: Bearer $CRON_SECRET"'
    envVars:
      - key: CRON_SECRET
        scope: build
        value: YOUR_SECRET_KEY
```

**Cost:** Free tier available, $7+/month for premium

---

### Option 4: AWS EventBridge (Advanced)

**Steps:**
1. AWS Console → EventBridge → Create Rule
2. Name: `ProcessSellerPayouts`
3. Schedule expression: `cron(0 2 * * ? *)` (Daily 2 AM UTC)
4. Target: HTTPS endpoint
   - **URL:** `https://your-production-domain.com/api/cron/process-payouts`
   - **Method:** GET
   - **Headers:** `Authorization: Bearer YOUR_CRON_SECRET`
5. Save

**Cost:** Free tier (14.2M requests/month), then $0.40 per million events

---

## Step 1: Set CRON_SECRET

### Production (Render, Vercel, etc.)

**Render:**
1. Dashboard → Your App → Environment
2. Add Variable:
   - **Key:** `CRON_SECRET`
   - **Value:** Generate random: `openssl rand -hex 32`

**Vercel:**
1. Project Settings → Environment Variables
2. Add:
   - **Name:** `CRON_SECRET`
   - **Value:** Random secret

**Other Hosts:**
- Use their environment variable dashboard
- Generate secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Local Testing

```bash
# In .env.local (won't be committed)
CRON_SECRET=test-secret-12345
```

---

## Step 2: Test the Cron Job Manually

**Using curl:**

```bash
curl -X GET http://localhost:3000/api/cron/process-payouts \
  -H "Authorization: Bearer test-secret-12345"
```

**Expected response:**

```json
{
  "success": true,
  "message": "Payouts processed",
  "result": {
    "processed": 5,
    "failed": 0,
    "errors": []
  }
}
```

---

## Step 3: Verify It's Working

### Check Database

```bash
# Connect to MongoDB
# Query for payouts released today
db.boutique_orders.find({
  paymentStatus: "PAYOUT_RELEASED",
  payoutReleasedAt: {
    $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
  }
}).count()
```

### Check Seller Notifications

Sellers should receive emails:
- Subject: `💰 Payout Released: ₦13,500 from Order #BOT-2024-XXXX`
- Content: Breakdown of charges and bank transfer info

---

## Frequency Recommendations

| Volume | Frequency | Cron |
|--------|-----------|------|
| **Low** (<10 orders/day) | Daily | `0 2 * * *` |
| **Medium** (10-100/day) | Twice daily | `0 2,14 * * *` |
| **High** (100+/day) | Every 6 hours | `0 */6 * * *` |
| **Very High** (1000+/day) | Every hour | `0 * * * *` |

---

## Current Configuration

Your system is set to:
- **Hold period:** 2 days
- **Return window:** 7 days after delivery
- **Automatic notifications:** Seller gets email when payout released

---

## What Happens When Cron Runs

```
1. GET /api/cron/process-payouts?Authorization=Bearer SECRET

2. Server checks:
   - CRON_SECRET valid?
   - Find orders with paymentStatus = 'PAYOUT_SCHEDULED'
   - Filter: payoutScheduledAt <= today

3. For each order:
   - Update paymentStatus → 'PAYOUT_RELEASED'
   - Set payoutReleasedAt = now
   - Increment seller's totalEarnings
   - Send email to seller
   - Deduct storage fees if applicable

4. Return summary:
   {
     "processed": 5,
     "failed": 0,
     "errors": []
   }
```

---

## Monitoring

### Set Up Email Alerts

**File:** `src/app/api/cron/process-payouts/route.ts`

```typescript
// Add after processing
if (result.failed > 0) {
  // Send admin alert email
  await sendEmail({
    to: 'admin@platform.com',
    subject: `⚠️ Payout Processing Failed: ${result.failed} errors`,
    html: `
      <p>Processed: ${result.processed}</p>
      <p>Failed: ${result.failed}</p>
      <p>Errors:</p>
      <ul>
        ${result.errors.map(e => `<li>${e}</li>`).join('')}
      </ul>
    `
  });
}
```

### Create Dashboard Widget

Show sellers:
```
Next Payout Release
├─ Days remaining: 1
├─ Amount: ₦13,500
├─ Expected date: Jan 25, 2026
└─ Status: ⏳ Scheduled
```

---

## Troubleshooting

### "CRON_SECRET not configured"

**Fix:**
```bash
# Verify environment variable is set
echo $CRON_SECRET  # Should show value

# In production dashboard, check variable exists
# Restart app after setting environment variable
```

### "Unauthorized" Error

**Check:**
1. Is Authorization header present?
2. Does bearer token match CRON_SECRET?
3. Is it `Bearer SECRET` (with space)?

```bash
# Test with correct format
curl -H "Authorization: Bearer YOUR_SECRET_HERE" \
  https://your-app.com/api/cron/process-payouts
```

### Payouts Not Processing

**Check:**
1. Are there orders with `paymentStatus = 'PAYOUT_SCHEDULED'`?
2. Is `payoutScheduledAt` in the past (2+ days ago)?
3. Are there PENDING returns blocking release?

```js
// Debug query
db.boutique_orders.find({
  paymentStatus: "PAYOUT_SCHEDULED",
  payoutScheduledAt: { $lte: new Date() }
})
```

### Sellers Not Getting Emails

**Verify:**
1. Is `SENDGRID_API_KEY` set (or SMTP configured)?
2. Is seller's email in database?
3. Check application logs for email errors

---

## Security Best Practices

1. **Rotate CRON_SECRET monthly**
   ```bash
   # Generate new secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Update in all cron services
   ```

2. **Monitor cron job hits**
   ```typescript
   // Log in processScheduledPayouts
   console.log(`[CRON] Started at ${new Date().toISOString()}`);
   console.log(`[CRON] Processed ${result.processed} payouts`);
   ```

3. **Rate limit the endpoint** (already in middleware.ts)
   ```typescript
   // Only cron services should call this
   // Limit to 1 per minute
   ```

4. **Whitelist IPs** (Advanced)
   - If using EasyCron: Only allow their IPs
   - If using GitHub Actions: Only allow GitHub IPs

---

## Testing Checklist

- [ ] CRON_SECRET set in production
- [ ] Cron service configured (EasyCron/GitHub Actions/Render)
- [ ] Manual test: `curl ... /api/cron/process-payouts`
- [ ] Check database for `PAYOUT_RELEASED` orders
- [ ] Seller received email notification
- [ ] Check seller's `totalEarnings` increased
- [ ] Verify error handling works (try with wrong secret)

---

## Summary

✅ Database updated with payoutScheduledAt & payoutReleasedAt
✅ Cron endpoint ready at `/api/cron/process-payouts`
✅ 2-day hold configured
✅ Seller notifications ready
⏳ **Choose a cron service above and configure**

**Recommended:** Start with EasyCron (easiest) or GitHub Actions (if already on GitHub)
