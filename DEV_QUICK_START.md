# Commission & Payments - Developer Quick Start

## 🚀 Get Started in 15 Minutes

### Step 1: Understand the System (5 min)

**Commission Model:**
```
Sellers pay commission based on monthly sales:
- ₦0-99k GMV → 15%
- ₦100k-500k → 12% 
- ₦500k-1M → 10%
- ₦1M+ → 8%
```

**Key Files:**
```
lib/commission-calculator.ts      ← All calculation logic
components/seller/*.tsx           ← Seller UI components
components/admin/*.tsx            ← Admin UI components
app/seller/payouts/               ← Seller pages
app/admin/payments/               ← Admin pages
api/admin/payment-reconciliation/ ← Backend API
```

### Step 2: Copy Files (5 min)

```bash
# Copy the utility
cp src/lib/commission-calculator.ts [your-project]/src/lib/

# Copy components
cp src/components/seller/*.tsx [your-project]/src/components/seller/
cp src/components/admin/*.tsx [your-project]/src/components/admin/

# Copy pages/API
cp -r src/app/seller/payouts [your-project]/src/app/seller/
cp -r src/app/seller/payments [your-project]/src/app/seller/
cp -r src/app/admin/payments [your-project]/src/app/admin/
cp -r src/app/api/admin/payment-reconciliation [your-project]/src/app/api/admin/
```

### Step 3: Update Database (3 min)

Edit `prisma/schema.prisma`:

```prisma
model Order {
  // ... existing fields
  commission    Float?     // Platform fee
  sellerPayout  Float?     // What seller receives
}

model SellerEarning {
  id        String   @id @default(cuid()) @map("_id")
  userId    String
  orderId   String?
  amount    Float    // Net amount
  commission Float   // Fee deducted
  isPaid    Boolean  @default(false)
  createdAt DateTime @default(now())
  paidAt    DateTime?
  
  user      User     @relation(fields: [userId], references: [id])
  order     Order?   @relation(fields: [orderId], references: [id])
}
```

Then run: `npx prisma db push`

### Step 4: Test (2 min)

```bash
npm run type-check
npm run dev
# Visit http://localhost:3000/seller/payouts
```

✅ Done! System is ready to integrate.

---

## 💻 Code Snippets

### Calculate Commission for an Order

```typescript
import { calculateOrderTotal } from '@/lib/commission-calculator'

// When creating an order
const subtotal = 100000
const monthlyGMV = 200000  // Seller's current GMV

const breakdown = calculateOrderTotal(
  subtotal,
  5000,    // shipping
  0,       // tax
  0,       // discount
  monthlyGMV
)

// Save to database
await prisma.order.create({
  data: {
    subtotal,
    commission: breakdown.platformFee,      // 12000
    sellerPayout: breakdown.sellerPayout,   // 88000
    total: breakdown.total,                 // 105000
    // ... other fields
  }
})

// Create earning record
await prisma.sellerEarning.create({
  data: {
    userId: sellerId,
    orderId: order.id,
    amount: breakdown.sellerPayout,
    commission: breakdown.platformFee,
    isPaid: false
  }
})
```

### Get Current Commission Rate

```typescript
import { getCommissionRate, getGMVToNextTier } from '@/lib/commission-calculator'

// Get seller's current tier
const monthlyGMV = 250000
const rate = getCommissionRate(monthlyGMV)

console.log(rate.percentage)     // 12
console.log(rate.description)    // "Silver (₦100k-₦500k GMV)"

// Show progress to next tier
const next = getGMVToNextTier(monthlyGMV)
console.log(next.nextTier)       // "Gold (₦500k-₦1M GMV)"
console.log(next.remaining)      // 250000 (need ₦250k more)
```

### Add Widget to Any Page

```typescript
import { CommissionCalculatorWidget } from '@/components/seller/commission-calculator-widget'

export default function ProductPage() {
  return (
    <>
      <h1>Your Product</h1>
      {/* Add this widget */}
      <CommissionCalculatorWidget currentMonthlyGMV={500000} />
    </>
  )
}
```

### Fetch Admin Reconciliation Data

```typescript
// In admin component
const [data, setData] = useState(null)

useEffect(() => {
  const fetchData = async () => {
    const res = await fetch('/api/admin/payment-reconciliation?month=2024-01&status=pending')
    setData(await res.json())
  }
  fetchData()
}, [])

// Use data
if (data) {
  console.log(data.summary.totalAmount)    // Revenue
  console.log(data.summary.totalPending)   // Pending
  console.log(data.transactions)           // All transactions
}
```

