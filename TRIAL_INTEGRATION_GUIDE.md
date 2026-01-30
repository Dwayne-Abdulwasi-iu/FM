# Trial Feature Integration Guide

## Components Created

### 1. TrialStatusCard (`src/components/seller/TrialStatusCard.tsx`)
A beautiful, responsive dashboard component that displays:
- Active trial status with countdown timer
- Remaining days visual progress bar
- Trial benefits (6 featured listings, +1 tier, -1% commission)
- Expiration warnings with CTA
- Expired state with upgrade button

**Usage in Dashboard:**
```tsx
// Add to src/app/seller/dashboard/page.tsx after the header section
import { TrialStatusCard } from '@/components/seller/TrialStatusCard'

// Inside the return statement, after the Header section:
{session?.user?.proTrialActivated && (
  <TrialStatusCard 
    isActive={session.user.proTrialActivated}
    expiresAt={session.user.proTrialExpiresAt}
    activatedAt={session.user.proTrialActivatedAt}
  />
)}
```

**Location to Add:** Line ~245, right after the `{/* Header */}` div closes

### 2. Admin Trial Management API (`src/app/api/admin/trials/[userId]/route.ts`)

Provides endpoints for administrators to manage user trials:

#### GET `/api/admin/trials/[userId]`
Returns user's trial information:
```json
{
  "success": true,
  "user": {
    "id": "user123",
    "name": "Designer Name",
    "email": "designer@example.com",
    "totalEarnings": 5000,
    "createdAt": "2024-01-15T..."
  },
  "trial": {
    "isActive": true,
    "activated": true,
    "activatedAt": "2024-02-15T...",
    "expiresAt": "2024-03-16T...",
    "daysRemaining": 29
  }
}
```

#### PATCH `/api/admin/trials/[userId]`
Manages trials (admin only):

**Reset Trial:**
```json
{
  "action": "reset",
  "reason": "User requested extension"
}
```

**Extend Trial:**
```json
{
  "action": "extend",
  "reason": "Bug compensation - features didn't display"
}
```

**Revoke Trial:**
```json
{
  "action": "revoke",
  "reason": "Abusive behavior detected"
}
```

All actions require admin role and update seller's tier/commission.

## Email Notifications

### 1. Trial Activation Email
Sent when user successfully verifies their email OTP:
- Confirmation of trial start
- 30-day countdown
- Feature highlights
- Link to featured listings

### 2. Trial Expiration Warning
Sent automatically at midnight, 1 day before trial expires:
- Countdown: "Your Pro trial expires tomorrow"
- Last chance benefits
- Upgrade CTA with special messaging
- Contact support link

### 3. Trial Expiration Email
Sent automatically when trial expires:
- Notification that trial has ended
- Summary of benefits they'll lose
- Upgrade CTA with comparison
- FAQ about tier restoration

### 4. OTP Verification Email
Sent during trial activation verification step:
- 6-digit code
- Valid for 10 minutes
- Security note about code

All emails are HTML formatted with professional branding and include unsubscribe links.

## Real Email OTP System

### How It Works

1. **Init Step** (`POST /api/subscriptions/pro-trial?step=init`)
   - Generate 6-digit random code
   - Store in Redis: `trial:otp:{userId}:{verificationId}` (10-min TTL)
   - Send code via `sendTrialOTPEmail()`
   - Return verificationId for next step

2. **Verify Step** (`POST /api/subscriptions/pro-trial?step=verify`)
   - Retrieve code from Redis
   - Check if code matches (case-sensitive)
   - Allow 3 attempts before expiry
   - Delete code after successful verification
   - Call `activateProTrial()` on success
   - Send `sendTrialActivationEmail()` confirmation

### Security Features

- **Rate Limiting**: Max 3 failed attempts per 10-minute window
- **Time-Based Expiry**: Codes expire after 10 minutes
- **One-Time Use**: Codes deleted after verification
- **Redis Storage**: No database bloat, automatic cleanup
- **Verification ID**: Ties code to specific verification attempt

## Automatic Expiration System

### Cron Job (`expireAndRestoreSubscriptions()`)

Runs periodically (typically every 5-30 minutes) and:

1. **Expires Old Trials**
   - Finds trials where `proTrialExpiresAt <= now`
   - Deactivates them (sets flags to false/null)
   - Restores natural tier and commission rates
   - Sends `sendTrialExpiredEmail()` notification

