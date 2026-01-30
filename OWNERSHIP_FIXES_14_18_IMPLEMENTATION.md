# OWNERSHIP Flaws #14-18 - Implementation Guide

**Status:** Fixes implemented for P0 flaws (#17, #14, #15)  
**Date:** January 28, 2026

---

## What Was Fixed

### ✅ Flaw #17: Admin Approval Without Preview (FIXED)
**File:** [src/lib/ownership-documents.ts](src/lib/ownership-documents.ts)  
**Change:** Added validation in `approveOwnershipDocument()` to require preview file

**Before:**
```typescript
// Could approve with no preview!
status: 'APPROVED'
```

**After:**
```typescript
// FLAW FIX #17: Ensure preview file exists
if (!documentCheck.previewFileUrl || !documentCheck.previewFileType) {
  throw new Error('Cannot approve document without preview file...')
}
```

---

### ✅ Flaw #14: Design Ownership State Inconsistency (FIXED)
**Files:**
- [src/lib/ownership-validation.ts](src/lib/ownership-validation.ts) (NEW)
- [src/lib/ownership-escrow.ts](src/lib/ownership-escrow.ts) (updated)
- [scripts/repair-ownership-state.mjs](scripts/repair-ownership-state.mjs) (NEW)

**New Functions:**
1. `validateDesignOwnershipState()` - Check if state is consistent
2. `repairDesignOwnershipState()` - Fix orphaned designs
3. `getDesignContracts()` - Query contracts for validation

**Validation Logic:**
```typescript
// Expected: isOwned = true IFF activeContracts > 0
const activeContracts = await countContracts(designId)
const expectedOwned = activeContracts > 0
const isValid = design.isOwned === expectedOwned
```

**Maintenance Script:**
```bash
# Dry run: show issues without fixing
node scripts/repair-ownership-state.mjs --dry-run

# Fix issues
node scripts/repair-ownership-state.mjs

# Check specific design
node scripts/repair-ownership-state.mjs --designId=UUID
```

---

### ✅ Flaw #15: Concurrent Cancel/Release Race Condition (FIXED)
**File:** [src/lib/ownership-escrow.ts](src/lib/ownership-escrow.ts)  
**Changes:** Updated both `cancelOwnershipPurchase()` and `completeEscrowPeriod()`

**Key Improvements:**
1. Atomic transaction wraps entire operation
2. Checks `purchase.status` field (not just time)
3. Prevents simultaneous cancel + release
4. Idempotent: Can't process twice

**Before:**
```typescript
// Time-based check only (vulnerable to race)
if (!escrowStatus.isInEscrow) return error
```

**After:**
```typescript
await prisma.$transaction(async (tx) => {
  // Atomic checks within transaction
  if (purchase.status === 'RELEASED') throw error
  if (new Date() >= escrowEnd) throw error
  
  // Atomically mark as cancelled
  await tx.purchase.update({ status: 'CANCELLED' })
})
```

---

## What Still Needs Fixing

### ⏳ Flaw #16: Cloudinary Cleanup Failures (P1)
**File:** [src/lib/cloudinary-cleanup.ts](src/lib/cloudinary-cleanup.ts) (NEW - ready to integrate)

**Status:** Implemented but not yet integrated into rejection flow

**Integration Steps:**
1. Import in `src/lib/ownership-documents.ts`
2. Replace `deleteFromCloudinary()` with `deleteFromCloudinaryWithRetry()`
3. Add `cloudinaryDeleteLog` table to schema
4. Create admin script to retry failed deletions

**Implementation:**
```typescript
import { deleteFromCloudinaryWithRetry, logCloudinaryDeleteFailure } from './cloudinary-cleanup'

async function rejectOwnershipDocument(...) {
  const result = await deleteFromCloudinaryWithRetry(document.previewFileUrl)
  
  if (!result.success) {
    await logCloudinaryDeleteFailure(
      prisma,
      documentId,
      document.previewFileUrl,
      result.error
    )
  }
}
```

---

### ⏳ Flaw #18: Missing Purchase/Contract Linkage (P2)
**File:** `prisma/schema.prisma`

**Status:** Requires schema migration

**Required Change:**
```prisma
model OwnershipContract {
  // ADD THIS:
  purchaseId String @unique @db.ObjectId
  purchase Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  
  // Keep existing:
  ownershipDocumentId String
  buyerId String
  // ...
}
```

**Migration Steps:**
1. Create migration: `npx prisma migrate dev --name add_purchase_id_to_contract`
2. Backfill existing contracts: Create script to find matching purchase by (designId, buyerId)
3. Add unique constraint: `@@unique([purchaseId])`
4. Update queries to use `purchaseId` directly

---

## New Files Created

### 1. [src/lib/ownership-validation.ts](src/lib/ownership-validation.ts) (NEW)
Helper functions for validating ownership state:
- `validateDesignOwnershipState()` - Check consistency
- `repairDesignOwnershipState()` - Fix orphaned state
- `validateDocumentHasPreview()` - Ensure preview exists
- `isInEscrowAtomically()` - Database-backed escrow check
- `atomicallyCancelPurchase()` - Transaction-based cancel

**Usage:**
```typescript
import {
  validateDesignOwnershipState,
  validateDocumentHasPreview,
  isInEscrowAtomically
} from '@/lib/ownership-validation'

// Check state consistency
const validation = await validateDesignOwnershipState(designId)
if (!validation.isValid) {
  // Design is orphaned!
}

// Validate preview before approval
const preview = await validateDocumentHasPreview(documentId)
if (!preview.hasPreview) {
  throw new Error(preview.error)
}

// Check escrow atomically
const escrow = await isInEscrowAtomically(purchaseId)
if (!escrow.canCancel) {
  throw new Error('Cannot cancel - escrow expired')
}
```

### 2. [src/lib/cloudinary-cleanup.ts](src/lib/cloudinary-cleanup.ts) (NEW)
Cloudinary file deletion with retry logic:
- `deleteFromCloudinaryWithRetry()` - Delete with backoff
- `logCloudinaryDeleteFailure()` - Log to DB for manual review
- `findOrphanedCloudinaryFiles()` - Find failed deletions

**Usage:**
```typescript
import { deleteFromCloudinaryWithRetry } from '@/lib/cloudinary-cleanup'

const result = await deleteFromCloudinaryWithRetry(fileUrl, maxRetries = 3)

if (!result.success) {
  console.error(`Failed after ${result.attempts} attempts: ${result.error}`)
  // Log for manual review
}
```

### 3. [scripts/repair-ownership-state.mjs](scripts/repair-ownership-state.mjs) (NEW)
Maintenance script to fix orphaned ownership states:

**Usage:**
```bash
# Dry run
node scripts/repair-ownership-state.mjs --dry-run

# Fix all issues
node scripts/repair-ownership-state.mjs

# Check specific design
node scripts/repair-ownership-state.mjs --designId=abc123
```

---

## Testing the Fixes

### Test #17: Admin Approval Without Preview
```typescript
// Test: Approve without preview should fail
const doc = await createOwnershipDocument(designId, sellerId, ...)
// Don't upload preview

const error = await approveOwnershipDocument(doc.id, adminId)
// Should throw: "Cannot approve document without preview file"
```

### Test #14: Ownership State Validation
```typescript
// Test: Check design with orphaned state
const validation = await validateDesignOwnershipState(designId)
console.assert(!validation.isValid) // Should be invalid

// Fix it
const repair = await repairDesignOwnershipState(designId)
console.assert(repair.fixed === true)

// Verify now valid
const recheck = await validateDesignOwnershipState(designId)
console.assert(recheck.isValid) // Should be valid now
```

### Test #15: Cancel/Release Race Condition
```typescript
// Test: Simultaneous cancel + release should only process one
const purchaseId = await createOwnershipPurchase(...)

// Simulate race condition
const [cancelResult, releaseResult] = await Promise.all([
  cancelOwnershipPurchase(purchaseId, buyerId),
  completeEscrowPeriod(purchaseId)
])

// Only one should succeed
console.assert(
  (cancelResult.success && !releaseResult.success) ||
  (!cancelResult.success && releaseResult.success)
)
```

---

## Database Schema Updates Needed

### For Flaw #16: CloudinaryDeleteLog Table
Add to `prisma/schema.prisma`:
```prisma
model CloudinaryDeleteLog {
  id String @id @default(auto()) @map("_id") @db.ObjectId
  
  documentId String @db.ObjectId
  document OwnershipDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  fileUrl String @unique
  status String @default("PENDING") // PENDING | SUCCESS | FAILED
  attempts Int @default(1)
  lastError String?
  
  markedForManualReview Boolean @default(false)
  
  createdAt DateTime @default(now())
  lastAttemptAt DateTime?
  deletedAt DateTime?
  
  @@index([status])
  @@index([markedForManualReview])
}
```

### For Flaw #15: Purchase Status Field Enhancement
Ensure `Purchase` model has status field:
```prisma
model Purchase {
  // ... existing fields ...
  status String @default("ACTIVE") // ACTIVE | RELEASED | CANCELLED | COMPLETED
  cancelledAt DateTime?
  releasedAt DateTime?
  
  @@index([status])
}
```

### For Flaw #18 (Future): Add purchaseId to OwnershipContract
```prisma
model OwnershipContract {
  purchaseId String @unique @db.ObjectId
  purchase Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  
  @@unique([purchaseId])
}
```

---

## Deployment Checklist

### Before Deploying
- [ ] Review all 3 code changes (documents.ts, escrow.ts, new files)
- [ ] Run TypeScript: `npm run type-check`
- [ ] Run tests if exists: `npm test`
- [ ] Test Flaw #17: Try approving without preview (should fail)
- [ ] Test Flaw #14: Run repair script on staging
- [ ] Test Flaw #15: Test cancel during escrow

### Deployment Steps
1. [ ] Merge code changes
2. [ ] Deploy to staging
3. [ ] Run migration for CloudinaryDeleteLog (if using #16 fix)
4. [ ] Test all 3 fixes on staging
5. [ ] Deploy to production
6. [ ] Run repair script on production: `node scripts/repair-ownership-state.mjs`
7. [ ] Monitor logs for any errors

### Post-Deployment
- [ ] Verify no new errors in logs
- [ ] Test cancellations still work
- [ ] Test approvals require preview
- [ ] Set up cron for auto-release (if not exists)

---

## Summary

### What's Done
✅ Flaw #17: Preview validation before approval  
✅ Flaw #14: Ownership state consistency + repair script  
✅ Flaw #15: Atomic cancel/release to prevent race conditions

### What's Ready to Integrate
⏳ Flaw #16: Cloudinary cleanup with retry (ready, needs schema + integration)

### What Needs Planning
⏳ Flaw #18: Schema migration for purchaseId (needs backfill script + testing)

---

**Total Implementation Time:** 3-4 hours for P0 fixes  
**Schema Changes Needed:** 2 tables (CloudinaryDeleteLog, Purchase.status field)  
**Files Modified:** 3 core files + 3 new utilities  
**Breaking Changes:** None (all backward compatible)

