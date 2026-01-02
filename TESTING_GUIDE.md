# Payment Tracking System - Testing Guide

## Quick Test (5 minutes)

### 1. Start the Dev Server
```bash
npm run dev
```
Server should be running on `http://localhost:3001`

### 2. Create Test Accounts
- **Buyer**: Sign up at `/auth/signup` with email: `buyer@test.com`
- **Seller**: Sign up with email: `seller@test.com`
- **Admin**: Use existing or create new admin account

### 3. Test the Full Flow

**As Seller (seller@test.com)**:
1. Go to `/upload`
2. Upload a test design
   - Title: "Test Design"
   - Price: $10 USD
   - Files: Upload any image
3. Click "Upload Design"
4. Note the design ID from URL

**As Buyer (buyer@test.com)**:
1. Go to `/designs`
2. Find "Test Design"
3. Click to view
4. Click "Add to Cart"
5. Go to `/cart`
6. Click "Proceed to Checkout"
7. Choose Paystack payment
8. Complete payment (use test card: 4111 1111 1111 1111, expiry 12/30, CVV 123)

### 4. Check Transfer Status

**As Seller (seller@test.com)**:
1. Go to `/seller/transfers`
2. You should see your transfer with status
3. Check for notifications at `/api/seller/notifications`

## Detailed Testing Scenarios

### Scenario 1: Successful Transfer

**Expected Behavior**:
```
1. Purchase completes
2. Order created in database
3. Purchase record created
4. Transfer initiated immediately
5. Transfer succeeds
6. Notification: "Payment of ₦13,000 received"
7. Status shows: SUCCESS
```

**How to verify**:
```bash
# Check transfer in database
mongosh your_database_url
> db.paystack_transfers.findOne({ paystackStatus: "SUCCESS" })

# Check notification
GET /api/seller/notifications
Response should include notification with type: "SUCCESS"
```

### Scenario 2: Failed Transfer → Automatic Retry

**To simulate failure**:
1. Create seller account but DON'T verify it
2. Make a purchase as buyer
3. Transfer will fail (unverified account)

**Expected Behavior**:
```
1. Transfer fails immediately (unverified seller)
2. Notification created: "Payment processing failed"
3. Status shows: FAILED
4. Background job checks it
5. No retry (permanent failure - unverified account)
6. Seller must verify account first
```

**How to verify**:
```bash
# Check failed transfer
GET /api/seller/transfers
# Status should be FAILED with errorMessage about verification

# Try to make seller verified and manually call cron
curl -H "x-cron-secret: your-secret" \
  http://localhost:3001/api/cron/retry-transfers
```

### Scenario 3: Test Retry with Delay

**To test retry logic manually**:

1. Modify `src/lib/transfer-service.ts` temporarily:
```typescript
// Line ~210 - change backoff minutes for testing
const backoffMinutes = Math.pow(2, transfer.retryCount) * 0.1 // 6, 12, 24 seconds instead of minutes
```

2. Create seller with invalid bank details (triggers API error)
3. Make a purchase
4. Check transfer status: FAILED
5. Wait ~6 seconds
6. Manually trigger cron:
```bash
curl -H "x-cron-secret: your-secret" \
  http://localhost:3001/api/cron/retry-transfers
```
7. Check transfer: retryCount should be 1
8. Wait ~12 seconds, trigger cron again
9. Check transfer: retryCount should be 2

**Don't forget**: Revert the backoffMinutes change before deploying!

## API Testing

### Test Transfer History Endpoint

```bash
# Get authorization token first
# Sign in via /auth/signin and capture JWT from cookies

# Then:
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:3001/api/seller/transfers
  
# Response should include:
{
  "success": true,
  "transfers": [ ... ],
  "stats": {
    "totalTransfers": 1,
    "successfulTransfers": 1,
    "failedTransfers": 0,
    "pendingTransfers": 0,
    "totalAmountUSD": 9.0,
    "totalAmountNGN": 13000
  }
}
```

### Test Notifications Endpoint

```bash
# Get recent notifications
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:3001/api/seller/notifications

# Response should include:
{
  "success": true,
  "notifications": [
    {
      "id": "...",
      "type": "SUCCESS",
      "message": "Payment of ₦13,000 received...",
      "isRead": false,
      "createdAt": "2026-01-15T..."
    }
  ],
  "unreadCount": 1
}
```

### Test Mark Notification as Read

```bash
curl -X PATCH \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "notificationId": "notif_id_here",
    "markAsRead": true
  }' \
  http://localhost:3001/api/seller/notifications

# Should return updated notification with isRead: true
```

### Test Cron Retry Endpoint

```bash
# First, set CRON_SECRET in .env.local
# CRON_SECRET=test-secret-123

# Then:
curl -H "x-cron-secret: test-secret-123" \
  http://localhost:3001/api/cron/retry-transfers

# Response:
{
  "success": true,
  "message": "Retry job completed",
  "duration": "523ms"
}

# Check logs for retry details
```

## Database Testing

### Check Transfer Records

```bash
# Connect to MongoDB
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/database"

# View all transfers
> db.paystack_transfers.find()

# View failed transfers
> db.paystack_transfers.find({ paystackStatus: "FAILED" })

# View with details
> db.paystack_transfers.findOne({ paystackStatus: "SUCCESS" }, {
  _id: 1,
  orderId: 1,
  sellerId: 1,
  amountUSD: 1,
  amountNGN: 1,
  exchangeRate: 1,
  paystackStatus: 1,
  retryCount: 1,
  createdAt: 1,
  succeededAt: 1
})
```