2. **Sends Warning Emails**
   - Finds trials expiring tomorrow (24-hour window)
   - Sends `sendTrialExpiringWarningEmail()`
   - Enables early upgrade CTAs

3. **Updates Paystack Subaccounts**
   - Recalculates commission rates based on earnings
   - Updates Paystack subaccount percentage charges
   - Maintains accurate seller earnings

## Integration Checklist

- [x] Email templates created (`src/lib/emails/trial.ts`)
- [x] OTP verification endpoint updated with Redis storage (`src/app/api/subscriptions/pro-trial/route.ts`)
- [x] Trial expiration cron enhanced with emails (`src/lib/tier-management.ts`)
- [x] Dashboard card component created (`src/components/seller/TrialStatusCard.tsx`)
- [x] Admin management API created (`src/app/api/admin/trials/[userId]/route.ts`)
- [ ] Add TrialStatusCard to seller dashboard page (manual integration needed)
- [ ] Create admin UI for trial management (optional nice-to-have)
- [ ] Add audit logging to admin actions (commented TODO in admin route)

## Testing

### Manual Testing

1. **Test Email OTP Verification:**
   ```bash
   # Step 1: Request OTP
   curl -X POST http://localhost:3000/api/subscriptions/pro-trial \
     -H "Content-Type: application/json" \
     -d '{"step":"init"}'
   
   # Copy verificationId and check email for code
   
   # Step 2: Verify Code
   curl -X POST http://localhost:3000/api/subscriptions/pro-trial \
     -H "Content-Type: application/json" \
     -d '{"step":"verify","verificationCode":"123456","verificationId":"..."}'
   ```

2. **Test Admin APIs:**
   ```bash
   # Get trial info
   curl http://localhost:3000/api/admin/trials/{userId} \
     -H "Authorization: Bearer {adminToken}"
   
   # Extend trial
   curl -X PATCH http://localhost:3000/api/admin/trials/{userId} \
     -H "Content-Type: application/json" \
     -d '{
       "action": "extend",
       "reason": "Customer service recovery"
     }'
   ```

3. **Test Expiration Cron:**
   - Manually call `expireAndRestoreSubscriptions()` from a script
   - Check logs for email sending
   - Verify user tier was restored
   - Check Paystack subaccount was updated

### Email Testing

- Use SendGrid sandbox for development
- Check email logs in SendGrid dashboard
- Test with multiple email providers (Gmail, Outlook)
- Verify all links work in emails (featured listings, upgrade page)

## Environment Variables

Required for full functionality:

```env
# Email Service (already configured)
SENDGRID_API_KEY=sg_xxxxx...
EMAIL_FROM=noreply@fashionmarketplace.com

# Redis (for OTP storage)
REDIS_URL=redis://localhost:6379

# NextAuth
NEXTAUTH_SECRET=xxxxx...
NEXTAUTH_URL=http://localhost:3000

# Paystack (for commission updates)
PAYSTACK_SECRET_KEY=sk_test_xxxxx...
```

## What's Production-Ready

✅ **Email OTP Verification** - Real emails sent, Redis-backed, 10-min expiry, 3-attempt limit
✅ **Trial Notifications** - Activation, 1-day warning, expiration emails all configured
✅ **Automatic Expiration** - Cron job handles restoration, Paystack updates
✅ **Dashboard Display** - Beautiful card with countdown, benefits, CTAs
✅ **Admin Tools** - Full CRUD for support team (reset, extend, revoke)

## What Needs Admin UI

🟡 **Admin Dashboard** - Currently API-only, could create `/admin/trials` page for:
   - Search users by email/ID
   - View trial status
   - Quick action buttons (extend, revoke, reset)
   - Audit log history

This would be a nice-to-have but the API is fully functional for command-line or integration testing.

## Support & Maintenance

For issues:
1. Check Redis connection for OTP codes
2. Verify SendGrid API key is valid
3. Check logs for email sending failures
4. Review Prisma logs for tier/earnings issues
5. Test with specific user ID if trial not appearing

For extending/resetting trials:
```bash
# Use admin API
POST /api/admin/trials/{userId} 
{
  "action": "extend",
  "reason": "..." 
}
```

No database migrations needed - all fields already in Prisma schema.
