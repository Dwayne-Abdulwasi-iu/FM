# Email Template Guide - Fashion Marketplace

## Overview

The Fashion Marketplace uses a **branded email wrapper** to ensure consistent styling, branding, and professional presentation across all notification emails. This guide explains how to use the wrapper when creating new email notifications.

## The Branded Email Wrapper

The `wrapBrandedEmail()` function automatically wraps email content in a professional HTML template with:

- **Fashion Marketplace logo** at the top
- **Responsive design** optimized for mobile and desktop
- **Consistent styling** including typography, spacing, and colors
- **Professional footer** with support link and copyright
- **Purple call-to-action buttons** (`.cta-btn` class)

### Function Signature

```typescript
export function wrapBrandedEmail(subject: string, content: string): string
```

**Parameters:**
- `subject` (string): The email subject line (used for metadata)
- `content` (string): The HTML content to wrap (without outer container styling)

**Returns:** Complete HTML document ready to send

---

## Usage Pattern

### Before (Inline HTML)

```typescript
export async function sendNotificationEmail(data: EmailData): Promise<boolean> {
  return sendEmail({
    to: data.email,
    subject: 'Your Notification',
    text: 'Fallback text version',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px;">
          <h2>Hello ${data.name}</h2>
          <p>This is your notification.</p>
          <a href="${url}" style="...">Click Here</a>
        </div>
      </div>
    `,
  });
}
```

### After (Using Wrapper)

```typescript
export async function sendNotificationEmail(data: EmailData): Promise<boolean> {
  const subject = 'Your Notification';
  const content = `
    <h2>Hello ${data.name}</h2>
    <p>This is your notification.</p>
    <a href="${url}" class="cta-btn">Click Here</a>
  `;

  return sendEmail({
    to: data.email,
    subject,
    text: 'Fallback text version',
    html: wrapBrandedEmail(subject, content),
  });
}
```

---

## Best Practices

### 1. Extract Content from HTML
- Remove outer container divs (the wrapper adds them)
- Remove the `font-family` and max-width styling (included in wrapper)
- Keep all content-specific styles (colors, backgrounds, borders)

### 2. Use the `.cta-btn` Class for Buttons
Instead of inline button styling, use the `.cta-btn` class:

```html
<!-- ✅ Good -->
<a href="${url}" class="cta-btn">Click Here</a>

<!-- ❌ Avoid -->
<a href="${url}" style="display: inline-block; padding: 14px 28px; ...">Click Here</a>
```

### 3. Create Subject and Content Variables
Extract `subject` and `content` outside the sendEmail call for clarity:

```typescript
const subject = `Order Confirmed - #${orderNumber}`;
const content = `
  <h2>Thank You for Your Order</h2>
  <p>Your order #${orderNumber} has been confirmed.</p>
  ...
`;

return sendEmail({
  to: email,
  subject,
  html: wrapBrandedEmail(subject, content),
});
```

### 4. Preserve Semantic HTML and Styling
Keep meaningful HTML structure and color-coded sections:

```html
<!-- ✅ Good: Semantic and styled -->
<div style="background: #ECFDF5; padding: 20px; border-radius: 8px; border-left: 4px solid #10B981;">
  <strong>Sale Details:</strong>
  <p style="margin: 10px 0 0;"><strong>Amount:</strong> $100</p>
</div>

<!-- ✅ Good: Clean typography -->
<h2 style="color: #4F46E5;">Important Notification</h2>
<p style="color: #666; font-size: 14px;">Supporting paragraph text here.</p>

<!-- ❌ Avoid: Duplicate container styling -->
<div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
```

---

## Available CSS Classes

### `.cta-btn` (Call-to-Action Button)
- **Background:** Purple (#4F46E5)
- **Text Color:** White
- **Padding:** 14px 28px
- **Border Radius:** 8px
- **Font Weight:** Bold

```html
<a href="${url}" class="cta-btn">Click Here</a>
```

---

## Refactored Email Functions

The following email functions have been updated to use the branded wrapper:

### Authentication Emails
- `sendPasswordResetEmail()` - Password reset with 1-hour link expiration
- `sendVerificationEmail()` - Email verification with 24-hour link expiration

### Transaction Emails
- `sendOrderConfirmationEmail()` - Order confirmation with item details
- `sendSaleNotificationEmail()` - Sale notification for sellers

### Warehouse/Boutique Emails ⭐
- `sendWarehouseReturnRejectedNotification()` - Return request status
- `sendVariantDiscrepancyNotification()` - Quality verification results
- `sendWarehouseReturnShippedNotification()` - Shipment tracking info
- `sendMonth5WarehouseNotification()` - Storage cycle milestone
- `sendWarehouseFinalWarning()` - Countdown warning before deduction
- `sendWarehouseDeductionConfirmation()` - Deduction confirmation
- And other warehouse-related notifications

---

## Styling Guidelines

### Color Palette
- **Primary Action:** `#4F46E5` (Purple)
- **Success:** `#10B981` / `#059669` (Green)
- **Warning:** `#F59E0B` (Amber)
- **Error:** `#DC2626` (Red)
- **Info:** `#0284C7` (Blue)
- **Text:** `#333`, `#555`, `#666` (dark gradations)
- **Backgrounds:** `#f5f5f5`, `#f1f5f9`, `#f3f4f6`

