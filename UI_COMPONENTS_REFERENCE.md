# UI Components Visual Reference Guide

## 📍 Quick Links
- **Commission Calculator Widget:** [src/components/seller/commission-calculator-widget.tsx](src/components/seller/commission-calculator-widget.tsx)
- **Commission Breakdown:** [src/components/seller/commission-breakdown.tsx](src/components/seller/commission-breakdown.tsx)
- **Payment Audit Trail:** [src/components/seller/payment-audit-trail.tsx](src/components/seller/payment-audit-trail.tsx)
- **Payment Reconciliation Dashboard:** [src/components/admin/payment-reconciliation-dashboard.tsx](src/components/admin/payment-reconciliation-dashboard.tsx)
- **Related Docs:** [COMMISSION_PAYMENT_DOCS.md](COMMISSION_PAYMENT_DOCS.md) • [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)

## Component Hierarchy & Layout

### 1. Commission Calculator Widget

**Location:** Seller dashboard, sidebar
📍 **Component:** [src/components/seller/commission-calculator-widget.tsx](src/components/seller/commission-calculator-widget.tsx)
**Size:** 320px width recommended

```
┌─────────────────────────────┐
│ 📈 Commission Calculator   │
│ Real-time earnings preview  │
├─────────────────────────────┤
│                             │
│ Your Current Tier           │
│ ████████████████████ 9%    │
│ Silver ($2k-$5k lifetime)   │
│ Commission Rate: 9%         │
│                             │
│ [Sale Amount: $50      ]    │
│ [Quantity:    1        ]    │
│                             │
├─────────────────────────────┤
│ Order Breakdown             │
│ Subtotal:    $50.00         │
│ Your Payout: $45.50 (9%)    │
│ Commission:  $4.50          │
│ Customer Pays: $50.00       │
├─────────────────────────────┤
│ ⚠️ Unlock Savings            │
│ Reach $5,000 lifetime to    │
│ unlock 8.5% commission!     │
│                             │
│ 💡 Higher earnings = Lower %│
└─────────────────────────────┘
```

### 2. Commission Breakdown Component

**Location:** Seller payouts page
📍 **Component:** [src/components/seller/commission-breakdown.tsx](src/components/seller/commission-breakdown.tsx)
**Full width with collapsible sections**

```
Summary Cards Row (4 columns):
┌─────────────┬──────────────┬──────────────┬──────────────┐
│ Total Earn  │ Your Rate    │ This Month   │ Pending      │
│ $5,250      │ 9% Silver    │ $380         │ $50          │
└─────────────┴──────────────┴──────────────┴──────────────┘

Collapsible Sections (Full Width):
┌──────────────────────────────────────┐
│ ▼ What's Currently Owed               │
├──────────────────────────────────────┤
│ Pending Earnings: $50.00              │
│ Already Paid Out: $5,200.00           │
│                                       │
│ 💰 Next Payout: January 1, 2026      │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ ▼ Payment Schedule                    │
├──────────────────────────────────────┤
│ 🟢 Sales Posted - Immediately        │
│ 🟡 7-Day Hold - Dispute period       │
│ 🔵 Monthly Settlement - 1st of month │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ ▼ Commission Tiers (USD Lifetime)     │
├──────────────────────────────────────┤
│ STARTER: $0-$100 → 0.1%              │
│ NEW: $100-$500 → 10%                 │
│ BRONZE: $500-$2k → 9.5%              │
│ SILVER: $2k-$5k → 9% ✓ Current      │
│ GOLD: $5k-$10k → 8.5%                │
│ PLATINUM: $10k-$25k → 8%             │
│ DIAMOND: $25k+ → 7%                  │
└──────────────────────────────────────┘
```

### 3. Payment Audit Trail Component

**Location:** Seller payments audit trail page
📍 **Component:** [src/components/seller/payment-audit-trail.tsx](src/components/seller/payment-audit-trail.tsx)
**Full width table/list**

