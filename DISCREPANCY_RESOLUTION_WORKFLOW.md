# Discrepancy Resolution Workflow: 30 Products Shipped, 10 Bad/Damaged

## Scenario
Seller ships 30 products to warehouse. Upon inspection, 10 are found to be damaged/bad.

---

## STEP 1️⃣: WAREHOUSE RECEIPT RECORDING
**Admin inspects shipment at warehouse**

```
Shipment Received:
- Items Expected: 30
- Items Received: 20 (good condition)
- Items Damaged: 10 (bad/damaged)
- Items Missing: 0

Status: PARTIAL_DELIVERY
Dispute Status: OPENED
```

**What Happens:**
- ✅ 20 good products → Status: `RECEIVED_BY_ADMIN` (ready for sale)
- ❌ 10 damaged products → Status: `REJECTED` with reason: "Damaged during shipping"
- 📧 **Seller Email Sent**: "Shipment Received with Discrepancy"
  - Shows: 20/30 items received
  - Shows: 10 damaged
  - Alerts: "A dispute has been opened to investigate"

### Database Changes:
```typescript
sellerToAdminShipment {
  status: "PARTIAL_DELIVERY"
  itemsReceived: 20
  itemsDamaged: 10
  itemsMissing: 0
  hasDiscrepancy: true
  disputeStatus: "OPENED"
  disputeOpenedAt: <timestamp>
}

boutiqueProduct[20] {
  status: "RECEIVED_BY_ADMIN"
  warehouseReceivedAt: <timestamp>
}

boutiqueProduct[10] {
  status: "REJECTED"
  rejectionReason: "Damaged during shipping"
  rejectionDate: <timestamp>
}
```

---

## STEP 2️⃣: DISPUTE RESOLUTION
**Admin decides how to handle the damaged items**

### Option A: SELLER_FAULT
Admin determines: "Seller shipped damaged items - seller's fault"

```
PUT /api/boutique/admin/shipments/[id]/dispute
{
  resolution: "SELLER_FAULT",
  notes: "Products were already damaged when shipped",
  productActions: {
    product1: "CANCEL",
    product2: "CANCEL",
    // ... 10 products
  }
}
```

**Outcome:**
- All 10 damaged products → Status: `CANCELLED`
- 📧 **Seller Email**: "Dispute Resolved"
  - Message: "The discrepancy was determined to be due to seller error. No compensation will be provided."
  - Action: "Your account may be subject to review for compliance."
- **Financial Impact on Seller**: 
  - Loses platform fees on 10 products
  - May face reputation impact
  - 20 products still proceed to RECEIVED_BY_ADMIN → can go LIVE

---

### Option B: CARRIER_FAULT
Admin determines: "Carrier damaged items during shipping"

```
PUT /api/boutique/admin/shipments/[id]/dispute
{
  resolution: "CARRIER_FAULT",
  insuranceClaimId: "CLAIM-2026-001",
  insuranceClaimAmount: 500,
  notes: "Photos show damage from carrier handling",
  productActions: {
    product1: "CANCEL",
    product2: "CANCEL",
    // ... 10 products
  }
}
```

**Outcome:**
- All 10 damaged products → Status: `CANCELLED`
- 📧 **Seller Email**: "Dispute Resolved"
  - Message: "The carrier is responsible for the missing/damaged items. An insurance claim has been initiated."
  - Action: "You will receive compensation from the insurance claim once processed."
  - Insurance Claim ID: CLAIM-2026-001
  - Amount: $500
- **Financial Impact on Seller**: 
  - Seller gets compensated via insurance claim ($500)
  - 20 products still proceed → can go LIVE
  - Carrier/warehouse is liable for insurance deductible

---

### Option C: WRITTEN_OFF
Admin decides: "Accept as business loss, don't pursue further"

```
PUT /api/boutique/admin/shipments/[id]/dispute
{
  resolution: "WRITTEN_OFF",
  notes: "Standard attrition rate",
  productActions: {
    product1: "CANCEL",
    // ... 10 products
  }
}
```

**Outcome:**
- All 10 damaged products → Status: `CANCELLED`
- 📧 **Seller Email**: "Dispute Resolved"
  - Message: "The discrepancy has been written off as a business loss."
  - Action: "No further action is required."
- **Financial Impact on Seller**: 
  - No compensation
  - 20 products proceed → can go LIVE
  - Platform absorbs the loss

---

### Option D: SELLER_RESHIP
Admin demands: "Seller must ship replacement items"

```
PUT /api/boutique/admin/shipments/[id]/dispute
{
  resolution: "SELLER_RESHIP",
  notes: "Shipping seems excessive - seller must investigate and reship replacements",
  productActions: {
    product1: "RESHIP",
    product2: "RESHIP",
    // ... 10 products
  }
}
```

**Outcome:**
- All 10 damaged products → Status: `CONTENT_APPROVED` (reset)
- Shipment ID cleared: `shipmentId: null`
- 📧 **Seller Email**: "Dispute Resolved"
  - Message: "You have been requested to reship the missing items."
  - Action: "Please follow the reship instructions provided in your dashboard."
