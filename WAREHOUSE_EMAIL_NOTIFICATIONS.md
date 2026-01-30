# 📧 Warehouse Email Notification System - Complete Guide

**Status**: ✅ FULLY IMPLEMENTED & TESTED  
**Email Functions**: 6 Templates  
**Integration Points**: 4 (Cron + Repost Approval/Rejection)

---

## 📨 Email Notifications Overview

### Timeline of Notifications

```
Day 0       Product received in warehouse
            ↓
Day 1-119   Waiting period (no notifications)
            ↓
Day 120     📧 MONTH 5 ALERT SENT
            (last 60 days to act)
            ↓
Day 120-179 SELLER CAN REPOST
            (max 3/day, each costs 1 unit)
            ↓
Day 173     📧 FINAL WARNING SENT
            (7 days before auto-deduction)
            ↓
Day 180     📧 DEDUCTION CONFIRMATION SENT
            (1 unit removed)
            Auto-deduct at cycle boundary
            Cycle resets: Day 180 → "Day 0" of new cycle
            ↓
Day 181-359 Waiting for next Month 5
            ↓
Day 300     📧 MONTH 5 ALERT SENT AGAIN
            (Day 120 of new 180-day cycle)
            ↓
...         Pattern repeats until stock = 0
            ↓
When All Stock = 0:
            📧 PRODUCT DELISTED SENT
```

---

## 📧 Notification #1: Month 5 Warning (Day 120)

**When**: Day 120 of any 180-day cycle  
**To**: Seller email address  
**Function**: `sendMonth5WarehouseNotification()`

### Email Contents
```
Subject: ⏰ Action Needed: [Product Name] Entering Month 5 of Storage

Key Info:
- Days in warehouse: 120/180
- Current stock: X units
- Days until deduction: 60
- Reposts available today: 3

CTA Button: "View Warehouse Dashboard"

What's Explained:
✓ Why they're getting this email
✓ What happens at Day 180 (automatic -1 unit)
✓ How to repost (reset countdown)
✓ Cost of reposting (1 unit)
✓ Options: repost, reduce price, monitor, or let it deduct
```

### Code Integration
```typescript
// In processWarehouseDeductions():
if (daysInCurrentCycle === MONTH_5_START_DAY && !product.month5NotificationSent) {
  const sent = await sendMonth5WarehouseNotification({
    sellerName: product.seller.name,
    sellerEmail: product.seller.email,
    productTitle: product.title,
    productId: product.id,
    daysInWarehouse: 120,
    currentStock: totalStock,
    cycleEndDay: 180,
    repostsRemaining: repostsToday
  })
  
  if (sent) {
    await prisma.boutiqueProduct.update({
      where: { id: product.id },
      data: { month5NotificationSent: true }
    })
  }
}
```

---

## 📧 Notification #2: Final Warning (Day 173)

**When**: Day 173 (7 days before deduction)  
**To**: Seller email address  
**Function**: `sendWarehouseFinalWarning()`

### Email Contents
```
Subject: 🚨 URGENT: [Product Name] - 7 Days Until Stock Deduction

Design: Red border, urgent styling

Key Info:
- Days until deduction: 7 (COUNTDOWN)
- Current stock: X units
- Days in warehouse: 173/180

CTA Button: "Repost Now - Don't Lose Stock!" (bright red)

What's Explained:
⚠️ Last chance to take action
✓ You can still repost and reset countdown
✓ Each repost costs 1 unit
✓ Without action, 1 unit deducts automatically
✓ Product stays LIVE but with reduced inventory
```

### Code Integration
```typescript
// In processWarehouseDeductions():
if (daysInCurrentCycle === 173) {
  const sent = await sendWarehouseFinalWarning({
    sellerName: product.seller.name,
    sellerEmail: product.seller.email,
    productTitle: product.title,
    productId: product.id,
    daysInWarehouse: 173,
    daysUntilDeduction: 7,
    currentStock: totalStock
  })
}
```

---

## 📧 Notification #3: Stock Deduction Confirmation (Day 180)

**When**: Stock deducted at Day 180, 360, 540, etc.  
**To**: Seller email address  
**Function**: `sendWarehouseDeductionConfirmation()`

### Email Contents
```
Subject: Stock Deduction Processed: [Product Name]

Design: Informational, blue border

Key Info:
- Days in warehouse: 180 (or 360, 540, etc.)
- Units deducted: 1
- Remaining stock: X units
- Status: LIVE (Cycle Reset)

What's Explained:
✓ Automatic deduction completed
✓ Why: Offset return shipping costs
✓ Your product remains LIVE
✓ New 180-day countdown started
✓ You can repost again in Month 5 of next cycle

Special Alert (if remaining stock ≤ 1):
⚠️ Low Stock Warning
  "Consider pricing adjustments or marketing"
```

