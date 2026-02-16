# 404 Error Fix - Warehouse Inventory "View Product" Link

## Problem
Users clicking "View Product" from the warehouse inventory page received 404 errors when products were in intermediate warehouse states (not yet LIVE).

**Error Example:** `GET http://localhost:3000/api/boutique/shop/wgsdgssdgsfg 404 (Not Found)`

## Root Cause
The warehouse inventory page shows products in various states:
- DRAFT
- PENDING_CONTENT_REVIEW  
- CONTENT_APPROVED
- SHIPPED_TO_ADMIN
- **RECEIVED_BY_ADMIN** ← These statuses were problematic
- **VERIFICATION_PASSED** ← 
- LIVE (available to public)
- IN_RETURN, OUT_OF_STOCK, etc.

The public API endpoint `/api/boutique/shop/[slug]` only returns products with `status = "LIVE"`. 

The old link logic redirected certain statuses to the seller's internal product details page but didn't handle all non-LIVE statuses. Products in intermediate warehouse states (RECEIVED_BY_ADMIN, VERIFICATION_PASSED, etc.) fell through to the public `/boutique/[slug]` link, resulting in 404 errors.

## Solution
Updated the Link href condition in [src/app/seller/boutique/warehouse-inventory/page.tsx](src/app/seller/boutique/warehouse-inventory/page.tsx#L612-L624) to include all non-LIVE warehouse statuses.

### Before
```tsx
href={
  ['IN_RETURN', 'RETURN_REQUESTED', 'RETURN_SHIPPED', 'RETURNED_TO_SELLER'].includes(expandedProduct.status)
    ? `/seller/boutique/product-details/${expandedProduct.id}`
    : expandedProduct.status === 'OUT_OF_STOCK'
    ? `/seller/boutique/product-details/out-of-stock/${expandedProduct.id}`
    : `/boutique/${expandedProduct.slug}`  // ← Problem: Shows 404 for non-LIVE products
}
```

### After  
```tsx
href={
  ['IN_RETURN', 'RETURN_REQUESTED', 'RETURN_SHIPPED', 'RETURNED_TO_SELLER', 
   'RECEIVED_BY_ADMIN', 'VERIFICATION_PASSED', 'CONTENT_APPROVED', 
   'SHIPPED_TO_ADMIN', 'PENDING_CONTENT_REVIEW', 'DRAFT'].includes(expandedProduct.status)
    ? `/seller/boutique/product-details/${expandedProduct.id}`
    : expandedProduct.status === 'OUT_OF_STOCK'
    ? `/seller/boutique/product-details/out-of-stock/${expandedProduct.id}`
    : `/boutique/${expandedProduct.slug}`  // ← Now only for LIVE products
}
```

## Impact
- ✅ Products in all non-LIVE warehouse states now route to the internal seller product details page
- ✅ Only LIVE products access the public boutique page
- ✅ No more 404 errors when viewing products from warehouse inventory
- ✅ Consistent behavior across all product statuses

## Files Changed
- [src/app/seller/boutique/warehouse-inventory/page.tsx](src/app/seller/boutique/warehouse-inventory/page.tsx) - Lines 612-624

## Testing
To test the fix:
1. Navigate to warehouse inventory page
2. Click "View Product" on products in various states
3. Products in non-LIVE states should open the seller's internal product details
4. Only LIVE products should open the public boutique page
5. No 404 errors should occur