- **Process Repeats**: 
  - Seller must pack and ship 10 replacement items again
  - Goes through warehouse receipt process again
  - If they arrive good: Status → RECEIVED_BY_ADMIN
  - If damaged again: Another dispute opened
- **Financial Impact on Seller**: 
  - Must cover shipping costs for reship
  - Time delay in going to market
  - 20 products still proceed → can go LIVE

---

## FINAL STATE AFTER RESOLUTION

### Products Summary:
```
30 Total Products Shipped:

✅ 20 RECEIVED_BY_ADMIN
   - Ready to be transitioned to LIVE (for sale)
   - Generate revenue for seller

❌ 10 CANCELLED/REJECTED (depending on resolution)
   - SELLER_FAULT: No compensation
   - CARRIER_FAULT: Insurance claim ($500)
   - WRITTEN_OFF: No compensation
   - SELLER_RESHIP: Must send replacements
```

### Seller's View:
- Can see all 30 products in dashboard
- 20 show as "Ready for Sale" (RECEIVED_BY_ADMIN)
- 10 show as "Rejected" or "Awaiting Reship"
- Email received with detailed explanation
- If CARRIER_FAULT: Insurance claim tracking info
- If SELLER_RESHIP: Reship instructions

### Admin's View:
- Dispute marked as RESOLVED
- All product status changes logged
- Insurance claim (if any) tracked in shipment record
- Seller action documented
- Can view receipt photos and condition reports

---

## Email Flow Summary

| Step | Email To | Subject | Content |
|------|----------|---------|---------|
| 1. Receipt | Seller | "Shipment Received with Discrepancy" | 20/30 items, 10 damaged, dispute opened |
| 2. Resolution | Seller | "Dispute Resolved" | Outcome (SELLER_FAULT/CARRIER_FAULT/WRITTEN_OFF/SELLER_RESHIP) |
| Optional | Admin | Internal log | Product status changes |

---

## Key Data Structures

### SellerToAdminShipment
```typescript
{
  id: string
  sellerId: string
  productIds: string[] // [30 products]
  itemsExpected: 30
  itemsReceived: 20
  itemsMissing: 0
  itemsDamaged: 10
  status: "PARTIAL_DELIVERY"
  hasDiscrepancy: true
  disputeStatus: "OPENED" → "RESOLVED"
  disputeOpenedAt: <timestamp>
  disputeResolvedAt: <timestamp>
  disputeResolution: "SELLER_FAULT" | "CARRIER_FAULT" | "WRITTEN_OFF" | "SELLER_RESHIP"
  disputeNotes: string
  insuranceClaimId?: string // If CARRIER_FAULT
  insuranceClaimStatus?: "PENDING" | "APPROVED" | "REJECTED"
  insuranceClaimAmount?: number
}
```

### BoutiqueProduct (20 good ones)
```typescript
{
  status: "RECEIVED_BY_ADMIN"
  warehouseReceivedAt: <timestamp>
}
```

### BoutiqueProduct (10 damaged ones)
```typescript
{
  status: "REJECTED" | "CANCELLED" | "CONTENT_APPROVED" (if reship)
  rejectionReason: "Damaged during shipping" | "Dispute resolution"
  rejectionDate: <timestamp>
  physicalNotes: "Item inspection details"
}
```

---

## Timeline Example

```
Day 1, 10:00 AM
└─ Seller ships 30 products to warehouse

Day 3, 2:00 PM
└─ Admin receives shipment
   ├─ Inspects: 20 good, 10 damaged
   ├─ System Status: PARTIAL_DELIVERY, Dispute OPENED
   └─ 📧 Seller receives: "Received with Discrepancy" email

Day 3, 3:00 PM
└─ Admin reviews photos, notes damage
   ├─ Makes decision: CARRIER_FAULT
   ├─ Opens insurance claim #CLAIM-2026-001 ($500)
   └─ 📧 Seller receives: "Dispute Resolved - Carrier Fault"
       Message: "You will receive $500 from insurance claim"

Day 4, 9:00 AM
└─ Seller sees dispute resolution in dashboard
   ├─ 20 products now show: "Ready for Sale"
   ├─ 10 products show: "Rejected - Carrier Damage"
   └─ Insurance claim info visible

Day 10
└─ Insurance claim processed
   └─ Seller compensated $500

Day 15+
└─ 20 products transition to LIVE (for sale on marketplace)
```

---

## Summary

When a seller ships 30 products and 10 arrive damaged:

1. **Warehouse verifies**: Records 20 good, 10 bad
2. **System auto-opens dispute**: Seller notified
3. **Admin investigates**: Reviews photos, notes, condition report
4. **Admin resolves**: Chooses fault origin (seller, carrier, none)
5. **Action taken**: Cancels, compensates, or demands reship
6. **Products status updated**: Good ones → RECEIVED_BY_ADMIN, Bad ones → REJECTED/CANCELLED
7. **Seller notified**: Email with detailed explanation
8. **20 products proceed**: Can go to LIVE status and generate sales
9. **10 products handled**: Based on resolution (no sale, compensated, or reship needed)