### Code Integration
```typescript
// In processWarehouseDeductions():
if (daysInCurrentCycle === 0 && daysInWarehouse >= WAREHOUSE_CYCLE_DAYS) {
  // Deduct stock for each variant...
  
  if (newTotalStock > 0) {
    await sendWarehouseDeductionConfirmation({
      sellerName: product.seller.name,
      sellerEmail: product.seller.email,
      productTitle: product.title,
      productId: product.id,
      daysInWarehouse: 180,
      stockDeducted: 1,
      remainingStock: newTotalStock
    })
  }
}
```

---

## 📧 Notification #4: Product Delisted (Stock = 0)

**When**: All stock depleted (after multiple cycles)  
**To**: Seller email address  
**Function**: `sendWarehouseProductDelistedNotification()`

### Email Contents
```
Subject: Product Delisted: [Product Name]

Design: Purple border, informational

Key Info:
- Days stored: 360+ (multiple cycles)
- Reason: All inventory depleted
- Status: DELISTED

What's Explained:
✓ Why: After multiple 180-day cycles with deductions
✓ Stock reached 0
✓ Product no longer LIVE
✓ Can upload again anytime

CTA Button: "Back to Dashboard"

Closing Message:
"You can reupload this product or create new listings whenever you're ready.
Thank you for using Fashion Marketplace!"
```

### Code Integration
```typescript
// In processWarehouseDeductions():
if (newTotalStock <= 0) {
  await prisma.boutiqueProduct.update({
    where: { id: product.id },
    data: { status: 'DELISTED_BY_STORAGE' }
  })
  
  await sendWarehouseProductDelistedNotification({
    sellerName: product.seller.name,
    sellerEmail: product.seller.email,
    productTitle: product.title,
    productId: product.id,
    daysInWarehouse: daysInWarehouse,
    reason: 'out_of_stock'
  })
}
```

---

## 📧 Notification #5: Repost Approved

**When**: Admin approves repost request  
**To**: Seller email address  
**Function**: `sendRepostApprovedNotification()`

### Email Contents
```
Subject: ✅ Repost Approved: [Product Name]

Design: Green border, success styling

Key Info:
- Original stock: X units
- New stock: X-1 units
- Units deducted: 1
- Countdown: RESET to Day 0

What Happened:
✓ Your repost request approved
✓ Stock deducted by 1 unit
✓ Product stays LIVE
✓ 180-day countdown reset
✓ You can repost again at Day 120 of next cycle

CTA Button: "View Warehouse Dashboard"

Timeline Explained:
"Your product now enters a new 180-day storage cycle.
You'll receive a notification at Day 120 if you want to repost again."
```

### Code Integration
```typescript
// In approveRepostRequest():
await sendRepostApprovedNotification({
  sellerName: request.seller.name,
  sellerEmail: request.seller.email,
  productTitle: request.product.title,
  productId: request.productId,
  originalStock: request.originalStock,
  newStock: request.requestedStock,
  stockDeducted: originalStock - newStock,
  daysReset: true
})
```

**Trigger Points**:
- Admin reviews repost in `/app/admin/boutique/repost-approvals`
- Clicks "Approve" button
- Calls API: `PATCH /api/boutique/admin/repost-requests`
- Email sent in approveRepostRequest() function

---

## 📧 Notification #6: Repost Rejected

**When**: Admin rejects repost request  
**To**: Seller email address  
**Function**: `sendRepostRejectedNotification()`

### Email Contents
```
Subject: Repost Request Declined: [Product Name]

Design: Orange border, informational

Key Info:
- Request status: DECLINED
- Action: Stock unlocked to original level
- Next steps: Can resubmit anytime

What This Means:
✓ Stock unlocked (no longer reserved)
✓ You can submit new repost request
✓ Product still in warehouse
✓ Can modify and resubmit

Admin Notes (if provided):
✓ Displays admin feedback (why it was rejected)

CTA Buttons:
- "Try Again"
- "Dashboard"

Closing:
"You can always resubmit your repost request during Month 5
(Days 120-179) of your storage cycle."
```

### Code Integration
```typescript
// In rejectRepostRequest():
await sendRepostRejectedNotification({
  sellerName: request.seller.name,
  sellerEmail: request.seller.email,
  productTitle: request.product.title,
  productId: request.productId,
  adminNotes: adminNotes // Optional, displayed if provided
})
```

**Trigger Points**:
- Admin reviews repost in `/app/admin/boutique/repost-approvals`
- Clicks "Reject" button
- Calls API: `PATCH /api/boutique/admin/repost-requests`
- Email sent in rejectRepostRequest() function

---

## 🔄 Email Lifecycle Example

### Scenario: Seller's Product Over 540 Days

