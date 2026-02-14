# Featured Items System - Implementation Guide

**Status**: Phase 1 Complete ✅  
**Date**: January 30, 2026

## Overview

A comprehensive featured items system that gives sellers control over showcasing 6 designs and 6 boutique products, while giving admins unlimited curation power.

---

## Database Schema ✅

### New Models Added to `prisma/schema.prisma`:

#### 1. **FeaturedDesign**
```prisma
model FeaturedDesign {
  id       String   @id @default(cuid())
  designId String   (unique per seller)
  sellerId String   (seller's featured list)
  position Int      (1-6 for sorting)
  design   Design   (relation)
  seller   User     (relation)
}
```
- **Purpose**: Sellers select 6 designs they want featured in their portfolio
- **Unique Constraint**: Each seller, each design - only once
- **Max Limit**: 6 per seller

#### 2. **FeaturedBoutiqueProduct**
```prisma
model FeaturedBoutiqueProduct {
  id        String   @id @default(cuid())
  productId String   (unique per seller)
  sellerId  String   (seller's featured list)
  position  Int      (1-6 for sorting)
  product   BoutiqueProduct (relation)
  seller    User     (relation)
}
```
- **Purpose**: Sellers select 6 boutique products featured in their boutique storefront
- **Unique Constraint**: Each seller, each product - only once
- **Max Limit**: 6 per seller

#### 3. **AdminFeaturedItem**
```prisma
model AdminFeaturedItem {
  id        String   @id @default(cuid())
  type      String   ("DESIGN" or "BOUTIQUE")
  itemId    String   (Design ID or Product ID)
  sellerId  String   (for admin visibility)
  position  Int      (sort order on platform)
  featured  Boolean  (soft delete - archive)
  addedBy   String   (admin ID who featured it)
  seller    User     (relation)
}
```
- **Purpose**: Admin curates unlimited items on platform homepage
- **No Limit**: Can feature unlimited items
- **Soft Delete**: Featured flag instead of hard delete

---

## Relations Added

### User Model
```typescript
// Featured items (seller-selected)
featuredDesigns        FeaturedDesign[] @relation("FeaturedDesignsAsOwner")
featuredBoutiqueProducts FeaturedBoutiqueProduct[] @relation("FeaturedBoutiqueProductsAsOwner")
adminFeaturedItems     AdminFeaturedItem[] @relation("AdminFeaturedItems")
```

### Design Model
```typescript
// Featured designs (seller-selected)
featuredIn FeaturedDesign? @relation("FeaturedDesigns")
```

### BoutiqueProduct Model
```typescript
// Featured products (seller-selected)
featuredIn FeaturedBoutiqueProduct? @relation("FeaturedBoutiqueProducts")
```

---

## API Endpoints ✅

### **1. Seller - Featured Designs**

#### GET `/api/seller/featured-designs`
**Purpose**: Get seller's featured designs (6 max) + available designs to feature

**Response**:
```json
{
  "featuredDesigns": [
    {
      "id": "featured_123",
      "position": 1,
      "design": {
        "id": "design_456",
        "title": "Summer Vibes",
        "imageUrl": "...",
        "price": 25.99,
        "totalSales": 45
      }
    }
  ],
  "availableDesigns": [...],
  "currentFeaturedCount": 3,
  "maxFeatured": 6,
  "remainingSlots": 3
}
```

#### POST `/api/seller/featured-designs`
**Purpose**: Add a design to featured (max 6)

**Body**:
```json
{
  "designId": "design_123",
  "position": 2  // optional
}
```

**Response**: Newly created FeaturedDesign object

**Validation**:
- ✅ Design must belong to seller
- ✅ Design must be APPROVED and ACTIVE
- ✅ Cannot exceed 6 featured
- ✅ Cannot feature same design twice

#### DELETE `/api/seller/featured-designs/[id]`
**Purpose**: Remove a design from featured

**Response**: Success message

---

### **2. Seller - Featured Boutique Products**

#### GET `/api/seller/featured-boutique-products`
**Purpose**: Get seller's featured boutique products (6 max)

**Response**: Same structure as designs

#### POST `/api/seller/featured-boutique-products`
**Purpose**: Add a boutique product to featured (max 6)

**Validation**:
- ✅ Product must belong to seller
- ✅ Product must be LIVE status
- ✅ Cannot exceed 6 featured
- ✅ Cannot feature same product twice

#### DELETE `/api/seller/featured-boutique-products/[id]`
**Purpose**: Remove a product from featured

---

### **3. Admin - Featured Items Management**

#### GET `/api/admin/featured-items`
**Purpose**: Get all admin-featured items with seller details