```
Filters Row:
┌──────────────────────┬──────────────┬──────────┐
│ All Types   [v]      │ All Statuses [v] │ Export │
└──────────────────────┴──────────────┴──────────┘

Transaction List:
┌─────────────────────────────────────────────────────────┐
│ 💚 SALE - Geometric Pattern Design                  ▼    │
│ Jan 15, 2024 • Paystack                                  │
│ Gross: ₦50,000 | Commission: ₦7,500 | Net: ₦42,500    │
│ Status: ✓ Completed                                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🟡 REFUND - Customer Request                         ▼   │
│ Jan 12, 2024 • Paystack                                  │
│ Gross: -₦15,000 | Commission: -₦2,250 | Net: -₦12,750  │
│ Status: ✓ Completed                                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 💙 PAYOUT - Monthly Payout (Dec 2023)                ▼   │
│ Jan 10, 2024 • Bank Transfer                             │
│ Amount: ₦72,250                                          │
│ Status: ✓ Completed                                      │
└─────────────────────────────────────────────────────────┘

Summary Section:
┌────────────────────┬────────────────────┬────────────────────┐
│ Total Transactions │ Total Volume       │ Total Earnings     │
│ 42 transactions    │ ₦1,250,000        │ ₦1,100,000        │
└────────────────────┴────────────────────┴────────────────────┘
```

### 4. Admin Payment Reconciliation Dashboard

**Location:** Admin panel
📍 **Component:** [src/components/admin/payment-reconciliation-dashboard.tsx](src/components/admin/payment-reconciliation-dashboard.tsx)
📍 **Page:** [src/app/admin/payments/reconciliation/page.tsx](src/app/admin/payments/reconciliation/page.tsx)
**Full width dashboard**

```
Summary Cards Row (4 columns):
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Total Revenue│ Commission   │ Pending      │ Paid Out     │
│ ₦5,000,000   │ ₦650,000     │ ₦500,000     │ ₦4,500,000   │
└──────────────┴──────────────┴──────────────┴──────────────┘

Filters Row:
┌───────────┬──────────────┬──────────────┬──────────┐
│ Jan 2024 [v] │ All Transactions [v] │ │ Export CSV │
└───────────┴──────────────┴──────────────┴──────────┘

Charts Row (2 columns):
┌─────────────────────────┬──────────────────────────┐
│ Daily Revenue Trend     │ Revenue by Payment Method│
│ [Line Chart]            │ [Bar Chart]              │
└─────────────────────────┴──────────────────────────┘

Transactions Table:
┌────────────┬──────────┬──────────┬──────────┬────────┐
│ Date       │ Processor│ Amount   │ Comm.    │ Status │
├────────────┼──────────┼──────────┼──────────┼────────┤
│ Jan 15     │ Paystack │ ₦50,000  │ ₦7,500   │ ✓      │
│ Jan 14     │ Stripe   │ ₦75,000  │ ₦7,500   │ ✓      │
│ Jan 13     │ Paystack │ ₦35,000  │ ₦5,250   │ ✓      │
│ Jan 12     │ Stripe   │ ₦100,000 │ ₦10,000  │ ⏱      │
└────────────┴──────────┴──────────┴──────────┴────────┘
```

## Color Scheme

### Primary Colors
- **Primary Blue**: `#3B82F6` - Main actions, highlights
- **Green**: `#10B981` - Success, completed status
- **Amber**: `#F59E0B` - Pending, warnings
- **Red**: `#EF4444` - Errors, failed status
- **Gray**: `#6B7280` - Secondary text

### Background Colors
- **Success BG**: `#10B98120` - Green tint
- **Pending BG**: `#F59E0B20` - Amber tint
- **Error BG**: `#EF444420` - Red tint
- **Info BG**: `#3B82F620` - Blue tint

## Typography

### Headings
- **H1**: 2rem (32px), bold, primary color
- **H2**: 1.5rem (24px), bold
- **H3**: 1.125rem (18px), semibold
- **H4**: 1rem (16px), semibold

### Body Text
- **Default**: 0.875rem (14px), regular
- **Small**: 0.75rem (12px), regular
- **Labels**: 0.75rem (12px), medium

### Numbers
- **Large amounts**: 1.5rem-2rem, bold, primary color
- **Currency**: Prefix with ₦, comma separators

## Spacing

```
Margins:
- Section margin: 2rem (32px)
- Card margin: 1rem (16px)
- Element margin: 0.5rem (8px)

Padding:
- Section padding: 1.5rem (24px)
- Card padding: 1.5rem (24px)
- Button padding: 0.75rem 1rem (12px 16px)
```

## Button Styles

### Primary Button
```
Background: #3B82F6
Text: White
Padding: 12px 24px
Border radius: 8px
On hover: Darker blue (#2563EB)
```

### Secondary Button
```
Background: White
Border: 1px #E5E7EB
Text: #374151
Padding: 12px 24px
Border radius: 8px
On hover: #F3F4F6 background
```