### Responsive Design
The wrapper includes mobile optimization via media queries. Test on mobile devices before deployment.

### Link Colors
- Primary links: `#4F46E5` (purple)
- Status-specific links: Match the context color (green for success, red for error, etc.)

---

## Email Content Structure

### Recommended Structure

```html
<h2>Main Heading (32px, #1e293b)</h2>

<p>Opening paragraph with context</p>

<!-- Informational Box -->
<div style="background: #E0F2FE; padding: 16px; border-radius: 8px; border-left: 4px solid #0284C7;">
  <strong>ℹ️ Note:</strong> Important information here.
</div>

<!-- Call-to-Action -->
<div style="text-align: center; margin: 30px 0;">
  <a href="${url}" class="cta-btn">Button Text</a>
</div>

<!-- Supporting Details -->
<p style="color: #666; font-size: 14px;">
  Additional details or fine print.
</p>
```

---

## Testing Email Rendering

### Local Testing
Run the test email script to verify rendering:

```bash
node --env-file=.env.local scripts/send-test-email.mjs
```

This sends a branded email to the configured test address. Check the email client for:
- ✅ Logo appears at top
- ✅ Content is centered and readable
- ✅ Purple button is styled correctly
- ✅ Mobile view is responsive
- ✅ Footer appears with support link

### Email Client Compatibility
Tested on:
- Gmail (web & mobile)
- Outlook
- Apple Mail
- Thunderbird

---

## Migration Checklist

When refactoring an existing email function:

- [ ] Extract `subject` into a variable
- [ ] Extract HTML `content` into a variable (remove outer container divs)
- [ ] Replace inline button styles with `class="cta-btn"`
- [ ] Update sendEmail call to use `wrapBrandedEmail(subject, content)`
- [ ] Preserve all content-specific HTML structure and styling
- [ ] Run `npm run type-check` to verify compilation
- [ ] Test email rendering in real email clients
- [ ] Update commit message with "refactor: emails to use branded wrapper"

---

## Examples

### Commission Request Notification

```typescript
export async function sendNewRequestToAdmin(data: CommissionEmailData): Promise<boolean> {
  const subject = `New Commission Request: ${data.title}`;
  const content = `
    <h2>New Commission Request</h2>
    <p>A new commission request has been submitted and needs your review.</p>
    
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Title:</strong> ${data.title}</p>
      <p style="margin: 10px 0 0;"><strong>From:</strong> ${data.requesterName}</p>
      <p style="margin: 10px 0 0;"><strong>Budget:</strong> $${data.budget}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardUrl}" class="cta-btn">Review Request</a>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject,
    html: wrapBrandedEmail(subject, content),
  });
}
```

### Status Update Notification

```typescript
export async function sendStatusUpdate(data: StatusData): Promise<boolean> {
  const subject = `✅ ${data.status} - ${data.itemName}`;
  const statusColor = data.status === 'Approved' ? '#10B981' : '#F59E0B';
  
  const content = `
    <h2 style="color: ${statusColor};">${data.status}</h2>
    <p>Your item <strong>${data.itemName}</strong> has been ${data.status.toLowerCase()}.</p>
    
    <div style="background-color: ${statusColor === '#10B981' ? '#ECFDF5' : '#FEF3C7'}; 
                border-left: 4px solid ${statusColor}; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Status:</strong> ${data.status}</p>
      <p style="margin: 10px 0 0;"><strong>Updated:</strong> ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${url}" class="cta-btn">View Details</a>
    </div>
  `;

  return sendEmail({
    to: data.email,
    subject,
    html: wrapBrandedEmail(subject, content),
  });
}
```

---

## Support & Issues

For questions about email templates or to report rendering issues:
1. Check this guide first
2. Test in multiple email clients
3. Create an issue with screenshots of how the email renders in different clients

---

**Last Updated:** February 20, 2026  
**Version:** 1.0  
**Maintained by:** Platform Team
