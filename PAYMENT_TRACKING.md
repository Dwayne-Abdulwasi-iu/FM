# Payment System Improvements - Complete Implementation

## Overview

Comprehensive payment tracking, retry system, notifications, and seller dashboard have been implemented for the fashion marketplace. This system ensures reliable seller payments with automatic retry logic and real-time status notifications.

## Components Implemented

### 1. Transfer Service (`src/lib/transfer-service.ts`)

**Purpose**: Core business logic for managing seller payments with retry and notification support

**Key Functions**:
- `initiateSellerTransfer()` - Initiates payment transfer to seller
  - Validates seller account is verified
  - Gets live USD→NGN exchange rate
  - Creates PaystackTransfer record
  - Creates or retrieves recipient code
  - Initiates transfer via Paystack API
  - Creates success/failure notifications
  - Returns detailed result with retry guidance

- `updateTransferStatus()` - Updates transfer record status
  - Sets paystackStatus (PENDING, SUCCESS, FAILED)
  - Records Paystack reference and error details
  - Updates timestamps

- `createTransferNotification()` - Creates seller notifications
  - Types: SUCCESS, FAILED, PENDING, RETRY
  - Readable by sellers via API

- `retryFailedTransfers()` - Background job to retry failed transfers
  - Runs periodically via cron
  - Exponential backoff: 5, 10, 20 minutes between retries
  - Max 3 retries per transfer
  - Updates retry count and creates new notifications

### 2. Database Models (Updated Prisma Schema)

**PaystackTransfer Model**:
```prisma
model PaystackTransfer {
  id              String
  orderId         String        // Order triggering transfer
  designId        String        // Design being paid for
  sellerId        String        // Seller receiving payment
  seller          User          // Relation to user
  
  amountUSD       Float         // Seller's 90% share
  amountNGN       Float         // Converted amount
  exchangeRate    Float         // Rate used for conversion
  
  paystackReference String?     // Paystack's transfer reference
  paystackStatus  String        // PENDING, SUCCESS, FAILED
  
  retryCount      Int @default(0)   // 0-3 retry attempts
  maxRetries      Int @default(3)   // Maximum retries
  lastRetryAt     DateTime?         // Last retry timestamp
  
  errorMessage    String?           // Error if failed
  failureReason   String?           // Detailed reason
  
  createdAt       DateTime
  updatedAt       DateTime
  succeededAt     DateTime?
}
```

**TransferNotification Model**:
```prisma
model TransferNotification {
  id        String
  transferId String
  sellerId  String
  seller    User
  
  type      String    // SUCCESS, FAILED, PENDING, RETRY
  message   String    // Notification text
  isRead    Boolean @default(false)
  
  createdAt DateTime
  readAt    DateTime?
}
```

### 3. API Endpoints

#### GET `/api/seller/transfers` - View Transfer History
**Authentication**: Required (SELLER or ADMIN role)

**Response**:
```json
{
  "success": true,
  "transfers": [
    {
      "id": "transfer_123",
      "orderId": "order_456",
      "designId": "design_789",
      "amountUSD": 9.00,
      "amountNGN": 13000,
      "exchangeRate": 1444.44,
      "paystackStatus": "SUCCESS",
      "paystackReference": "payout_abc123xyz",
      "retryCount": 0,
      "createdAt": "2026-01-15T10:30:00Z",
      "succeededAt": "2026-01-15T10:32:15Z"
    }
  ],
  "stats": {
    "totalTransfers": 45,
    "successfulTransfers": 42,
    "failedTransfers": 2,
    "pendingTransfers": 1,
    "totalAmountUSD": 405.00,
    "totalAmountNGN": 585000
  }
}
```

#### GET `/api/seller/notifications` - Fetch Notifications
**Authentication**: Required

**Query Parameters**:
- None (fetches last 20 notifications for authenticated user)

