# Comprehensive Flaw Analysis - February 5, 2026

## Critical Flaws (Must Fix)

### 1. **Admin Order Update API - Prisma Type Error** ⚠️ BLOCKS BUILD
**File:** `src/app/api/boutique/admin/orders/[orderId]/route.ts:290`
**Issue:** `changedFields: Record<string, unknown>` doesn't match Prisma's `InputJsonValue` type
```typescript
// Problem:
changedFields: hasOtherChanges ? changedFields : null,  // Type mismatch

// This field is typed as Record<string, unknown> but Prisma expects InputJsonValue
```
**Fix Needed:** Cast changedFields to proper Prisma type or restructure
**Status:** ❌ UNFIXED - Blocks build

### 2. **Admin Seller Badges - State Type Mismatch** ⚠️ TYPE ERROR
**File:** `src/app/admin/seller-badges/page.tsx:178`
**Issue:** Initializing state with `null` when type doesn't allow it
```typescript
// Problem:
const [achievements, setAchievements] = useState<SellerBadge['achievements']>(null)
// SellerBadge['achievements'] doesn't allow null as initial value
```
**Status:** ❌ UNFIXED

### 3. **Admin Ownership Page - Missing Property** ⚠️ TYPE ERROR
**File:** `src/app/admin/ownership/page.tsx:348`
**Issue:** Accessing `sellerUsername` property that doesn't exist on `OwnershipDoc` type
```typescript
// Problem:
viewingDoc.sellerUsername || '[Username]'
// Property 'sellerUsername' does not exist on type 'OwnershipDoc'
```
**Status:** ❌ UNFIXED

## High Priority Flaws (Functional Issues)

### 4. **Profile Page - Missing USD in Exchange Rates** 🔴 RUNTIME FLAW
**File:** `src/app/profile/page.tsx:155`
**Issue:** Exchange rates initialized without USD key, but code assumes it exists
```typescript
// Problem:
const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ 
  NGN: 1200, 
  EUR: 0.92, 
  GBP: 0.79 
  // Missing: USD: 1
})

// Later in formatPrice():
if (preferredCurrency !== 'USD' && exchangeRates[preferredCurrency]) {
  // If preferredCurrency is something not in the rates object, it won't work
}
```
**Fix:** Add `USD: 1` to initial state
**Status:** ❌ UNFIXED

### 5. **Currency Conversion - No Fallback for Missing Rates** 🔴 RUNTIME FLAW
**File:** `src/app/profile/page.tsx:270-271`
**Issue:** If exchangeRates doesn't have the selected currency, conversion silently fails
```typescript
if (preferredCurrency !== 'USD' && exchangeRates[preferredCurrency]) {
  const convertedAmount = convertFromUSD(priceUSD, preferredCurrency, exchangeRates)
  // If rate is missing, convertFromUSD will use 1 as default (line in currency.ts:99)
  // This causes incorrect conversions
}
```
**Status:** ⚠️ PARTIALLY MITIGATED (library has fallback, but not ideal)

### 6. **Currency Rates API - Inconsistent Rate Return** 🟡 DATA CONSISTENCY
**File:** `src/app/api/currency/rates/route.ts:9-14`
**Issue:** API only returns 4 currencies (NGN, EUR, GBP, USD) but currency.ts supports 10
```typescript
// Problem: Hardcoded only these currencies returned:
return NextResponse.json({
  rates: {
    NGN: rates.NGN || 1200,
    EUR: rates.EUR || 0.92,
    GBP: rates.GBP || 0.79,
    USD: 1,
  },
})
// Missing: GHS, KES, ZAR, CAD, AUD, INR
```
**Fix:** Return all supported currencies from SUPPORTED_CURRENCIES
**Status:** ⚠️ PARTIAL - Works for current use but limited

### 7. **Admin Orders Page - Missing Dependencies in useEffect** 🔴 REACT HOOK ISSUE
**File:** `src/app/admin/boutique/orders/[orderId]/page.tsx:128`
**Issue:** useEffect dependency array missing `fetchOrder` and `router`
```typescript
useEffect(() => {
  if (status === 'loading') return
  if (!session || (session.user as any).role !== 'ADMIN') {
    router.push('/auth/signin')
    return
  }
  fetchRates()
  fetchOrder()
}, [session, status, orderId])  // Missing: fetchOrder, router

// This can cause infinite loops or stale closures
```
**Status:** ❌ UNFIXED

### 8. **Change Password Endpoint - No Error Handling for Prisma Errors** 🟡 EDGE CASE
**File:** `src/app/api/auth/change-password/route.ts:71-76`
**Issue:** Catch block is too generic, doesn't distinguish between validation and DB errors
```typescript
} catch (error) {
  console.error('Password change error:', error)
  return NextResponse.json(
    { message: 'Internal server error' },
    { status: 500 }
  )
}
// User can't tell if password was actually invalid or DB failed
```
**Status:** 🟡 ACCEPTABLE but could be improved

## Medium Priority Flaws (Code Quality)

### 9. **Notifications Page - Type Safety Issues** 🟡 CODE QUALITY
**File:** `src/app/notifications/page.tsx`
**Issue:** Used `any` types in various places
- Function parameters and data types not strictly typed
**Status:** 🟡 ACCEPTABLE for now

### 10. **Admin Payments Reconciliation - Accessibility Issues** 🟡 A11Y
**File:** `src/app/admin/payments-reconciliation/page.tsx:263,276,246`
**Issue:** Form inputs/selects missing labels and accessibility attributes
```typescript
// Missing title, placeholder, aria-label on inputs
<input ... />
<select ... />
```
**Status:** 🟡 A11Y ISSUE

### 11. **Boutique Orders Page - Inline Styles** 🟡 CODE QUALITY
**File:** `src/app/boutique/orders/[orderid]/page.tsx:295-296`
**Issue:** Inline CSS styles should be in external file
```typescript
<div className="..." style={{ marginLeft: '5%', marginRight: '5%' }}>
```
**Status:** 🟡 LINT WARNING

## Summary Table

| Issue | Severity | File | Type | Fixed |
|-------|----------|------|------|-------|
| Prisma changedFields type | CRITICAL | api/boutique/admin/orders | TypeScript | ❌ |
| Seller badges state type | HIGH | admin/seller-badges | TypeScript | ❌ |
| Missing sellerUsername | HIGH | admin/ownership | TypeScript | ❌ |
| Missing USD in rates | HIGH | profile | Logic | ❌ |
| useEffect dependencies | HIGH | admin/orders | React | ❌ |
| Rates API incomplete | MEDIUM | api/currency/rates | Data | ❌ |
| Inline styles | LOW | boutique/orders | Lint | ❌ |
| Accessibility issues | LOW | admin/payments | A11Y | ❌ |

## Recommendations

1. **Immediately Fix:** Issues #1-5 (build-blocking and functional)
2. **High Priority:** Issues #6-7 (React hooks and completeness)
3. **Nice to Have:** Issues #8-11 (code quality and accessibility)
