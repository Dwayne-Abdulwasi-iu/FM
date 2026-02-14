# Warehouse Return System - Missing Implementation Audit

## CRITICAL GAPS IDENTIFIED

### ❌ 1. Missing Admin Dashboard for Warehouse Returns

**Issue**: No admin page to view/manage seller warehouse return requests

**Missing Components**:
- [ ] Admin page: `/admin/boutique/warehouse-returns` (similar to `/admin/boutique/returns`)
- [ ] View pending return requests (PENDING_ADMIN_REVIEW status)
- [ ] Approve/reject buttons for each request
- [ ] Fee calculation display
- [ ] Admin notes input field
- [ ] Bulk approve/reject actions

**What's needed**:
```tsx
// /src/app/admin/boutique/warehouse-returns/page.tsx
- List all PENDING_ADMIN_REVIEW shipments
- Show fee breakdown (2 units Day 0-119 vs 1 unit Day 120-180)
- Approve button → POST /api/boutique/admin/approve-return
- Deny button → (missing API endpoint)
```

---

### ❌ 2. Missing Admin Rejection Endpoint

**Issue**: No way for admin to REJECT a warehouse return request

**Missing Endpoint**:
- [ ] POST `/api/boutique/admin/reject-return` (completely missing)

**What it should do**:
```typescript
// Input: { productId, reason }
// Actions:
// 1. Set shipment status to REJECTED or CANCELLED
// 2. Reset product.fullReturnEnabled to false
// 3. Send email to seller: "Return request denied: {reason}"
// 4. No -2 variant created
```

---

### ❌ 3. Missing Admin Ship Return UI

**Issue**: Approve endpoint exists but no UI for admin to mark return as shipped

**Missing Components**:
- [ ] Admin action in warehouse-returns page or separate shipments view
- [ ] Modal to enter tracking number and carrier
- [ ] "Mark as Shipped" button
- [ ] Calls POST `/api/boutique/admin/ship-return`

---

### ❌ 4. Missing Seller Request Verification Modal

**Issue**: Seller clicks "Request Return" but no popup confirmation with terms

**Missing Components**:
- [ ] Popup modal showing:
  - Fee amount (2 or 1 units)
  - Total units returning
  - Warning: "Once approved, fee is irreversible"
  - Terms & Conditions checkbox
  - Confirm/Cancel buttons
  
**Location**:
- `/src/app/seller/boutique/warehouse-inventory/page.tsx` needs modal

---

### ❌ 5. Missing Return Status Flow in Seller Dashboard

**Issue**: Seller requests return but can't see status or track it

**Missing**:
- [ ] "Returns" or "Return Requests" tab in seller boutique section
- [ ] List of all return requests with statuses:
  - PENDING_ADMIN_REVIEW (awaiting approval)
  - APPROVED_BY_ADMIN (approved, ready to ship)
  - SHIPPED_BY_ADMIN (in transit to seller)
  - RECEIVED_BY_SELLER (seller received it)
  - COMPLETED (finished)
- [ ] For each return show:
  - Product name and image
  - Admin fee amount
  - Current status
  - Timeline of events

---

### ❌ 6. Missing Shipment Status Mapping

**Issue**: New statuses (PENDING_ADMIN_REVIEW, APPROVED_BY_ADMIN, SHIPPED_BY_ADMIN, RECEIVED_BY_SELLER) not defined in system

**Missing**:
- [ ] Update shipment status enum in schema (if using enum)
- [ ] Add to `src/lib/boutique/statusmapping.ts` if it exists
- [ ] Ensure all status transitions are valid

---

### ❌ 7. Missing Email Templates

**Issue**: Some email notifications don't have corresponding functions

**Missing**:
- [ ] `sendWarehouseReturnApprovedNotification()` - ✓ Referenced but check if it exists
- [ ] `sendWarehouseReturnRejectedNotification()` - ✓ Missing, needed for deny
- [ ] `sendWarehouseReturnShippedNotification()` - ✓ Referenced but removed from code

**Check**: `/src/lib/email.ts` for these functions

---

### ❌ 8. Missing Terms & Conditions Integration

**Issue**: User says it should be in T&C but no integration point

**Missing**:
- [ ] T&C page updated with warehouse return fee info
- [ ] Modal links to relevant T&C section
- [ ] Checkbox to accept before request

---

### ❌ 9. Missing Cron Job Updates

**Issue**: Auto-return at Day 180 might conflict with new workflow

**Check**:
- [ ] `/src/app/api/cron/boutique-storage-fees` - does it still use old logic?
- [ ] Should it also create PENDING_ADMIN_REVIEW instead of instant -2?
- [ ] Or is auto-return a different flow?

---

### ❌ 10. Missing -2 Variant Filtering

**Issue**: -2 variants will appear in inventory lists

**Missing**:
- [ ] Filter out -2 variants from seller/admin product inventory views
- [ ] They should only show in return-specific views
- [ ] Update queries to exclude quantity = -2

---

### ❌ 11. Missing Endpoint for Seller to Cancel Pending Request

**Issue**: Seller requests return, then realizes it's a mistake - can't cancel

**Missing Endpoint**:
- [ ] POST `/api/boutique/seller/cancel-return/{productId}` (only valid if PENDING_ADMIN_REVIEW)

**What it should do**:
```typescript
// Can only cancel if status = PENDING_ADMIN_REVIEW
// If already APPROVED_BY_ADMIN, must contact support
// Actions:
// 1. Delete shipment
// 2. Set product.fullReturnEnabled = false
// 3. Reset product status to LIVE
```

---

### ❌ 12. Missing Data Validation for Shipment Creation

**Issue**: No validation that -2 variant count matches expected fee

**Missing**:
- [ ] Verify -2 variants created = number of original variants × adminFeePerVariant
- [ ] Validation in approveWarehouseReturn() function

---

### ❌ 13. Missing Response Endpoints Refactor

**Issue**: Old endpoints still reference old shipment statuses

**Check**:
- [ ] `/api/boutique/seller/returned/{productId}/received` - uses SHIPPED_BY_ADMIN ✓
- [ ] `/api/boutique/admin/returned/{productId}/confirm` - uses COMPLETED ✓

---

## Summary of Missing Implementations

### High Priority (Blocking Workflow)
1. ✅ API Endpoints - Created
2. ❌ Admin warehouse-returns dashboard page
3. ❌ Admin reject return endpoint
4. ❌ Seller request verification modal
5. ❌ Seller return tracking page

### Medium Priority (Better UX)
6. ❌ Seller cancel pending request endpoint
7. ❌ Terms & Conditions integration
8. ❌ Email notification functions
9. ❌ Shipment status configuration update

### Low Priority (Data Quality)
10. ❌ -2 variant filtering in lists
11. ❌ Validation for -2 variant count
12. ❌ Cron job compatibility check

---

## Implementation Checklist

### UI Components Needed
- [ ] AdminWarehouseReturnsPage
- [ ] SellerReturnRequestModal
- [ ] SellerReturnsTrackingPage
- [ ] ReturnStatusBadge component

### API Endpoints Needed
- [ ] POST /api/boutique/admin/reject-return (NEW)
- [ ] POST /api/boutique/seller/cancel-return/{id} (NEW)

### Functions Needed
- [ ] sendWarehouseReturnRejectedNotification()

### Database Validations
- [ ] -2 variant count validation
- [ ] Shipment status enum/constants

### Documentation Updates
- [ ] T&C section on warehouse return fees
- [ ] Email template updates