---

## 🗂️ Component Map

### Seller Components

**CommissionCalculatorWidget**
- Real-time earnings preview
- Shows current tier
- Adjustable inputs
- Next tier info

**CommissionBreakdown**
- Full earnings breakdown
- Payment schedule
- Tier comparison
- Deductions explained

**PaymentAuditTrail**
- Transaction history
- Filterable by type/status
- Expandable details
- CSV export

### Admin Components

**PaymentReconciliationDashboard**
- Summary cards
- Trend charts
- Transactions table
- Mark as paid button

---

## 📊 Database Models

### SellerEarning
```typescript
{
  id: "earning_123",
  userId: "seller_456",
  orderId: "order_789",
  amount: 88000,           // What seller gets
  commission: 12000,       // Platform fee
  isPaid: false,           // Payment status
  createdAt: "2024-01-15",
  paidAt: null
}
```

### Order (additions)
```typescript
{
  // ... existing fields
  commission: 12000,       // Platform commission
  sellerPayout: 88000      // Seller net amount
}
```

---

## 🔗 Routes

### Seller Routes
```
GET /seller/payouts                 → Dashboard
GET /seller/payments/audit-trail    → Transactions
```

### Admin Routes
```
GET /admin/payments/reconciliation  → Dashboard
```

### API Routes
```
GET  /api/admin/payment-reconciliation
     ?month=2024-01&status=pending

POST /api/admin/payment-reconciliation
     { earningIds: [...], paymentDate: "..." }
```

---

## ✨ Features by Flaw

### Flaw 8: Commission Visibility ✅

**What sellers see:**
- Real-time commission calculator
- Current tier (15%, 12%, 10%, 8%)
- How much they earn per sale
- Payment schedule timeline
- Tier comparison table
- Complete transaction history
- What's being deducted and why

**Components involved:**
- CommissionCalculatorWidget
- CommissionBreakdown
- PaymentAuditTrail

### Flaw 5: Payment Precision ✅

**What admins see:**
- All payments in one dashboard
- Daily revenue trends
- Payment method breakdown
- Seller payment summary
- Filter by month/status
- Mark earnings as paid
- Export for accounting

**Components involved:**
- PaymentReconciliationDashboard
- API endpoint with aggregations

---

## 🧪 Quick Tests

### Test Commission Calculation
```typescript
import { calculateOrderTotal } from '@/lib/commission-calculator'

const result = calculateOrderTotal(100000, 0, 0, 0, 150000)
expect(result.platformFee).toBe(12000)      // 12% commission
expect(result.sellerPayout).toBe(88000)
```

### Test API
```typescript
const res = await fetch('/api/admin/payment-reconciliation')
expect(res.status).toBe(200 or 401)  // Depends on auth
```

### Test Components
```typescript
render(<CommissionCalculatorWidget currentMonthlyGMV={200000} />)
expect(screen.getByText('Silver')).toBeInTheDocument()
```

---

## 🚨 Common Gotchas

1. **GMV Calculation**
   - Must be last 30 days only
   - Include completed orders only
   - Exclude refunds/chargebacks

2. **Commission Tiers**
   - Check correct thresholds
   - Remember: Higher sales = Lower % 
   - Tier 0 is default/fallback

3. **API Access**
   - Admin routes require `session.user.role === 'ADMIN'`
   - Seller routes require authentication
   - Always validate session server-side

4. **Database**
   - SellerEarning must have userId
   - Order commission is calculated once
   - isPaid flag controls payout status

---

## 📚 Read More

- **Full docs**: [COMMISSION_PAYMENT_DOCS.md](COMMISSION_PAYMENT_DOCS.md)
- **Integration**: [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- **Testing**: [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)
- **UI Reference**: [UI_COMPONENTS_REFERENCE.md](UI_COMPONENTS_REFERENCE.md)
- **Complete Overview**: [COMPLETE_IMPLEMENTATION_SUMMARY.md](COMPLETE_IMPLEMENTATION_SUMMARY.md)
- **Navigation Guide**: [COMMISSION_SYSTEMS_INDEX.md](COMMISSION_SYSTEMS_INDEX.md)

---

## 🎯 Next Steps

1. ✅ Understand commission structure
2. ✅ Copy files to project
3. ✅ Update database schema
4. ✅ Test locally
5. → Integrate with order creation
6. → Add email notifications
7. → Set up monthly payout job
8. → Deploy & monitor

---

**Status:** Ready to integrate
**Time estimate:** 2-4 hours
**Difficulty:** Medium
**Priority:** High
