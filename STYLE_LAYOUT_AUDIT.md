# 🎨 STYLE & LAYOUT FLAWS AUDIT

## Issues Found Across 12 Pages

### 1. **Textarea Missing Text Color** ⚠️
**Affected Pages:** 
- `/seller/disputes/[id]` - message textarea
- `/seller/appeals` - appeal notes textarea  
- `/boutique/returns` - return notes textarea
- `/seller/tax-info` - business address textarea
- `/admin/content-review` - review comment textarea

**Issue:** Textareas missing `text-black` class, making text hard to read
**Fix:** Add `text-black` to all textarea elements

---

### 2. **Select/Dropdown Missing Text Color** ⚠️
**Affected Pages:** All 12 pages have `<select>` elements

**Issue:** Some selects missing `text-black`, text is dark gray on dark background
**Fix:** Ensure all `<select>` have `text-black` class

---

### 3. **Mobile Layout Issues** ⚠️
**Issues Found:**
- Header buttons don't stack on mobile (`flex gap-4` stays horizontal on xs)
- Grid layouts use hardcoded columns that overflow on small screens
- Tables/matrices don't handle small screens well
- Padding too large on mobile (p-8 instead of p-4)

**Example Issue in `/admin/shipping/[id]`:**
```tsx
<div className="grid grid-cols-3 gap-4">  // ❌ Always 3 columns
```
**Fix:** Change to responsive: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

---

### 4. **Overflow Issues** ⚠️
**Specific Issues:**
- **Tables in `/admin/pod-management`**: Weight rate tables can overflow
- **Long text in `/seller/analytics`**: Export buttons don't wrap on mobile
- **Grids in `/admin/security`**: Metrics cards stack poorly

**Example:**
```tsx
<div className="flex items-center gap-4 mb-8">  // ❌ No wrap on mobile
  {/* Multiple children that overflow */}
</div>
```

---

### 5. **Font Sizing Not Mobile-Optimized** ⚠️
**Current:**
- `text-3xl` headers - too large on mobile (35px)
- No `text-sm` for mobile variants

**Fix:**
- Headers: `text-2xl sm:text-3xl` instead of just `text-3xl`
- Body: Use `text-xs` and `text-sm` on mobile

---

### 6. **Specific Page Issues**

#### `/seller/bank-accounts/page.tsx`
- Header button alignment wraps awkwardly on mobile
- Account cards show full account numbers (security + layout issue)
- Grid in add form: `grid-cols-2` breaks on mobile

#### `/admin/shipping/[id]/page.tsx`  
- Rate table has many columns - horizontal scroll on mobile
- Number inputs too wide

#### `/seller/analytics/page.tsx`
- Metrics grid `grid-cols-4` doesn't work on mobile
- Export buttons overflow

#### `/admin/security/page.tsx`
- Metrics: `grid-cols-4` should be `grid-cols-2 sm:grid-cols-4`
- Sidebar takes full width on mobile

#### `/buyer/order-tracking/page.tsx`
- Tracking timeline is wide, no scroll handling
- Address layout doesn't wrap

---

## Action Items

✅ Add `text-black` to all textareas
✅ Verify `text-black` on all selects  
✅ Fix responsive grids (use 1 col on mobile, scale up)
✅ Adjust headers for mobile: `text-2xl sm:text-3xl`
✅ Add `text-xs sm:text-sm` for compact mobile display
✅ Fix overflow with proper wrapping
✅ Improve button grouping on mobile
✅ Make tables/matrices scrollable on mobile

