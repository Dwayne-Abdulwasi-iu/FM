# Deep Code Audit - Flaws Found

Date: February 8, 2026  
Audit Scope: Boutique System (Products, Orders, Payments, Admin)

---

## CRITICAL FLAWS 🔴

### 1. **Race Condition in Checkout Stock Validation**
**Location:** `src/app/api/boutique/checkout/route.ts` (lines 140-150)  
**Severity:** CRITICAL  
**Issue:**
```typescript
// Check AVAILABLE quantity (not reserved)
const unavailableItems = cartItems.filter(
  item => (item.variant.quantity - item.variant.reserved) < item.quantity
);
// ... 100+ lines later ...
// Update inventory
await prisma.boutiqueProductVariant.update({
  where: { id: item.variant!.id },
  data: { 
    quantity: { decrement: item.quantity },
    reserved: { increment: item.quantity },
  },
});
```

**Problem:** Between the availability check and the inventory update, another concurrent checkout could claim the same stock.

**Impact:**  
- Overselling products
- Inventory becomes negative
- Fulfillment failures when admin tries to ship

**Fix:** Use Prisma transaction with optimistic locking or atomic CAS (Compare-And-Swap):
```typescript
// Check and reserve in same transaction
await prisma.$transaction(async (tx) => {
  const currentVariant = await tx.boutiqueProductVariant.findUnique({
    where: { id: variantId }
  });
  
  const available = currentVariant.quantity - currentVariant.reserved;
  if (available < requestedQty) throw new Error('Out of stock');
  
  await tx.boutiqueProductVariant.update({
    where: { id: variantId },
    data: { reserved: { increment: requestedQty } }
  });
});
```

---

### 2. **Missing Cart Item Quantity Validation**
**Location:** `src/app/api/boutique/cart/route.ts`  
**Severity:** CRITICAL  
**Issue:** Cart endpoint doesn't validate if requested quantity exceeds available stock.

**Problem:**
- User adds 100 items to cart when only 5 are available
- Checkout fails at payment time (user experience issue)
- Could be exploited to reserve stock unnecessarily

**Fix:** Add validation in cart POST:
```typescript
const available = (variant.quantity - variant.reserved);
if (quantity > available) {
  return NextResponse.json({
    success: false,
    message: `Only ${available} items available`,
    maxQuantity: available
  }, { status: 400 });
}
```

---

### 3. **Sequential Shipment Fetch in Admin Products List**
**Location:** `src/app/api/boutique/admin/products/route.ts` (lines 105-120)  
**Severity:** HIGH  
**Issue:**
```typescript
// Fetch shipment details for products that have shipmentId
const productsWithShipment = await Promise.all(
  products.map(async (product: any) => {
    let shipment = null;
    if ((product as any).shipmentId) {
      shipment = await prisma.sellerToAdminShipment.findUnique({
        where: { id: (product as any).shipmentId },
      });
    }
    return { ...product, shipment };
  })
);
```

**Problem:** While using Promise.all (parallel), the structure is inefficient. Better to batch fetch shipments.

**Impact:**
- Slow admin product list (multiple DB round trips)
- Laggy UI for admins

**Fix:** Batch fetch shipments:
```typescript
const shipmentIds = products.filter(p => p.shipmentId).map(p => p.shipmentId);
const shipments = await prisma.sellerToAdminShipment.findMany({
  where: { id: { in: shipmentIds } }
});
const shipmentMap = new Map(shipments.map(s => [s.id, s]));

const productsWithShipment = products.map(p => ({
  ...p,
  shipment: p.shipmentId ? shipmentMap.get(p.shipmentId) : null
}));
```

---

## HIGH PRIORITY FLAWS 🟠

### 4. **Inconsistent Stock Sync After Orders**
**Location:** `src/app/api/boutique/checkout/callback/route.ts` (lines 235-270)  
**Severity:** HIGH  
**Issue:**
```typescript
const variants = await prisma.boutiqueProductVariant.findMany({
  where: { productId },
  select: { quantity: true },
});

const totalStock = variants.reduce((sum, v) => sum + v.quantity, 0);

await prisma.boutiqueProduct.update({
  where: { id: productId },
  data: { currentStock: totalStock },
});
```

**Problem:** 
- `currentStock` doesn't account for `reserved` items
- Doesn't match the reality of available inventory
- Can show product as in-stock when all items are reserved

**Impact:**
- Incorrect inventory display to buyers
- Overselling risk

**Fix:** Include reserved in calculation:
```typescript
const totalStock = variants.reduce((sum, v) => sum + (v.quantity - v.reserved), 0);
```

---

### 5. **Missing Idempotency Key for Payment Processing**
**Location:** `src/app/api/boutique/checkout/callback/route.ts` (lines 170-180)  
**Severity:** HIGH  
**Issue:**
```typescript
// Idempotency check - skip if already processed
if (order.paidAt) {
  console.log(`Order ${order.orderNumber} already processed, skipping`);
  continue;
}
```