```
Day 0: Product received in warehouse
       ↓
Day 120: Month 5 Alert #1 Sent ✅
       Seller sees dashboard notification
       Seller submits repost request
       ↓
Day 125: Admin approves repost ✅
       "Repost Approved" email sent
       Stock -1, Countdown reset to "Day 0"
       ↓
Day 180: Deduction Confirmation Sent ✅
       Auto-deduction happens
       New 180-day cycle begins
       ↓
Day 240: Month 5 Alert #2 Sent ✅
       (Day 120 of new cycle)
       Seller sees another Month 5 alert
       ↓
Day 300 (or 360):
       Final Warning Sent ✅
       Deduction Confirmation Sent ✅
       ↓
Day 540 (3rd cycle):
       Month 5 Alert #3 Sent ✅
       Seller continues reposting...
       OR
       Stock runs out, Delisted Email Sent ✅
```

---

## ⚙️ Configuration for Email Sending

### Required Environment Variables

**For SendGrid** (RECOMMENDED):
```
SENDGRID_API_KEY=SG.xxx...
EMAIL_FROM=noreply@yoursite.com
```

**OR For SMTP** (Fallback):
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
EMAIL_FROM=noreply@yoursite.com
```

**Also Required**:
```
NEXTAUTH_URL=https://yoursite.com
  (Used in email links: https://yoursite.com/seller/boutique/warehouse-expiration)
```

### Verify Configuration
```bash
# Check if email is configured
npm run dev
# Look for log:
# [Email] Using SendGrid SMTP transport
# OR
# [Email] Using custom SMTP transport
# OR
# [Email] Configure SENDGRID_API_KEY or SMTP_HOST/PORT/USER/PASS to enable email
```

---

## 🧪 Testing Email Notifications

### Test Month 5 Email
```bash
# 1. Create product with receivedByAdminAt = 120 days ago
# 2. Run: npm run dev
# 3. Manually call cron:
curl -X GET http://localhost:3000/api/cron/warehouse-deductions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 4. Check email logs in SendGrid dashboard or terminal
# Should see: [Email - SENT] To: seller@example.com, Subject: ⏰ Action Needed...
```

### Test Repost Approval Email
```bash
# 1. As seller: Submit repost request (POST /api/boutique/seller/warehouse-expiration/[id]/repost)
# 2. As admin: Approve in /app/admin/boutique/repost-approvals
# 3. Check email: Should receive "✅ Repost Approved" email
```

### Test With Real Email
1. Set up SendGrid account (free tier: 100/day)
2. Add API key to `.env.local`
3. Run cron job
4. Check your inbox for test emails

---

## 📊 Email Metrics to Monitor

### Track via Logs
```
npm run dev 2>&1 | grep "Email"

[Email - SENT] To: seller@example.com, Subject: ...
[Email - ERROR] Failed to send to seller@example.com: ...
[Email - NOT SENT] Email service not configured
```

### Track via SendGrid Dashboard
- Sent: 1,500+ emails/month for active marketplace
- Bounced: < 1% (invalid seller emails)
- Opened: Monitor engagement (target: >30%)
- Clicked: Monitor CTA button clicks (target: >10%)

---

## 🚨 Troubleshooting Email Issues

### Email Not Sending?
```
❌ [Email - NOT SENT] Email service not configured

Fix:
1. Check .env: SENDGRID_API_KEY or SMTP_* set?
2. Test: npm run dev && look for [Email] logs
3. If still not set:
   - Add SENDGRID_API_KEY to Render environment
   - Or add SMTP_* variables
   - Restart app
```

### Email Bouncing?
```
❌ [Email - ERROR] seller@example.com: Invalid recipient

Fix:
1. Check seller.email in database is valid
2. In SendGrid, verify sending domain
3. Check EMAIL_FROM is verified in SendGrid
```

### Links Broken in Email?
```
❌ Links in email say "http://localhost:3000/..."

Fix:
1. Set NEXTAUTH_URL to production domain
2. Render env variables page
3. Add: NEXTAUTH_URL=https://yoursite.com
4. Restart app
```

---

## 📧 Email Template Quality

All templates include:
- ✅ Professional HTML design
- ✅ Brand colors (primary: #4F46E5, success: #059669, urgent: #DC2626)
- ✅ Clear action buttons with CTAs
- ✅ Mobile-responsive layout
- ✅ Plain text fallback
- ✅ Unsubscribe-friendly (no unsubscribe needed for transactional)
- ✅ Relevant timestamps and product info
- ✅ Clear explanation of actions taken

---

## 🎯 Summary

**Total Notifications**: 6 types  
**Delivery Method**: SendGrid SMTP or custom SMTP  
**Failure Handling**: Graceful (warehouse continues if email fails)  
**Tracking**: Enabled via logs and SendGrid dashboard  
**Testing**: Can test locally with dev mode or real SendGrid account  

**Status**: ✅ PRODUCTION READY