### Check Notifications

```bash
# View notifications for a seller
> db.transfer_notifications.find({ sellerId: "seller_user_id" })

# View unread notifications
> db.transfer_notifications.find({ 
  sellerId: "seller_user_id",
  isRead: false 
})

# Count notifications by type
> db.transfer_notifications.aggregate([
  { $match: { sellerId: "seller_user_id" } },
  { $group: { _id: "$type", count: { $sum: 1 } } }
])
```

## Debugging Checklist

When testing, verify these checklist items:

### Order Creation
- [ ] Order record created in `orders` collection
- [ ] Order status is "COMPLETED"
- [ ] Order total amount in USD
- [ ] Platform fee calculated correctly (10%)

### Purchase Creation
- [ ] Purchase record created for buyer
- [ ] `accessGranted: true`
- [ ] Correct purchase type (REGULAR or OWNERSHIP)

### Transfer Creation
- [ ] PaystackTransfer record created
- [ ] Status initially "PENDING"
- [ ] AmountUSD = sale price * 0.9 (90% to seller)
- [ ] AmountNGN calculated with live exchange rate
- [ ] ExchangeRate stored for audit trail

### Transfer Success/Failure
- [ ] Status updated to SUCCESS or FAILED
- [ ] Paystack reference stored (on success)
- [ ] Error message and reason stored (on failure)
- [ ] Notification created

### Notification
- [ ] TransferNotification record created
- [ ] Type matches outcome (SUCCESS/FAILED)
- [ ] Message is readable and informative
- [ ] isRead: false initially
- [ ] Seller can mark as read

## Common Issues & Solutions

### Issue: Transfer status shows PENDING but not updating

**Check**:
1. Is Paystack API configured? (Check PAYSTACK_SECRET_KEY)
2. Is seller account verified?
3. Does seller have valid bank details?
4. Are logs showing any errors? (Check `npm run dev` output)

**Fix**:
```bash
# Manually trigger cron to retry
curl -H "x-cron-secret: your-secret" \
  http://localhost:3001/api/cron/retry-transfers
```

### Issue: No notifications appearing

**Check**:
1. Is transfer record created? 
   ```bash
   db.paystack_transfers.find()
   ```
2. Is notification record created?
   ```bash
   db.transfer_notifications.find()
   ```
3. Is seller ID correct?
4. API permissions correct?

**Fix**:
- Check that session.user.email is set correctly
- Verify seller ID matches between tables
- Check browser console for errors

### Issue: Cron job not finding failed transfers

**Check**:
1. Are there actually failed transfers?
   ```bash
   db.paystack_transfers.find({ paystackStatus: "FAILED" })
   ```
2. Do failed transfers have retryCount < 3?
3. Has enough time passed for next retry?
4. Is CRON_SECRET set correctly?

**Fix**:
- Modify test to lower retryCount
- Clear the backoff time check temporarily for testing
- Check server logs for job execution

## Performance Testing

### Test with Multiple Transfers

```bash
# Create multiple test purchases in quick succession
# Seller: Upload 10 designs
# Buyer: Add all to cart, checkout
# This will create 10 simultaneous transfers

# Monitor:
# 1. All transfers created successfully
# 2. Notifications created for each
# 3. Dashboard loads quickly
# 4. Exchange rate fetched once (cached)
```

### Test Retry with Multiple Failures

```bash
# Create 5 failed transfers
# Run cron job
# Monitor that all are retried concurrently
# Verify no race conditions
```

## Load Testing

### Simulate High Volume

```javascript
// In a separate test file:
async function loadTest() {
  for (let i = 0; i < 100; i++) {
    // Create transfer
    await fetch('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ /* order data */ })
    })
  }
}
```

Monitor:
- Database response times
- API response times
- Memory usage
- Notification creation speed

## Success Criteria

You'll know the system is working correctly when:

✅ **Immediate Success**:
1. Purchase completes
2. Transfer status shows SUCCESS in 1-2 seconds
3. Notification appears immediately
4. Seller can view in dashboard

✅ **Retry on Failure**:
1. Failed transfer stored with error details
2. Notification says "will retry"
3. Cron job picks it up within 5 minutes
4. Retry count increments
5. Eventually succeeds or stops after 3 retries

✅ **Dashboard Display**:
1. All transfers visible
2. Stats calculate correctly
3. Filters work
4. Earnings show in both currencies
5. Responsive on mobile and desktop

✅ **Notifications API**:
1. Returns all notifications
2. Unread count correct
3. Can mark as read
4. Read timestamp updates

## Reporting Issues

If something doesn't work:

1. **Collect logs**:
   ```bash
   npm run dev > debug.log 2>&1
   ```

2. **Export data**:
   ```bash
   mongoexport --db fashionDb --collection paystack_transfers > transfers.json
   mongoexport --db fashionDb --collection transfer_notifications > notifications.json
   ```

3. **Check environment**:
   ```bash
   echo $CRON_SECRET
   echo $PAYSTACK_SECRET_KEY
   echo $DATABASE_URL
   ```

4. **Share these details**:
   - Error logs from `npm run dev`
   - Screenshots of dashboard
   - Database exports
   - Steps to reproduce