**Response**:
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notif_123",
      "type": "SUCCESS",
      "message": "Payment of ₦13,000 received for 'Sunset Gradient Design'",
      "isRead": false,
      "createdAt": "2026-01-15T10:32:15Z",
      "readAt": null
    }
  ],
  "unreadCount": 3
}
```

#### PATCH `/api/seller/notifications` - Mark Notification as Read
**Authentication**: Required

**Request Body**:
```json
{
  "notificationId": "notif_123",
  "markAsRead": true
}
```

#### GET `/api/cron/retry-transfers` - Background Retry Job
**Authentication**: Via `x-cron-secret` header
**Expected Secret**: Value of `CRON_SECRET` environment variable

**Response**:
```json
{
  "success": true,
  "message": "Retry job completed",
  "duration": "523ms"
}
```

### 4. Seller Dashboard Page (`src/app/seller/transfers/page.tsx`)

**Features**:
- Summary cards showing total/successful/pending/failed transfers
- Total earnings display in NGN and USD
- Filter transfers by status (All, Successful, Pending, Failed)
- Responsive table showing:
  - Transfer date
  - Amount in NGN and USD
  - Status with color-coded icons
  - Paystack reference (truncated)
  - Retry count
- Helpful information about the payment system
- Auto-refreshes data on mount
- Error handling with user-friendly messages

**Design**:
- Clean, modern interface using Tailwind CSS
- Lucide React icons for status indicators
- Responsive grid layout (1 column mobile, flexible desktop)
- Color coding: Green=Success, Yellow=Pending, Red=Failed

### 5. Paystack Webhook Updates (`src/app/api/webhooks/paystack/route.ts`)

**Changes**:
- Replaced inline transfer logic with `initiateSellerTransfer()` service call
- All seller transfers now tracked in PaystackTransfer model
- Automatic failure notification to sellers
- Consistent error handling and logging
- Exchange rate conversion centralized via transfer service

**Flow**:
```
Webhook received
  ↓
Create Order + Purchase records
  ↓
For each design sold:
    → Call initiateSellerTransfer()
      → Validates seller
      → Gets live exchange rate
      → Creates transfer record
      → Attempts transfer
      → Creates notification
```

## Configuration

### Environment Variables Required

Add to `.env`:
```bash
# Cron job protection (generate with: openssl rand -base64 32)
CRON_SECRET=your_random_secret_here

# MongoDB (already configured)
DATABASE_URL=mongodb+srv://...

# Paystack (already configured)
PAYSTACK_SECRET_KEY=sk_live_...
```

### Scheduling the Retry Job

Use an external cron service (Vercel Cron, Easycron, AWS Lambda, etc.):

**URL**: `https://yoursite.com/api/cron/retry-transfers`
**Headers**: `x-cron-secret: your_random_secret_here`
**Frequency**: Every 5 minutes

**Vercel Cron Example** (add to `vercel.json`):
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

## How It Works

### Payment Flow with Retry System

1. **Customer Purchases Design**
   - Checkout initiates payment
   - Paystack processes payment
   - Webhook receives charge.success event

2. **Order Creation**
   - Order created in database
   - Cart items marked as purchased
   - Purchase records created for download access

3. **Seller Transfer (NEW)**
   ```
   initiateSellerTransfer() called
   ├── Verify seller account exists & verified
   ├── Get live USD→NGN exchange rate
   ├── Create PaystackTransfer record (PENDING)
   ├── Create/retrieve recipient code
   ├── Initiate transfer via Paystack
   ├── On SUCCESS:
   │   └── Update record (SUCCESS, save reference)
   │   └── Create SUCCESS notification
   └── On FAILURE:
       └── Update record (FAILED, error details)
       └── Create FAILED notification
       └── Will be retried by background job
   ```

4. **Automatic Retry (Background Job)**
   ```
   Every 5 minutes:
   ├── Find FAILED transfers with retryCount < 3
   ├── Check exponential backoff time has passed
   │   └── 1st retry: 5 minutes
   │   └── 2nd retry: 10 minutes
   │   └── 3rd retry: 20 minutes
   ├── Attempt transfer again
   ├── On SUCCESS: Update record, create notification
   └── On FAILURE: Update retry count, try again later
   ```