**Query Parameters**:
- `type`: "DESIGN" | "BOUTIQUE" | "all" (default: all)
- `page`: 1 (pagination)
- `limit`: 20 (items per page)

**Response**:
```json
{
  "items": [
    {
      "id": "admin_featured_123",
      "type": "DESIGN",
      "itemId": "design_456",
      "seller": {
        "id": "seller_789",
        "name": "John Designer",
        "email": "john@example.com",
        "image": "..."
      },
      "position": 1,
      "featured": true,
      "addedAt": "2026-01-30",
      "addedBy": "admin_user_id"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "pages": 8
  }
}
```

#### POST `/api/admin/featured-items`
**Purpose**: Add an item to admin featured (unlimited)

**Body**:
```json
{
  "type": "DESIGN",  // or "BOUTIQUE"
  "itemId": "design_123",
  "sellerId": "seller_456",
  "position": 5  // optional
}
```

**Validation**:
- ✅ Admin only
- ✅ Type must be valid
- ✅ Item must exist and belong to seller
- ✅ Design must be APPROVED
- ✅ Boutique product must be LIVE
- ✅ Cannot feature same item twice (but can re-feature archived items)

#### DELETE `/api/admin/featured-items/[id]`
**Purpose**: Archive (soft delete) a featured item

**Note**: Uses soft delete (featured = false) so admins can restore if needed

---

## Next Steps - UI Components (Not Yet Implemented)

### **Phase 2: Seller UI**

#### `/seller/featured-designs/page.tsx`
- Drag-drop interface to reorder 6 featured designs
- "Add Design" modal showing available designs
- Quick remove button
- Preview of featured display
- "View on your storefront" link

#### `/seller/featured-boutique/page.tsx`
- Same as designs but for boutique products
- Shows only LIVE products

#### Seller Dashboard Addition
- "Manage Featured" quick link
- Shows featured count (3/6)
- "Featured" tab in seller portfolio

### **Phase 3: Admin Dashboard**

#### `/admin/featured-items/page.tsx`
- Table view of all featured items
- Filter by type (Design/Boutique)
- View seller details
- Quick add/remove interface
- Search by seller name or item title
- Sort by position/date added

#### Admin Search Interface
- Quick "Feature this design" button on design detail page
- Quick "Feature this product" button on product detail page
- Shows if already featured

### **Phase 4: Homepage/Display**

#### Display Featured Items
- `/designs` - Show admin-featured designs in hero section
- `/boutique` - Show admin-featured boutique products in hero section
- Seller portfolio pages - Show seller's featured designs
- Boutique store pages - Show seller's featured products

---

## Data Flow Diagram

```
SELLER JOURNEY:
Seller → Design/Product → Click "Feature" 
         → Check if approved/live ✓
         → Check if under 6 ✓
         → Add to FeaturedDesign/FeaturedBoutiqueProduct
         → Appears on seller's storefront

ADMIN JOURNEY:
Admin → Browse high-performing designs/products
      → Select to feature
      → Add to AdminFeaturedItem (unlimited)
      → Appears on platform homepage
      → Seller details visible (name, email, image)
```

---

## Database Queries

### Get seller's featured designs with details
```typescript
const featured = await prisma.featuredDesign.findMany({
  where: { sellerId: "user_123" },
  include: { design: { select: { title, price, imageUrl } } },
  orderBy: { position: 'asc' }
})
```

### Get all admin-featured items with seller info
```typescript
const items = await prisma.adminFeaturedItem.findMany({
  where: { featured: true, type: "DESIGN" },
  include: { seller: { select: { name, email, image } } },
  orderBy: { position: 'asc' }
})
```

### Check if design is featured by seller
```typescript
const isFeatured = await prisma.featuredDesign.findUnique({
  where: { sellerId_designId: { sellerId, designId } }
})
```

---

## Summary

✅ **Completed**:
- Database schema with 3 new models
- Relations to Design, BoutiqueProduct, and User
- 6 API endpoints (2 seller designs, 2 seller boutique, 2 admin)
- Full validation and error handling
- Admin-only access control
- Soft delete for admin items

⏳ **Next**:
- Seller UI for managing featured items
- Admin dashboard for curation
- Navigation links
- Display on pages

---

## Notes

- **Seller-selected = Full Control**: Sellers pick exactly which 6 items to feature (not algorithm)
- **Admin-featured = Platform Curation**: Admins feature high-performers on platform (unlimited)
- **No Double-booking**: Can't feature same item twice by same owner
- **Soft Delete**: Admin items archived, not deleted (can restore)
- **Pagination**: Admin list paginated (20 per page) to handle many items
- **Seller Visibility**: Admin can see seller details for every featured item
