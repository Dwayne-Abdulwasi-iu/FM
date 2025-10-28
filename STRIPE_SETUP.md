# Stripe Setup Guide

## Quick Setup for Testing

### 1. Get Stripe Test Keys (FREE)
1. Go to https://stripe.com and create a free account
2. Go to Developers > API keys
3. Copy your **Publishable key** (starts with `pk_test_`)
4. Copy your **Secret key** (starts with `sk_test_`)

### 2. Update Environment Variables
Edit your `.env.local` file and replace:

```bash
# Replace these placeholder values
STRIPE_PUBLISHABLE_KEY="pk_test_your_actual_publishable_key_here"
STRIPE_SECRET_KEY="sk_test_your_actual_secret_key_here"
```

### 3. Test Cards (Use these for testing)
- **Successful payment**: `4242 4242 4242 4242`
- **Declined payment**: `4000 0000 0000 0002`
- Use any future date for expiry (e.g., 12/34)
- Use any 3-digit CVC (e.g., 123)

### 4. Commission Structure
✅ **CONFIRMED Implementation**: 
- **Seller lists design**: $25.00
- **Customer pays**: $25.00 (exactly what's listed - NO extra fees)
- **Platform takes**: $1.25 (5% commission deducted from seller)
- **Seller receives**: $23.75 (95% of the sale price)

**Example Transaction:**
```
Design Price: $25.00
Customer Payment: $25.00 ✅
Platform Commission: $1.25 (5% of $25.00)
Seller Payout: $23.75 ($25.00 - $1.25)
```

**Key Points:**
- ✅ Customers never pay extra fees
- ✅ Commission is deducted from sellers, not added to buyers
- ✅ Platform earns through seller commission only

## Production Setup (Later)
When ready for real payments:
1. Complete Stripe account verification
2. Replace test keys with live keys (pk_live_ and sk_live_)
3. Set up webhooks for production URL

## Testing Your Setup
1. Restart your development server after updating keys
2. Add items to cart
3. Go through checkout process
4. Use test card numbers above
5. Check Stripe dashboard for test payments