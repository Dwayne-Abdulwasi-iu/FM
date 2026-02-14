# Audit Log & Null Display Fixes - Change Log

## Summary
Fixed two UI issues in admin boutique orders detail page:
1. ❌→✅ Null values displaying as literal "null" text in Change History
2. 🔍 Added debugging to verify audit logs are being created

## Files Modified

### 1. src/app/admin/boutique/orders/[orderId]/page.tsx

#### Change 1: Fixed Change History Null Display (Lines 541-551)
**Before:**
```tsx
{log.changedFields && Object.keys(log.changedFields).length > 0 && (
  <div className="mt-1 text-xs text-gray-600">
    {Object.entries(log.changedFields)
      .filter(([key]) => key !== 'status')
      .map(([key, value]) => (
        <div key={key}>
          {key}: {JSON.stringify(value)}  {/* Shows "null" as text */}
        </div>
      ))}
  </div>
)}
```

**After:**
```tsx
{log.changedFields && Object.keys(log.changedFields).length > 0 && (
  <div className="mt-1 text-xs text-gray-600">
    {Object.entries(log.changedFields)
      .filter(([key]) => key !== 'status')
      .filter(([, value]) => value !== null && value !== undefined)  {/* NEW: Filter nulls */}
      .map(([key, value]) => (
        <div key={key}>
          {key}: {typeof value === 'string' ? value : JSON.stringify(value)}  {/* NEW: Smart formatting */}
        </div>
      ))}
  </div>
)}
```

**Improvements:**
- Added `.filter(([, value]) => value !== null && value !== undefined)` to exclude null values
- Changed `JSON.stringify(value)` to conditional: `typeof value === 'string' ? value : JSON.stringify(value)`
- Result: No more "trackingNumber: null" text in UI

#### Change 2: Added fetchOrder Debugging (Lines 149-170)
**Added:**
```tsx
const fetchOrder = async () => {
  setLoading(true)
  try {
    const res = await fetch(`/api/boutique/admin/orders/${orderId}`)
    if (res.ok) {
      const data = await res.json()
      // NEW: Debug logging to see audit logs being fetched
      console.log('[ORDER-FETCH] Loaded order:', { 
        orderId, 
        status: data.status, 
        auditLogCount: data.auditLogs?.length || 0, 
        auditLogs: data.auditLogs 
      })
      setOrder(data)
      // ... rest of code
```

**Purpose:** 
- Shows in browser console when order is loaded
- Displays number of audit logs fetched
- Lists all audit logs for debugging
- Console shows: `[ORDER-FETCH] Loaded order: {orderId: "abc123", status: "PENDING_PAYMENT", auditLogCount: 3, ...}`

#### Change 3: Added updateOrder Debugging (Lines 207-243)
**Added:**
```tsx
const refreshRes = await fetch(`/api/boutique/admin/orders/${orderId}`)
if (refreshRes.ok) {
  const refreshData = await refreshRes.json()
  // NEW: Debug logging after update to verify new audit logs fetched
  console.log('[ORDER-UPDATE] Refreshed order after update:', { 
    status: refreshData.status, 
    auditLogCount: refreshData.auditLogs?.length || 0, 
    latestAuditLog: refreshData.auditLogs?.[0] 
  })
  setOrder(refreshData)
```

**Purpose:**
- Shows what happened after order status update
- Displays updated audit log count
- Shows the latest audit log created
- Console shows: `[ORDER-UPDATE] Refreshed order after update: {status: "RETURN_APPROVED", auditLogCount: 4, latestAuditLog: {...}}`

## Testing Results

### Before Fixes:
❌ Change History showing: `trackingNumber: null, trackingUrl: null` as literal text
❌ No way to debug if audit logs are being fetched
❌ Unclear if API is creating audit logs or if they're just not displayed

### After Fixes:
✅ Change History only shows actual values, not "null" text
✅ Browser console shows exactly what audit logs were fetched
✅ Can trace audit log creation through console logs
✅ Easy to debug: just open DevTools and look for [ORDER-FETCH] and [ORDER-UPDATE] logs

## How to Verify the Fixes

### Test 1: Null Display Fix
1. Go to any order detail page
2. Update the order status (no tracking number needed)
3. Check Change History section
4. Should NOT see "null" text anymore
5. Should only see fields that have values

### Test 2: Audit Log Creation
1. Open browser DevTools (F12)
2. Go to Console tab
3. Load an order → See `[ORDER-FETCH]` log with audit count
4. Update order status → See `[ORDER-UPDATE]` log with new audit count
5. If audit count increased, API is creating logs ✅
6. If audit count stayed same, API might not be creating logs ❌

## Debugging with Console Logs

### What Each Log Means:

**`[ORDER-FETCH]` Log:**
- Shows when page initially loads
- `auditLogCount: 0` = No previous changes recorded
- `auditLogCount: 5` = 5 previous status/tracking changes exist
- If shows latest audit logs, indicates database fetching is working

**`[ORDER-UPDATE]` Log:**
- Shows after you update order and click "Update Order"
- `auditLogCount` should be +1 compared to before
- Shows `latestAuditLog` with newest change entry
- If `auditLogCount` stays same, new audit log wasn't created

### Combined Output Example:

```
[ORDER-FETCH] Loaded order: {
  orderId: "67abc123def456ghi789",
  status: "PENDING_PAYMENT",
  auditLogCount: 0,
  auditLogs: []
}

User changes status to RETURN_APPROVED and clicks Update...

[ORDER-UPDATE] Refreshed order after update: {
  status: "RETURN_APPROVED",
  auditLogCount: 1,
  latestAuditLog: {
    id: "audit_xyz789",
    action: "STATUS_CHANGE",
    oldStatus: "PENDING_PAYMENT",
    newStatus: "RETURN_APPROVED",
    isManualOverride: false,
    createdAt: "2024-12-19T10:30:00.000Z",
    admin: { id: "admin123", name: "Admin User", email: "admin@example.com" }
  }
}
```

If you see this pattern, everything is working correctly! ✅

## Remaining Items

### Still Need to Verify:
- [ ] Check server-side logs for `[AUDIT-SUCCESS]` or `[AUDIT-FAILED]`
- [ ] Verify all status transitions create audit logs
- [ ] Test with REFUNDED status specifically
- [ ] Confirm new statuses (RETURN_REQUESTED, etc.) appear in history
- [ ] Remove console.log statements once fully verified

### Files Still Being Debugged:
- `src/app/api/boutique/admin/orders/[orderId]/route.ts` - Already has `[AUDIT-SUCCESS]` logs, needs real testing

## Related Documentation

- See: `AUDIT_LOG_TEST_GUIDE.md` for step-by-step testing instructions
- See: `/api/boutique/admin/orders/[orderId]/route.ts` for server-side logging
- See: Database schema changes in `prisma/schema.prisma` (BoutiqueOrderAuditLog model)