5. **Seller Receives Notification**
   - SUCCESS: Shows ₦amount received for design name
   - FAILED: Shows payment processing failed, will retry
   - RETRY: Shows retry successful
   - Seller can view transfer history in dashboard

## Error Handling

### Failure Scenarios Handled

1. **Unverified Seller Account**
   - Status: FAILED
   - Reason: "Seller account not verified"
   - Retry: No (permanent failure)
   - Action: Seller must verify account first

2. **Recipient Code Creation Failed**
   - Status: FAILED
   - Reason: Bank details error (invalid account, etc.)
   - Retry: Yes (exponential backoff)
   - Action: Seller can update bank details and manual retry

3. **Paystack Transfer API Error**
   - Status: FAILED
   - Reason: Specific API error message
   - Retry: Yes (up to 3 times)
   - Action: Automatic retry with backoff

4. **Network/Timeout Issues**
   - Status: FAILED (after timeout)
   - Reason: Connection error
   - Retry: Yes (automatic retry)
   - Action: Transparent to seller, handled automatically

## Key Features

✅ **Automatic Retries**: Failed transfers automatically retry with exponential backoff
✅ **Live Exchange Rates**: Uses actual market rates, cached for 1 hour
✅ **Seller Notifications**: Real-time alerts of transfer status changes
✅ **Transfer Tracking**: Complete history of all payments to sellers
✅ **Dashboard**: Sellers can view transfer status and earnings summary
✅ **Error Details**: Clear error messages for troubleshooting
✅ **Scalable**: Handles multiple sellers and concurrent transfers
✅ **Database Tracked**: All transfers logged with complete audit trail

## Testing

### Manual Testing Transfer Endpoint

```bash
# View your transfers
curl -H "Authorization: Bearer YOUR_JWT" \
  https://localhost:3001/api/seller/transfers

# View your notifications
curl -H "Authorization: Bearer YOUR_JWT" \
  https://localhost:3001/api/seller/notifications

# Mark notification as read
curl -X PATCH \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"notificationId":"abc123","markAsRead":true}' \
  https://localhost:3001/api/seller/notifications

# Test retry job (requires CRON_SECRET)
curl -H "x-cron-secret: your_secret" \
  https://localhost:3001/api/cron/retry-transfers
```

### Simulating Transfer Failures

For testing retry logic:
1. Set seller account to unverified
2. Make a purchase
3. Observe FAILED transfer in transfer history
4. Fix account verification
5. Wait 5 minutes or call cron endpoint manually
6. Observe transfer retries and succeeds

## Monitoring

### Key Metrics to Track

- **Transfer Success Rate**: `successfulTransfers / totalTransfers`
- **Average Retry Count**: `sum(retryCount) / failedTransfers`
- **Time to Success**: Average time from initial attempt to success (including retries)
- **Failed Transfers Requiring Manual Intervention**: Transfers that failed 3 times

### Alerts to Set Up

1. **High Failure Rate**: If > 10% of transfers fail
2. **Recipient Code Issues**: If errors mention "recipient"
3. **Exchange Rate Service Down**: If rate fetching fails repeatedly

## Future Enhancements

- [ ] Email notifications to sellers about transfer status
- [ ] SMS notifications for successful high-value transfers
- [ ] Webhook notifications to seller apps
- [ ] Analytics dashboard for platform ops team
- [ ] Bulk retry UI for admin dashboard
- [ ] Transfer history CSV export
- [ ] Scheduled transfer batching (transfer once daily vs immediate)
- [ ] Manual transfer initiation for admin

## Related Documentation

- [Exchange Rate System](../EXCHANGE_RATES.md) - Live rate fetching and caching
- [Paystack Integration](../PAYSTACK_SETUP.md) - Payment gateway setup
- [Database Schema](../../prisma/schema.prisma) - Full data models
- [Webhook Handlers](./webhooks/) - Payment event processing