**Problem:** Only checks `paidAt` field. If callback fires twice but slowly, could process payment twice.

**Impact:**
- Double charging in race conditions
- Inventory reserved twice

**Fix:** Use database-level constraints or add processed flag before updating:
```typescript
const updateResult = await prisma.boutiqueOrder.updateMany({
  where: { 
    id: order.id,
    paidAt: null  // Only update if not yet paid
  },
  data: { paidAt: new Date(), status: newStatus }
});

if (updateResult.count === 0) {
  // Already processed
  continue;
}
```

---

### 6. **Missing Validation on Seller Account Setup**
**Location:** `src/app/api/boutique/checkout/route.ts` (lines 354-395)  
**Severity:** HIGH  
**Issue:**
```typescript
const sellerAccount = await prisma.sellerAccount.findUnique({
  where: { userId: orderPreview.sellerId },
  select: { subaccountCode: true },
});

if (sellerAccount?.subaccountCode) {
  // Use it
} else {
  // Reject order and rollback
  // But this is AFTER order creation!
}
```

**Problem:** 
- SELLER_DIRECT product allows creation without verified Paystack account
- Only caught at payment time
- Rollback is complex and error-prone

**Impact:**
- Bad UX - product won't sell
- Potential orphaned orders if rollback fails

**Fix:** Validate seller setup when PRODUCT is marked LIVE:
```typescript
// In product approval endpoint
if (approveForSellerDirect) {
  const account = await prisma.sellerAccount.findUnique({
    where: { userId: product.sellerId }
  });
  if (!account?.subaccountCode) {
    return NextResponse.json({
      success: false,
      message: 'Seller must complete payment setup before SELLER_DIRECT goes live'
    }, { status: 400 });
  }
}
```

---

### 7. **Generic Error Responses in Critical Routes**
**Location:** Multiple admin routes like `src/app/api/boutique/admin/products/route.ts`  
**Severity:** MEDIUM-HIGH  
**Issue:**
```typescript
} catch (error) {
  console.error('Error updating boutique product:', error);
  return NextResponse.json(
    { success: false, message: 'Failed to update product' },
    { status: 500 }
  );
}
```

**Problem:**
- All errors return generic 500
- No distinction between validation errors, DB errors, payment errors
- Admin can't see root cause

**Impact:**
- Harder to debug issues
- Admin can't know if it's a transient DB issue or validation error

**Fix:** Add prismaErrorResponse and specific error types:
```typescript
const prismaResp = prismaErrorResponse(error, 'Failed to update product');
if (prismaResp) return prismaResp;

if (error instanceof ValidationError) {
  return NextResponse.json({
    success: false,
    message: error.message
  }, { status: 400 });
}

console.error('Unexpected error:', error);
return NextResponse.json({
  success: false,
  message: 'An unexpected error occurred'
}, { status: 500 });
```

---

### 8. **No Constraints on Negative Stock in Variants**
**Location:** `prisma/schema.prisma` (BoutiqueProductVariant)  
**Severity:** MEDIUM-HIGH  
**Issue:**
```prisma
quantity    Int      @default(1)  // No min constraint!
reserved    Int      @default(0)  // No max constraint!
```

**Problem:**
- Database allows negative quantities (from bugs)
- No validation that `reserved <= quantity`
- Can't trust stock data

**Impact:**
- Silent data corruption
- Inventory reports show wrong numbers

**Fix:** Add database-level validation:
```prisma
quantity    Int      @default(1)  // Add check constraint
reserved    Int      @default(0)  // Add check constraint

@@check(quantity >= 0, "quantity")
@@check(reserved >= 0, "reserved")
@@check(reserved <= quantity, "reserved must be <= quantity")
```

---

## MEDIUM PRIORITY FLAWS 🟡

### 9. **Insufficient Input Validation in Product Creation**
**Location:** `src/app/api/boutique/products/route.ts` (POST handler)  
**Severity:** MEDIUM  
**Issue:**
```typescript
const {
  title, description, categoryId, basePrice, salePrice, 
  // ... many fields with no validation
} = body;

if (!title || !description || !categoryId || !basePrice) {
  return NextResponse.json({ ... });
}
// But no validation on:
// - title length
// - basePrice > 0
// - salePrice < basePrice
// - tags length
```

**Fix:** Add comprehensive validation:
```typescript
const errors = [];
if (!title || title.trim().length < 3 || title.length > 200) {
  errors.push('Title must be 3-200 characters');
}
if (parseFloat(basePrice) <= 0) {
  errors.push('Price must be greater than 0');
}
if (salePrice && parseFloat(salePrice) >= parseFloat(basePrice)) {
  errors.push('Sale price must be less than base price');
}
if (tags && tags.length > 20) {
  errors.push('Maximum 20 tags allowed');
}
if (errors.length > 0) {
  return NextResponse.json({ success: false, errors }, { status: 400 });
}
```

