# Warehouse Return UI Implementation Guide

## 🎯 Three Critical Pages Needed

---

## 1️⃣ Admin Warehouse Returns Dashboard

**File:** `/src/app/admin/boutique/warehouse-returns/page.tsx`

### Purpose:
Admin dashboard to manage pending warehouse returns

### Data to Display:
- List of PENDING_ADMIN_REVIEW shipments
- Product info (title, seller, days in warehouse)
- Fee breakdown (amount based on days)
- Timeline info

### Features:
- Filter by status (PENDING, APPROVED, SHIPPED, etc.)
- Sort by days in warehouse
- Action buttons:
  - ✅ **Approve** → POST `/api/boutique/admin/approve-return`
  - ❌ **Reject** with reason dropdown
  - 📦 **Ship** → Modal for carrier/tracking/delivery date
  - ✓ **Confirm Complete** (only for RECEIVED_BY_SELLER)

### Key API Calls:
```typescript
// Get pending returns
const shipments = await prisma.sellerToAdminShipment.findMany({
  where: { status: 'PENDING_ADMIN_REVIEW' },
  include: { products: { include: { seller: true } } }
})

// Approve
POST /api/boutique/admin/approve-return
Body: { productId, notes? }

// Reject
POST /api/boutique/admin/reject-return
Body: { productId, reason }

// Ship
POST /api/boutique/admin/ship-return
Body: { productId, trackingNumber?, carrier?, estimatedDelivery? }

// Confirm
POST /api/boutique/admin/returned/[productId]/confirm
Body: { notes? }
```

### UI Components Needed:
- Shipment list table/cards
- Fee calculator display
- Reject reason modal
- Ship info modal (carrier, tracking, ETA)
- Status badges (PENDING, APPROVED, SHIPPED, RECEIVED, COMPLETED)

---

## 2️⃣ Seller Return Request Modal

**File:** `/src/app/seller/boutique/warehouse-inventory/page.tsx` (integrate)

### Purpose:
Modal that appears when seller clicks "Request Return" on a product

### Data to Display:
- Product title & image
- Current days in warehouse
- Admin fee amount (2 or 1 unit based on days)
- Terms warning: "⚠️ This fee is irreversible once admin approves"
- Breakdown:
  - Days 0-119: 2 units deducted
  - Days 120-180: 1 unit deducted

### Features:
- Display fee breakdown clearly
- Required checkbox: "I understand the fee is irreversible"
- Cancel button
- Confirm button → POST `/api/boutique/seller/request-return`
- Handle response showing requiresApproval and feeInfo

### Key API Calls:
```typescript
// Submit request
POST /api/boutique/seller/request-return
Body: { productId }
Response: {
  success: true,
  requiresApproval: true,
  feeInfo: {
    adminFeePerVariant: 2 or 1,
    daysInWarehouse: number,
    unitsDeducted: number
  }
}
```

### UI Components Needed:
- Modal with fee breakdown
- Styled warning box
- Fee amount display (bold/prominent)
- Terms & conditions checkbox
- Confirm/Cancel buttons
- Toast notification on success

### Logic Flow:
```
Seller clicks "Request Return"
  ↓
Modal opens with fee info
  ↓
Seller checks "I understand"
  ↓
Seller clicks Confirm
  ↓
POST /api/boutique/seller/request-return
  ↓
Show "Request submitted. Awaiting admin approval"
  ↓
Close modal & refresh inventory
```

---

## 3️⃣ Seller Return Tracking Page

**File:** `/src/app/seller/boutique/returns/page.tsx` (NEW)

### Purpose:
Track all return requests from request to completion

### Data to Display per Return:
- Product title & image
- Status timeline:
  - 1. Pending Admin Review
  - 2. Approved by Admin
  - 3. Shipped by Admin
  - 4. Received by Seller
  - 5. Completed
- Days since submission
- Fee amount & deduction date
- Tracking info (when shipped):
  - Carrier
  - Tracking number
  - Estimated delivery

### Features:
- List view or card view
- Status badges with colors
- Timeline visualization
- Action buttons:
  - **Cancel** (only if PENDING_ADMIN_REVIEW) → POST `/api/boutique/seller/cancel-return`
  - **View Tracking** (if SHIPPED_BY_ADMIN)
  - **Mark Received** (if SHIPPED_BY_ADMIN) → POST `/api/boutique/seller/returned/[productId]/received`
- Filter by status
- Sort by date

