# Audit Log Fix - Testing Guide

## Changes Made

### 1. Fixed Null Value Display in Change History (COMPLETED ✓)
**File**: `src/app/admin/boutique/orders/[orderId]/page.tsx`
**Lines**: 541-551
**Change**: 
- Added filter to exclude null/undefined values from changedFields display
- Improved string formatting to avoid JSON.stringify for simple strings
- Now shows: `trackingNumber: <value>` instead of `trackingNumber: null`

### 2. Added Debugging Logs (COMPLETED ✓)
**Files Modified**:
- `src/app/admin/boutique/orders/[orderId]/page.tsx` (fetchOrder and updateOrder functions)

**Logging Added**:
- `[ORDER-FETCH]` - Logs when order is initially loaded with audit log count
- `[ORDER-UPDATE]` - Logs after status update with refreshed audit log count

## Testing Steps

### Step 1: Open Browser DevTools
1. Open the admin order detail page for any boutique order
2. Open DevTools: Press `F12` → Go to Console tab
3. Clear previous logs: `console.clear()`

### Step 2: Initial Load Check
1. Navigate to order detail page
2. In Console, look for: `[ORDER-FETCH] Loaded order:` log
3. **Expected**: Should show `auditLogCount: X` and list of audit logs
4. **Issue**: If showing `auditLogCount: 0`, no logs are being fetched

### Step 3: Manual Status Update Test
1. **Change status** to RETURN_APPROVED (or any valid status)
2. **Check Console** for:
   - `[AUDIT-CHECK]` logs from server (should see in network tab or terminal)
   - `[ORDER-UPDATE] Refreshed order after update:` showing new audit log count
3. **Check Server Logs** (if terminal visible):
   - Should see `[AUDIT-SUCCESS]` if log was created
   - Should see `[AUDIT-FAILED]` if there was an error

### Step 4: Verify Change History Display
1. **After status update**, refresh the page or wait for update to complete
2. **Check Change History section**:
   - Should show the new status change entry
   - Should show as: `Status: PENDING_PAYMENT → RETURN_APPROVED`
   - Should NOT display `null` values for tracking fields

### Step 5: Test Null Value Filtering
1. **Update an order** with **tracking number/URL**
2. **Verify Change History** displays only non-null fields
3. **Compare results**: 
   - ❌ Before: `trackingNumber: null, trackingUrl: null`
   - ✅ After: Only shows actual values, not null

## Debugging Checklist

### If Audit Logs Not Appearing:

**Problem 1: Initial Load Shows 0 Audit Logs**
- [ ] Check: Are there old audit logs in the database? (Check MongoDB for BoutiqueOrderAuditLog)
- [ ] Check: Is the GET endpoint correctly fetching logs? (Network tab → `/api/boutique/admin/orders/[id]`)
- [ ] Check: Response includes `auditLogs` array?

**Problem 2: New Audit Log Not Created After Update**
- [ ] Check Server Console for `[AUDIT-SUCCESS]` or `[AUDIT-FAILED]` logs
- [ ] Check: Is `hasChanges` being detected? Look for `[AUDIT-CHECK]` logs
- [ ] Check: Are status transitions valid? (Invalid statuses won't create logs)
- [ ] Check: Is the `orderId` and `adminId` being passed correctly?

**Problem 3: Logs Created But Not Displaying**
- [ ] Check Network tab → `/api/boutique/admin/orders/[id]` Response
- [ ] Verify `auditLogs` array is in response
- [ ] Check if frontend `console.log` shows logs: `[ORDER-UPDATE] Refreshed order`
- [ ] Try clearing browser cache and hard refresh (Ctrl+Shift+R)

## Expected Console Output

### On Initial Load:
```
[ORDER-FETCH] Loaded order: {
  orderId: "abc123",
  status: "PENDING_PAYMENT",
  auditLogCount: 3,
  auditLogs: [...]
}
```

### After Status Update:
```
[PATCH-ORDER] Received: orderId=abc123, status="RETURN_APPROVED" ...
[AUDIT-SUCCESS] Audit log created with ID: def456
[ORDER-UPDATE] Refreshed order after update: {
  status: "RETURN_APPROVED",
  auditLogCount: 4,
  latestAuditLog: {...}
}
```

## Key Files Involved

1. **API Endpoint**: `src/app/api/boutique/admin/orders/[orderId]/route.ts`
   - GET: Fetches order with audit logs (lines 8-95)
   - PATCH: Updates order and creates audit log (lines 97-527)

2. **Detail Page**: `src/app/admin/boutique/orders/[orderId]/page.tsx`
   - fetchOrder: Initial load with debugging (lines 149-170)
   - updateOrder: Update with refresh and debugging (lines 207-243)
   - Change History Display: Fixed null filtering (lines 541-551)

3. **Database**: MongoDB
   - Collection: `BoutiqueOrderAuditLog`
   - Fields: orderId, adminId, action, oldStatus, newStatus, changedFields, isManualOverride, createdAt

## Next Steps

1. ✅ Test with a real order update
2. ✅ Verify console logs show audit creation
3. ✅ Confirm Change History displays the new entry
4. ✅ Confirm null values are filtered out
5. ⏳ Remove console.log statements once verified working
6. ⏳ Test with REFUNDED status to ensure all statuses work

## Potential Issues

### Issue 1: Database Connection
- If `[AUDIT-FAILED]` appears in logs
- Check: Is DATABASE_URL set correctly?
- Check: Can Prisma connect to MongoDB?

### Issue 2: Missing admin.id
- If `adminId: undefined` in audit logs
- Check: Is `session.user.id` being set correctly?
- Check: Is admin actually authenticated?

### Issue 3: Status Not Recognized
- If update succeeds but no audit log created
- Check: Is `status` parameter being sent from frontend?
- Check: Is status value in the `validStatuses` array?

## Success Criteria

✅ **PASS**: When updating order status:
1. Change History updates with new entry
2. Shows correct old and new status
3. Shows correct timestamp and admin name
4. No "null" text displays for tracking fields
5. All changes (tracking, notes) appear without null values
6. Multiple status changes appear in chronological order (newest first)

❌ **FAIL**: If any of:
- Change History doesn't update after save
- Old "null" text still displays
- Error messages appear in console
- API returns 500 error
