# Payment Retry System Setup Guide

## Quick Start

The payment transfer retry system has been fully implemented and is ready to use. Here's what you need to do:

### 1. Enable the Retry Cron Job

The system automatically retries failed transfers using a background job. To enable it:

#### Option A: Vercel Cron (Recommended)

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/retry-transfers",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Then deploy to Vercel.

#### Option B: External Cron Service

Use any cron service (Easycron, AWS Lambda, etc.) to call:
```
GET https://yourdomain.com/api/cron/retry-transfers
Header: x-cron-secret: [your_CRON_SECRET_value]
```

Schedule: Every 5 minutes

#### Option C: Local Development (Manual)

Test the retry system manually:
```bash
# Run this in a terminal while dev server is running
curl -H "x-cron-secret: your-secret-here" \
  http://localhost:3001/api/cron/retry-transfers
```

### 2. Set Environment Variable

Add to `.env.local`:
```bash
# Generate with: openssl rand -base64 32 (or any random string)
CRON_SECRET=your_random_secret_here
```

### 3. Verify Database Models

Migrations are automatically handled by Prisma. The new models are:
- `PaystackTransfer` - Tracks all seller payment transfers
- `TransferNotification` - Notifications to sellers

✅ Already in schema.prisma and ready to use

### 4. Test the System

1. **Make a test purchase**:
   - Sign in as buyer
   - Add a design to cart
   - Checkout with Paystack

2. **View transfer status**:
   - Sign in as seller
   - Go to `/seller/transfers`
   - You'll see the transfer listed

3. **Check notifications**:
   - API: `GET /api/seller/notifications`
   - You should see a SUCCESS or FAILED notification

### 5. Optional: Set Up Email Notifications

To add email notifications when transfers complete (future enhancement):

```typescript
// In transfer-service.ts, after creating notification:
await sendEmail({
  to: sellerEmail,
  subject: 'Payment Received',
  template: 'transfer-success',
  data: {
    amount: amountNGN,
    designTitle,
    reference: paystackReference
  }
})
```

## System Flow

```
Purchase Completed
        ↓
Webhook Triggers
        ↓
initiateSellerTransfer() called
        ↓
    ┌───┴───┐
    ↓       ↓
SUCCESS   FAILED
    ↓       ↓
  ✅       Notification: "Will retry"
Created   Stored in DB
    ↓       ↓
Noti:       ↓ (5 minutes later)
"₦13k   Cron Job Retries
rcvd"   Max 3 times with backoff
        ↓
        ✅ or ❌ Final Status
```

## Retry Logic

**Exponential Backoff Schedule**:
- 1st failure → Retry after 5 minutes
- 2nd failure → Retry after 10 minutes
- 3rd failure → Retry after 20 minutes
- 4th+ failure → Stops (manual intervention needed)

**Failure Reasons**:
- ✗ Unverified seller account → NO RETRY (seller must verify first)
- ✗ Invalid bank details → RETRY (seller can fix and auto-retry)
- ✗ API error → RETRY (transient issue)
- ✗ Network timeout → RETRY (automatic)

## Monitoring

### Check Recent Transfers
```bash
# In DB shell:
db.paystack_transfers.find({ createdAt: { $gte: ISODate("2026-01-15") } })

# By status:
db.paystack_transfers.find({ paystackStatus: "FAILED" })
```

### Check for Stuck Transfers
```bash
# Transfers that failed 3 times and need manual help:
db.paystack_transfers.find({
  paystackStatus: "FAILED",
  retryCount: { $gte: 3 }
})
```

### Monitor Success Rate
```bash
# In MongoDB:
db.paystack_transfers.aggregate([
  { $group: {
    _id: "$paystackStatus",
    count: { $sum: 1 }
  }}
])
```

## Troubleshooting

### "Cron job not running"
Check:
1. `CRON_SECRET` is set in environment
2. The endpoint is publicly accessible
3. Cron service configuration is correct
4. Check logs: `npm run dev` should show cron calls

### "Transfer still showing FAILED after cron runs"
Check:
1. Is seller account verified? (Required for transfer)
2. Are bank details valid?
3. Is Paystack API working? (Check Paystack logs)
4. Run manual cron: `curl -H "x-cron-secret: ..." http://localhost:3001/api/cron/retry-transfers`

### "No notifications appearing"
Check:
1. Notifications API accessible: `GET /api/seller/notifications`
2. Database has TransferNotification records
3. Seller ID matches between transfer and notification

## API Reference

### View Transfer History
```bash
GET /api/seller/transfers
Authorization: Bearer {jwt_token}
```

Response includes:
- All transfers with status
- Summary stats (successful, failed, pending)
- Total earnings in NGN and USD

### View Notifications
```bash
GET /api/seller/notifications
Authorization: Bearer {jwt_token}
```

Response includes:
- Recent notifications (last 20)
- Unread count
- Each notification has type and message

### Mark Notification as Read
```bash
PATCH /api/seller/notifications
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "notificationId": "notif_123",
  "markAsRead": true
}
```

### Manual Retry Job Trigger
```bash
GET /api/cron/retry-transfers
x-cron-secret: {CRON_SECRET}
```

Response: Job execution status and duration

## Files Modified

- ✅ `src/lib/transfer-service.ts` - New (transfer logic)
- ✅ `src/app/api/seller/transfers/route.ts` - New (transfer API)
- ✅ `src/app/api/seller/notifications/route.ts` - New (notifications API)
- ✅ `src/app/api/cron/retry-transfers/route.ts` - New (retry job)
- ✅ `src/app/seller/transfers/page.tsx` - New (seller dashboard)
- ✅ `src/app/api/webhooks/paystack/route.ts` - Updated (uses transfer service)
- ✅ `prisma/schema.prisma` - Updated (new models)

## What's Included

- ✅ Automatic transfer retry system
- ✅ Seller notifications
- ✅ Transfer history tracking
- ✅ Seller dashboard
- ✅ Retry job with exponential backoff
- ✅ Real-time status updates
- ✅ Error tracking and recovery

## No Manual Setup Required

The system is:
- ✅ Pre-configured with sensible defaults
- ✅ Using live exchange rates (cached 1 hour)
- ✅ Storing all data in MongoDB
- ✅ Using Paystack for transfers

Just set `CRON_SECRET` and configure the retry job schedule!

