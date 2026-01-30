# 🔍 SECOND COMPREHENSIVE FLAW CHECK REPORT

**Date**: January 25, 2026  
**Status**: ⚠️ CRITICAL FLAW FOUND + 2 MEDIUM FLAWS

---

## 🚨 CRITICAL FLAW #1: Stock Calculation Error in Warehouse Deduction Logic

### Location
**File**: `src/lib/boutique/warehouse.ts` (Lines 520-540)

### Issue
**The stock calculation is WRONG - it's calculating the deduction incorrectly:**

```typescript
// WRONG ❌ - Line 528
const newTotalStock = product.variants.reduce((sum, v) => sum + (Math.max(0, v.quantity - 1)), 0)
```

**Problem**: 
- This code calculates deduction incorrectly by subtracting 1 from EACH variant in the reducer
- But the actual deduction is done in the loop above (lines 520-526)
- So it's double-deducting: once in the loop, then again in the reducer
- Should just sum up the already-deducted quantities

### Correct Code
```typescript
// CORRECT ✅
const newTotalStock = product.variants.reduce((sum, v) => sum + Math.max(0, v.quantity), 0)
```

Or better:
```typescript
const newTotalStock = totalDeducted > 0 
  ? totalStock - totalDeducted 
  : totalStock
```

### Impact
- **HIGH**: Product gets delisted prematurely because stock appears lower than it is
- Sellers lose products unexpectedly
- Incorrect audit trail for warehouse operations

### How to Fix
Replace line 528 with:
```typescript
const newTotalStock = product.variants.reduce((sum, v) => sum + Math.max(0, v.quantity), 0)
```

---

## ⚠️ MEDIUM FLAW #1: Day 120 vs Day 119 Inconsistency

### Location
**File**: `src/lib/boutique/warehouse.ts`

### Issue
**Conflicting day numbers for Month 5 start:**

Line 21:
```typescript
export const MONTH_5_START_DAY = 120  // Day 120 onwards
```

But in cron job (line 418):
```typescript
if (daysInCurrentCycle === MONTH_5_START_DAY && !product.month5NotificationSent)
```

**Problem**: 
- Day 120 notification is sent when `daysInCurrentCycle === 120` exactly
- But emails say "Day 119 notification" in the template
- This creates confusion about when notifications actually fire
- If a seller's product hits day 120 at 23:00, they won't get notification until next cron run (could be 1+ hours later)

### Expected Behavior
- Day 120 means 120 full days have passed (product is entering Month 5)
- BUT notification should probably fire on Day 119 (with 1 day remaining in Month 4)
- This gives seller advance notice before entering Month 5

### Fix
Either:
1. Change constant to `MONTH_5_START_DAY = 119` and send notification
2. Or send notification on Day 119, enter Month 5 on Day 120

**Recommendation**: Use Day 119 for notification
```typescript
export const MONTH_5_NOTIFICATION_DAY = 119
export const MONTH_5_START_DAY = 120
```

---

## ⚠️ MEDIUM FLAW #2: Pending Repost Check in Warehouse Page

### Location
**File**: `src/app/seller/boutique/warehouse-expiration/page.tsx` (Lines 180-195)

### Issue
**The page shows `product.pendingRepost` but this field is never populated in the API response:**

Page code (line 180):
```tsx
{product.pendingRepost && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 sm:p-3 md:p-4">
```

But in API route (`src/app/api/boutique/seller/warehouse-expiration/route.ts`), the enriched products don't include pending repost data:
```typescript
return {
  id: product.id,
  title: product.title,
  basePrice: product.basePrice,
  currentStock: product.currentStock || 0,
  thumbnailUrl: product.thumbnailUrl,
  receivedByAdminAt: product.receivedByAdminAt,
  daysInWarehouse,
  inMonth5,
  canRepost: repostCheck.can,
  repostReason: repostCheck.reason,
  cycleInfo,
  // ❌ NO pendingRepost DATA!
}
```

### Impact
- **MEDIUM**: The "Pending Repost Request" section never displays to sellers
- Sellers can't see their pending requests on this page
- But pending requests ARE created (they just can't see them)

### How to Fix

In API route, add to the enriched product:
```typescript
// Get pending repost if any
const pendingRepost = await prisma.boutiqueRepostRequest.findFirst({
  where: {
    productId: product.id,
    status: 'PENDING'
  }
})

return {
  // ... existing fields
  pendingRepost: pendingRepost ? {
    id: pendingRepost.id,
    units: pendingRepost.requestedStock,
    reason: pendingRepost.reason,
    createdAt: pendingRepost.createdAt
  } : null
}
```

Then ensure the TypeScript interface includes it:
```typescript
interface Product {
  // ... existing fields
  pendingRepost?: {
    id: string
    units: number
    reason: string
    createdAt: string
  } | null
}
```

---

## ✅ Additional Validations (PASSED)

✅ **Daily Limit Logic**: Fixed and working correctly (counts PENDING + APPROVED)  
✅ **Stock Locking**: Prevents double-repost submissions  
✅ **Email Error Handling**: Graceful failures, doesn't break workflow  
✅ **Role-Based Access**: Admin checks working properly  
✅ **Cron Authentication**: Bearer token validation correct  
✅ **Timezone Handling**: Using `new Date()` consistently  
✅ **Product Ownership**: Seller can only repost their own products  
✅ **Status Transitions**: Product status updates correctly through workflow  

---

## 📋 Summary

| Severity | Count | Status | Action |
|----------|-------|--------|--------|
| Critical | 1 | ⚠️ Needs Fix | Stock calculation in deduction logic |
| Medium   | 2 | ⚠️ Needs Fix | Day notification timing + Pending repost visibility |
| Low      | 0 | ✅ Pass | - |
| **TOTAL**| **3** | - | - |

---

## 🔧 Next Steps

1. **Fix Critical Flaw**: Correct line 528 stock calculation
2. **Fix Medium Flaw #1**: Clarify Day 119 vs 120 notification timing
3. **Fix Medium Flaw #2**: Add pending repost data to API response
4. **Test**: Verify all flaws are resolved with manual testing
5. **Deploy**: Push changes to production

---

## 📝 Verification Checklist

- [ ] Stock deduction logic tested with multiple variants
- [ ] Day 120 notification fires correctly
- [ ] Sellers see pending repost requests in warehouse page
- [ ] Daily limit (3/day) is enforced correctly
- [ ] Admin approval/rejection works end-to-end
- [ ] Email notifications send without blocking operations
- [ ] Cron job completes successfully
