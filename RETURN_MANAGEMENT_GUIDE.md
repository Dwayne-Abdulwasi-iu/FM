# Return Management System - Integration Guide

## Quick Start

### For Admin
1. Go to **Admin → Boutique → Rejected Products**
2. Click **Send Email** to notify seller (optional, email only)
3. Click **Return Item** to create return shipment when ready
4. Go to **Admin → Boutique → Rejected Products - Return Tracking** to monitor progress
5. When seller confirms receipt, click **Verify & Complete** to finish return

### For Sellers
1. Receive rejection email with product details
2. Go to **Seller → Boutique → Returned** tab
3. See products marked for return
4. When you have the product back, click **Received Successfully**
5. Wait for admin to verify and mark complete

## Email Flow (No Longer Creates Shipments!)

```
Admin sends rejection email
         ↓
Seller receives email notification
         ↓
[Email ONLY - no shipment created yet]
         ↓
Admin manually clicks "Return Item"
         ↓
Return shipment created (once only)
```

## Return Lifecycle

### Status Flow
```
REJECTED
  ├─ Email sent (optional, multiple times possible)
  └─ Return Item button clicked by admin
       ↓
RETURN_IN_PROGRESS
  └─ Seller receives product back
       ↓
SELLER_RECEIVED
  └─ Admin confirms and verifies
       ↓
RETURNED_SUCCESSFUL ✓
```

### What Each Status Means

| Status | Who Sees It | Action |
|--------|------------|--------|
| `REJECTED` | Admin | Product failed QA, send email or return |
| `RETURN_IN_PROGRESS` | Both | Shipment in transit to seller |
| `SELLER_RECEIVED` | Admin | Seller has received the product back |
| `ADMIN_CONFIRMED` | Both | Admin verified return, process complete |
| `RETURNED_SUCCESSFUL` | Both | Return fully complete |

## API Usage Examples

### Admin Creates Return Shipment
```bash
POST /api/boutique/admin/rejected/{productId}/create-return
Authorization: Bearer {admin-session}

Response:
{
  "success": true,
  "message": "Return shipment created successfully",
  "shipment": { /* shipment details */ }
}
```

### Seller Marks Product Received
```bash
POST /api/boutique/seller/returned/{productId}/received
Authorization: Bearer {seller-session}

Response:
{
  "success": true,
  "message": "Product marked as received. Admin will verify next.",
  "product": { "status": "SELLER_RECEIVED" }
}
```

### Admin Confirms Return
```bash
POST /api/boutique/admin/returned/{productId}/confirm
Authorization: Bearer {admin-session}
Content-Type: application/json

Body:
{
  "notes": "Product verified, all items received in good condition"
}

Response:
{
  "success": true,
  "message": "Return completed and verified",
  "product": { "status": "RETURNED_SUCCESSFUL" }
}
```

## Key Improvements Over Previous System

### ❌ Old System
- ❌ Shipment created on EVERY email send
- ❌ Race condition: multiple shipments possible
- ❌ No state machine: could transition to wrong states
- ❌ No two-step verification
- ❌ No separate return tracking page
- ❌ Image thumbnails showed "cargo sign" on error

### ✅ New System
- ✅ Email and shipment are completely separate operations
- ✅ Shipment created ONCE when admin clicks Return Item
- ✅ Proper state machine prevents invalid transitions
- ✅ Two-step verification (seller → admin confirmation)
- ✅ Dedicated admin return tracking dashboard
- ✅ Proper image fallback with Package icon

## Error Handling

All endpoints return structured responses:

### Success
```json
{
  "success": true,
  "message": "Action completed",
  "product": { /* updated product */ }
}
```

### Error
```json
{
  "success": false,
  "message": "Specific error message",
  "status": 400 // HTTP status code
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Admin access required" | Not an admin | Use admin account |
| "Product not found" | Invalid product ID | Check product exists |
| "Product is not in rejected status" | Wrong product state | Must be REJECTED status |
| "A return shipment already exists" | Shipment already created | Check returns page |
| "Product must be marked as received by seller first" | Wrong order | Seller must confirm first |

## Debugging

### Check Return Tracking
```
Admin → Boutique → Rejected Products - Return Tracking
```

### Check Product Status
Look at the status badge and flow diagram in the return tracking page

### Check Shipment Info
Expanded details show:
- Shipment ID
- Shipment status
- Items expected/received
- Admin notes

## Testing Workflow

1. **Create test product** → Approve in content review → Mark as rejected
2. **Admin sends email** → Check email notification
3. **Admin clicks Return Item** → Check return tracking page (should appear)
4. **Seller marks received** → Status should change to SELLER_RECEIVED
5. **Admin confirms** → Status should change to RETURNED_SUCCESSFUL
6. **Verify complete** → Product should no longer show in return tracking

## Mobile Responsiveness

All pages are mobile-optimized:
- Text sizes scale automatically
- Buttons resize for touch
- Images maintain aspect ratios
- Collapsible sections reduce scrolling
- Touch-friendly spacing

## Caching & Real-Time Updates

- After any state change, lists automatically refresh
- Toast notifications show success/error
- Page updates happen immediately (no manual refresh needed)

## Future Considerations

- Consider adding email notifications at each step
- Add audit trail showing timestamp and user for each state change
- Implement automatic transitions based on time (e.g., auto-confirm if seller marks received for 48 hours)
- Add bulk operations (mark multiple returns complete)
- Analytics dashboard showing return statistics