### Key API Calls:
```typescript
// Get all returns
const shipments = await prisma.sellerToAdminShipment.findMany({
  where: {
    sellerId: session.user.id,
    status: { in: ['PENDING_ADMIN_REVIEW', 'APPROVED_BY_ADMIN', 'SHIPPED_BY_ADMIN', 'RECEIVED_BY_SELLER', 'COMPLETED'] }
  },
  include: { products: true }
})

// Cancel pending return
POST /api/boutique/seller/cancel-return
Body: { productId }

// Mark as received
POST /api/boutique/seller/returned/[productId]/received
Body: {}
```

### UI Components Needed:
- Return card/table with all info
- Timeline component (5 steps)
- Status badge with colors:
  - Yellow: PENDING_ADMIN_REVIEW
  - Blue: APPROVED_BY_ADMIN
  - Green: SHIPPED_BY_ADMIN
  - Purple: RECEIVED_BY_SELLER
  - Gray: COMPLETED
- Tracking section (collapsible)
- Action buttons
- Empty state message

### Logic Flow:
```
Seller navigates to /seller/boutique/returns
  ↓
Fetch all return shipments
  ↓
Display each with:
  - Product info
  - Current status (highlighted)
  - Timeline progress
  - Relevant actions
  ↓
If SHIPPED:
  - Show tracking info
  - "Mark Received" button
  ↓
If PENDING:
  - Show "Cancel" button
  ↓
If COMPLETED:
  - Show fee amount deducted
  - Completion date
```

---

## 📋 Integration Points

### In Warehouse Inventory Page:
Add "Request Return" button to each product card
```tsx
<Button
  variant="outline"
  onClick={() => openReturnModal(product.id, product.daysInWarehouse)}
>
  Request Return
</Button>
```

### New Page Routes:
```
/admin/boutique/warehouse-returns → Admin Dashboard
/seller/boutique/returns → Seller Tracking
```

### Modal Integration:
- Warehouse inventory page imports the modal
- Can be triggered from product card button
- OR from bulk action on multiple products

---

## 🔄 Data State Management

### Admin Dashboard State:
```typescript
const [shipments, setShipments] = useState([])
const [selectedShipment, setSelectedShipment] = useState(null)
const [isApproving, setIsApproving] = useState(false)
const [rejectReason, setRejectReason] = useState('')
const [showShipModal, setShowShipModal] = useState(false)
```

### Seller Modal State:
```typescript
const [showReturnModal, setShowReturnModal] = useState(false)
const [selectedProduct, setSelectedProduct] = useState(null)
const [agreedToTerms, setAgreedToTerms] = useState(false)
const [isSubmitting, setIsSubmitting] = useState(false)
```

### Seller Tracking State:
```typescript
const [returns, setReturns] = useState([])
const [filterStatus, setFilterStatus] = useState('all')
const [isLoading, setIsLoading] = useState(true)
```

---

## 🎨 Design Considerations

### Colors:
- Pending: Amber (#FCD34D)
- Approved: Blue (#3B82F6)
- Shipped: Green (#10B981)
- Received: Purple (#A78BFA)
- Completed: Gray (#9CA3AF)

### Typography:
- Timeline labels: Monospace or code font
- Fee amounts: Bold, larger font
- Days in warehouse: `180/360` format

### Layout:
- Admin dashboard: Wide table or card grid
- Seller modal: Centered modal (400px)
- Seller tracking: Card-based layout with timeline

---

## 🧪 Testing Scenarios

### Admin Dashboard:
1. Load pending returns (should show 0+ items)
2. Click Approve → Verify -2 variant created
3. Click Reject → Verify email sent
4. Fill ship form → Verify email sent
5. Click Confirm → Verify -2 variant deleted

### Seller Modal:
1. Open modal for product at Day 50 → Show "2 units" fee
2. Open modal for product at Day 150 → Show "1 unit" fee
3. Submit without terms check → Show error
4. Submit with terms → POST to API

### Seller Tracking:
1. Show empty state (no returns)
2. Add pending return → Show in list
3. Admin approves → Status changes
4. Admin ships → Show tracking
5. Mark received → Status updates
6. Admin confirms → Show completed

---

## 🚀 Implementation Priority

### Phase 1 (Critical):
1. Admin dashboard (to approve/reject)
2. Seller modal (to request)
3. Seller tracking (to follow up)

### Phase 2 (Nice to have):
1. Bulk actions (approve multiple)
2. Email preview (for testing)
3. Seller messaging (for disputes)

---

**Note:** All three pages require fetching current return status from endpoints. Use SWR/TanStack Query for real-time updates. Consider adding polling every 30 seconds to keep status fresh on tracking page.