### Danger Button
```
Background: #FEE2E2
Text: #DC2626
Border: 1px #FCA5A5
On hover: #FEE2E2 (slightly darker)
```

## Card Styles

### Standard Card
```
Background: White
Border: 1px #E5E7EB
Border radius: 8px
Padding: 24px
Box shadow: 0 1px 3px rgba(0,0,0,0.1)
On hover: shadow increases
```

### Highlighted Card
```
Background: #F0F9FF (light blue)
Border: 2px #3B82F6
Border radius: 8px
Padding: 24px
```

## Responsive Breakpoints

```
Mobile (< 768px):
- Single column layouts
- Full width cards
- Stacked form fields
- Horizontal scrolling tables

Tablet (768px - 1024px):
- 2 column layouts
- Medium width cards
- Side-by-side sections

Desktop (> 1024px):
- 3-4 column layouts
- Sidebar layouts
- Side-by-side comparisons
```

## Accessibility Features

### Focus States
- All interactive elements have visible focus rings (blue outline)
- Tab order is logical and visible
- Skip links available for navigation

### Color Contrast
- All text meets WCAG AA standards
- Color not sole means of communication (icons + text)
- Status indicators use patterns + colors

### Keyboard Navigation
- All buttons keyboard accessible
- Modals can be closed with Escape
- Forms have logical tab order

### Screen Readers
- Aria labels on icons
- Form labels associated with inputs
- Table headers properly marked
- Live regions for status updates

## Icon Usage

### Transaction Type Icons
- **💚 SALE** (Dollar sign, green) - Product sold
- **🟡 REFUND** (Arrow left, amber) - Money refunded
- **🔴 CHARGEBACK** (Alert circle, red) - Disputed transaction
- **🔵 ADJUSTMENT** (Clock, blue) - Admin adjustment
- **✓ PAYOUT** (Check circle, green) - Money transferred

### Status Icons
- **✓** (Check) - Completed/Success
- **⏱** (Clock) - Pending/In progress
- **✕** (X) - Failed/Error
- **⚠️** (Alert) - Warning
- **ℹ️** (Info) - Information

## Animation Effects

### Transitions
- Hover effects: 150ms ease
- Page transitions: 300ms ease
- Expanding sections: 200ms ease-in-out

### Loading States
- Spinner: 1s rotation animation
- Pulse: 2s breathing animation
- Skeleton: 1.5s shimmer animation

## Mobile Considerations

### Touch Targets
- Minimum 44x44px for buttons
- 16px spacing between touchable elements
- Larger tap areas for important actions

### Mobile Layout
- Full width cards
- Single column on small screens
- Horizontal scrolling for tables
- Collapsible sections for long content

### Mobile Performance
- Lazy load images
- Defer non-critical scripts
- Minify CSS/JS
- Optimize chart rendering

## Dark Mode (Future)

Prepare for dark mode with CSS variables:

```css
:root {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-primary: #1f2937;
    --color-bg-secondary: #111827;
    --color-text-primary: #f9fafb;
    --color-text-secondary: #d1d5db;
    --color-border: #374151;
  }
}
```

## Component States

### Form Input States
- **Default**: Gray border, gray text
- **Focused**: Blue border, blue shadow ring
- **Filled**: Blue border, dark text
- **Error**: Red border, red text, error message below
- **Disabled**: Gray background, gray text

### Table States
- **Default**: White background, gray borders
- **Hover**: Light gray background
- **Selected**: Light blue background
- **Sorted**: Arrow indicator in header

## Loading & Empty States

### Loading State
```
┌──────────────────┐
│   [Spinner]      │
│ Loading data...  │
└──────────────────┘
```

### Empty State
```
┌──────────────────┐
│   [Icon]         │
│ No data found    │
│ [Create button]  │
└──────────────────┘
```

### Error State
```
┌──────────────────┐
│   [Alert icon]   │
│ Error loading    │
│ [Retry button]   │
└──────────────────┘
```

## Success Checklist

- [ ] All colors are accessible (WCAG AA)
- [ ] All text is readable at small sizes
- [ ] All interactive elements are keyboard accessible
- [ ] All states are visually distinct
- [ ] Mobile layouts work properly
- [ ] Forms are easy to fill
- [ ] Error messages are helpful
- [ ] Loading states provide feedback
- [ ] Data tables are scannable
- [ ] Icons have text labels