---

### 10. **Missing Type Safety on Session User**
**Location:** Throughout boutique routes  
**Severity:** MEDIUM  
**Issue:**
```typescript
const isAdmin = (session.user as any).role === 'ADMIN';
// or
const role = session.user.role;  // Could be undefined!
```

**Problem:**
- Type casting with `any` defeats TypeScript safety
- No guarantee `role` property exists
- Inconsistent across codebase

**Fix:** Create a type guard:
```typescript
interface SessionUser extends DefaultSession['user'] {
  role: 'ADMIN' | 'USER' | 'SELLER';
}

function isAdmin(user: any): user is SessionUser {
  return user?.role === 'ADMIN';
}

if (!isAdmin(session.user)) {
  return NextResponse.json({ error: 'Admin only' }, { status: 403 });
}
```

---

### 11. **Warehouse Location Parsing is Fragile**
**Location:** `src/app/api/boutique/admin/products/route.ts` (line 346)  
**Severity:** MEDIUM  
**Issue:**
```typescript
zone: warehouseLocation?.split('-')[0] || 'A',
shelf: warehouseLocation?.split('-')[1] || '1',
bin: warehouseLocation?.split('-')[2] || 'A1',
```

**Problem:**
- If format is wrong (e.g., "A-1" instead of "A-1-A1"), defaults to 'A', '1', 'A1'
- No validation of format
- Can lose warehouse location data

**Fix:**
```typescript
const validateLocation = (loc: string) => {
  const parts = loc.split('-');
  if (parts.length !== 3) throw new Error('Location format must be ZONE-SHELF-BIN');
  const [zone, shelf, bin] = parts;
  if (!/^[A-Z]$/.test(zone)) throw new Error('Zone must be single letter A-Z');
  if (!/^\d+$/.test(shelf)) throw new Error('Shelf must be numeric');
  if (!/^[A-Z]\d+$/.test(bin)) throw new Error('Bin must be like A1, B2, etc');
  return { zone, shelf, bin };
};
```

---

### 12. **No Audit Trail for Admin Actions**
**Location:** `src/app/api/boutique/admin/products/route.ts`  
**Severity:** MEDIUM  
**Issue:**
```typescript
// Admin approves product but there's no audit log of:
// - Who approved it
// - When
// - What notes they left
// - If they're still employed
```

**Problem:**
- Can't trace who made what decision
- Hard to dispute if product was wrongly approved/rejected
- No accountability

**Fix:** Create audit log entry:
```typescript
await prisma.auditLog.create({
  data: {
    adminId: session.user.id,
    action: 'BOUTIQUE_PRODUCT_APPROVED',
    resourceType: 'BoutiqueProduct',
    resourceId: product.id,
    changes: {
      before: { status: product.status },
      after: { status: PRODUCT_STATUS.CONTENT_APPROVED }
    },
    notes: notes || null,
    timestamp: new Date(),
  }
});
```

---

## LOW PRIORITY OBSERVATIONS 🔵

### 13. Debug Logging Left in Production
**Location:** `src/components/home/featured-boutique-products.tsx`  
**Issue:**
```typescript
console.log('[DEBUG Featured] Featured items response:', data.items?.slice(0, 2))
console.log('[DEBUG Featured] First product slug:', data.items?.[0]?.slug)
console.log('[DEBUG Featured] Fallback response:', data.products?.slice(0, 2))
```

**Fix:** Remove or conditionally log:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG Featured]', data.items?.slice(0, 2));
}
```

---

### 14. Inconsistent Error Message Formatting
**Severity:** LOW  
**Issue:** Some endpoints return:
```json
{ "success": false, "message": "..." }
```
Others return:
```json
{ "error": "..." }
```

**Fix:** Standardize all to:
```json
{ "success": false, "message": "..." }
```

---

## Summary

| Severity | Count | Examples |
|----------|-------|----------|
| 🔴 Critical | 2 | Race condition, Missing validation |
| 🟠 High | 6 | Stock sync, Rollback issues, Account setup |
| 🟡 Medium | 4 | Input validation, Type safety |
| 🔵 Low | 2 | Debug logs, Format inconsistency |

---

## Recommended Action Plan

### Immediate (This Sprint)
1. ✅ Fix race condition with transaction isolation
2. ✅ Add Prisma constraints on stock
3. ✅ Validate seller account before product goes live

### This Week  
4. ✅ Batch fetch shipments in admin list
5. ✅ Add comprehensive input validation
6. ✅ Fix stock sync calculation (reserved items)

### Next Sprint
7. ✅ Create audit log system
8. ✅ Type-safe session user
9. ✅ Remove debug logging
10. ✅ Standardize error responses

