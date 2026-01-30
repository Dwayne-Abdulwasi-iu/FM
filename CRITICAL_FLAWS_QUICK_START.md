# Quick-Start Implementation Guide: Critical Flaws

**Focus:** 3 blocking issues that prevent launch | **Timeline:** 1-2 weeks | **Effort:** 40 hours

---

## PHASE 1: Inventory Risk Management (16 hours)

### Step 1.1: Add Schema Fields (30 mins)

Add to `BoutiqueProduct` model in `prisma/schema.prisma`:

```typescript
// Around line 1750, after repostCount field, add:

// Storage Option (chosen by seller at shipment)
storageOption      String?   // FULL_RETURN, PARTIAL_LIQUIDATION, FLEXIBLE_STORAGE
storageOptionChosenAt DateTime?
storageOptionNotes String?

// Return to Seller Fields
fullReturnEnabled  Boolean @default(false)
returnRequestedAt  DateTime?
returnShippedAt    DateTime?
returnDeliveredAt  DateTime?
returnTrackingNumber String?
returnCost         Float?

// Liquidation Fields
liquidationEnabled Boolean @default(false)
liquidationStartedAt DateTime?
liquidationEndedAt DateTime?
liquidationFinalPrice Float?
liquidationFinalSale Float?

// Flexible Storage Fields
flexibleStorageEnabled Boolean @default(false)
storagePaidUntil   DateTime?
storagePayments    Json[]   // [{ date: "2026-01-25", amount: 5000, period: "1 month" }]
storageExtensionCount Int @default(0)
```

Then run:
```bash
npx prisma db push
```

### Step 1.2: Create Storage Option API Route (2 hours)

Create `src/app/api/boutique/products/[id]/storage-option/route.ts`:

```typescript
import { getServerSession } from 'next-auth/react'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response('Unauthorized', { status: 401 })

    const { storageOption } = await request.json()

    // Validate option
    const validOptions = ['FULL_RETURN', 'PARTIAL_LIQUIDATION', 'FLEXIBLE_STORAGE']
    if (!validOptions.includes(storageOption)) {
      return new Response('Invalid storage option', { status: 400 })
    }

    // Update product
    const product = await prisma.boutiqueProduct.update({
      where: { id: params.id },
      data: {
        storageOption,
        storageOptionChosenAt: new Date(),
      },
    })

    // Send email to seller confirming choice
    await sendStorageOptionConfirmationEmail(session.user.email, product.title, storageOption)

    return new Response(JSON.stringify({ success: true, product }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error setting storage option:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        storageOption: true,
        storageOptionChosenAt: true,
        warehouseExpiresAt: true,
      },
    })

    if (!product) return new Response('Not found', { status: 404 })

    return new Response(JSON.stringify(product), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching storage option:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
```

### Step 1.3: Create Storage Option UI Component (3 hours)

Create `src/components/StorageOptionSelector.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'

interface StorageOptionSelectorProps {
  productId: string
  productTitle: string
  expiresAt: Date | null
}

export function StorageOptionSelector({
  productId,
  productTitle,
  expiresAt,
}: StorageOptionSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const daysLeft = expiresAt
    ? Math.floor((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const options = [
    {
      id: 'FULL_RETURN',
      name: 'Free Return',
      description: 'We ship it back to you (FREE)',
      cost: '₦0',
      icon: '📦',
    },
    {
      id: 'PARTIAL_LIQUIDATION',
      name: 'Liquidation Sale',
      description: 'Automatic 50% off, you get 40%',
      cost: 'Variable',
      icon: '🏷️',
    },
    {
      id: 'FLEXIBLE_STORAGE',
      name: 'Extend Storage',
      description: 'Keep in warehouse (₦5,000/month)',
      cost: '₦5,000/mo',
      icon: '📅',
    },
  ]

  const handleSelect = async (optionId: string) => {
    setSelected(optionId)
    setLoading(true)

    try {
      const response = await fetch(`/api/boutique/products/${productId}/storage-option`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageOption: optionId }),
      })

      if (!response.ok) throw new Error('Failed to save option')

      toast.success(`${productTitle} storage option saved!`)
    } catch (error) {
      toast.error('Failed to save storage option')
      setSelected(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          📅 Your product expires in {daysLeft} days
        </h3>
        <p className="text-sm text-gray-600 mt-2">
          Choose what happens when storage expires on {new Date(expiresAt!).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            disabled={loading}
            className={`p-4 border-2 rounded-lg transition-all ${
              selected === option.id
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 bg-white hover:border-blue-400'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="text-3xl mb-2">{option.icon}</div>
            <div className="font-bold text-left">{option.name}</div>
            <div className="text-sm text-gray-600 text-left mt-2">{option.description}</div>
            <div className="text-xs text-gray-500 text-left mt-3">Cost: {option.cost}</div>
            {selected === option.id && (
              <div className="mt-2 text-green-600 font-bold">✓ Selected</div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-600 bg-gray-50 p-3 rounded">
        📝 You can change this option anytime until day 175
      </div>
    </div>
  )
}
```

### Step 1.4: Integrate Into Warehouse Page (3 hours)

Update `src/app/seller/boutique/warehouse-expiration/page.tsx`:

Add this near the product detail section (around line 320):

```typescript
import { StorageOptionSelector } from '@/components/StorageOptionSelector'

// In the product detail modal, after product info, add:
{product.daysInWarehouse > 150 && !product.storageOption && (
  <StorageOptionSelector
    productId={product.id}
    productTitle={product.title}
    expiresAt={product.warehouseExpiresAt}
  />
)}

// Show selected option if already chosen
{product.storageOption && (
  <div className="bg-green-50 border border-green-200 rounded p-4">
    <p className="text-sm font-bold text-green-700">
      ✓ Storage option: {product.storageOption}
    </p>
    <p className="text-xs text-green-600 mt-1">
      Chosen on {new Date(product.storageOptionChosenAt!).toLocaleDateString()}
    </p>
  </div>
)}
```

### Step 1.5: Add Cron Job for Liquidation (3 hours)

Create `src/app/api/cron/storage-option-execution/route.ts`:

```typescript
import prisma from '@/lib/prisma'
import { sendLiquidationStartedEmail } from '@/lib/emails'

export async function GET(request: Request) {
  // Verify CRON_SECRET
  const secret = request.headers.get('Authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Find products that expired and chose LIQUIDATION
    const today = new Date()
    const productsToLiquidate = await prisma.boutiqueProduct.findMany({
      where: {
        storageOption: 'PARTIAL_LIQUIDATION',
        warehouseExpiresAt: { lte: today },
        liquidationStartedAt: null,
      },
      include: { seller: true },
    })

    for (const product of productsToLiquidate) {
      // Mark as liquidated
      await prisma.boutiqueProduct.update({
        where: { id: product.id },
        data: {
          status: 'LIQUIDATED',
          liquidationStartedAt: today,
          salePrice: product.basePrice * 0.5, // 50% off
        },
      })

      // Send email to seller
      await sendLiquidationStartedEmail(product.seller.email, product.title, product.salePrice)
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: productsToLiquidate.length,
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Error executing storage options:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
```

**Then add to cron scheduler (in your render.yaml or railway):**
```
/api/cron/storage-option-execution - Daily at 00:00 UTC
```

### Step 1.6: Testing (2 hours)

Create test file `src/__tests__/storage-options.test.ts`:

```typescript
describe('Storage Options', () => {
  it('should save FULL_RETURN option', async () => {
    const response = await fetch('/api/boutique/products/prod_123/storage-option', {
      method: 'POST',
      body: JSON.stringify({ storageOption: 'FULL_RETURN' }),
    })
    expect(response.status).toBe(200)
  })

  it('should reject invalid option', async () => {
    const response = await fetch('/api/boutique/products/prod_123/storage-option', {
      method: 'POST',
      body: JSON.stringify({ storageOption: 'INVALID' }),
    })
    expect(response.status).toBe(400)
  })

  it('should trigger liquidation on day 180', async () => {
    // Mock date to day 180
    // Call cron job
    // Verify product marked as LIQUIDATED
  })
})
```

---

## PHASE 2: Shipping Model Unification (12 hours)

### Step 2.1: Add Geo-Detection Middleware (2 hours)

Create `src/lib/geo-detection.ts`:

```typescript
export const STRIPE_COUNTRIES = [
  'US', 'CA', 'GB', 'AU', 'NZ', 'JP', 'SG', 'HK', 'AE', 'DE', 'FR', 'IT', 'ES', 'NL'
]

export const PAYSTACK_COUNTRIES = ['NG', 'GH', 'KE', 'TZ', 'RW']

export const FLUTTERWAVE_COUNTRIES = [
  'NG', 'GH', 'KE', 'TZ', 'RW', 'UG', 'ZA', 'MW', 'ZM', 'ET', 'MA', 'LS', 'SD', 'SN'
]

export function getPaymentProcessor(buyerCountry: string): 'STRIPE' | 'PAYSTACK' | 'FLUTTERWAVE' {
  if (PAYSTACK_COUNTRIES.includes(buyerCountry)) return 'PAYSTACK'
  if (STRIPE_COUNTRIES.includes(buyerCountry)) return 'STRIPE'
  return 'FLUTTERWAVE'
}

export function getShippingCost(
  fulfillmentMethod: 'ADMIN_STOCK' | 'SELLER_DIRECT',
  buyerCountry: string,
  weight: number = 0.5
): { cost: number; estimatedDays: number; carrier: string } {
  if (fulfillmentMethod === 'ADMIN_STOCK') {
    // Platform handles shipping
    const isNigeria = buyerCountry === 'NG'
    return {
      cost: isNigeria ? 3500 : 5000,
      estimatedDays: isNigeria ? 3 : 5,
      carrier: 'Fashion Boutique',
    }
  } else {
    // Seller sets shipping cost
    return {
      cost: 0, // Will be set by seller
      estimatedDays: 1,
      carrier: 'Seller',
    }
  }
}
```

### Step 2.2: Update Checkout API (3 hours)

Update `src/app/api/checkout/route.ts`:

```typescript
import { getPaymentProcessor, getShippingCost } from '@/lib/geo-detection'

export async function POST(request: Request) {
  const { items, buyerCountry, shippingAddress } = await request.json()

  // Detect payment processor
  const processor = getPaymentProcessor(buyerCountry)

  // Calculate shipping for each item
  const itemsWithShipping = items.map((item: any) => ({
    ...item,
    processor,
    shippingCost: getShippingCost(item.fulfillmentMethod, buyerCountry, item.weight),
  }))

  // Create checkout session
  const session = {
    items: itemsWithShipping,
    processor,
    total: itemsWithShipping.reduce((sum: number, item: any) => {
      return sum + (item.price + item.shippingCost.cost) * item.quantity
    }, 0),
  }

  return new Response(JSON.stringify(session), { status: 200 })
}
```

### Step 2.3: Update Checkout UI (4 hours)

Update checkout page to show unified display:

```typescript
// In checkout form component

const [buyerCountry, setBuyerCountry] = useState('')
const processor = getPaymentProcessor(buyerCountry)
const shipping = getShippingCost(product.fulfillmentMethod, buyerCountry)

return (
  <div className="checkout-container">
    {/* Product & Shipping Summary */}
    <div className="summary-card">
      <h2>Order Summary</h2>
      <div className="line-item">
        <span>Product</span>
        <span>₦{product.basePrice}</span>
      </div>
      <div className="line-item">
        <span>
          Shipping ({shipping.carrier})
          <small className="text-gray-500">{shipping.estimatedDays}-day delivery</small>
        </span>
        <span>₦{shipping.cost}</span>
      </div>
      <div className="line-item font-bold border-t pt-2">
        <span>Total</span>
        <span>₦{product.basePrice + shipping.cost}</span>
      </div>
    </div>

    {/* Single Payment Button */}
    <button
      onClick={handlePayment}
      className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg"
    >
      💳 Pay Now with {processor}
    </button>
  </div>
)
```

### Step 2.4: Testing (3 hours)

```typescript
describe('Shipping Unification', () => {
  it('should detect PAYSTACK for Nigeria', () => {
    const processor = getPaymentProcessor('NG')
    expect(processor).toBe('PAYSTACK')
  })

  it('should detect STRIPE for USA', () => {
    const processor = getPaymentProcessor('US')
    expect(processor).toBe('STRIPE')
  })

  it('should calculate correct shipping cost for Lagos', () => {
    const shipping = getShippingCost('ADMIN_STOCK', 'NG')
    expect(shipping.cost).toBe(3500)
    expect(shipping.estimatedDays).toBe(3)
  })
})
```

---

## PHASE 3: Onboarding Streamline (10 hours)

### Step 3.1: Create 4-Step Form Component (5 hours)

Create `src/components/SellerOnboarding.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const STEPS = [
  { number: 1, title: 'Quick Profile', time: '2 mins' },
  { number: 2, title: 'First Product', time: '5 mins' },
  { number: 3, title: 'Photos', time: '5 mins' },
  { number: 4, title: 'Submit', time: '1 min' },
]

export function SellerOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Step 1
    storeName: '',
    category: '',
    // Step 2
    productTitle: '',
    productDesc: '',
    productPrice: '',
    // Step 3
    photos: [] as File[],
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNext = async () => {
    if (step < 4) {
      setStep(step + 1)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Upload photos first
      const photoUrls = await Promise.all(
        formData.photos.map(async (file) => {
          const fd = new FormData()
          fd.append('file', file)
          const res = await fetch('/api/upload', { method: 'POST', body: fd })
          const data = await res.json()
          return data.url
        })
      )

      // Create seller profile + product
      const response = await fetch('/api/onboarding/quickstart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: formData.storeName,
          category: formData.category,
          product: {
            title: formData.productTitle,
            description: formData.productDesc,
            basePrice: parseFloat(formData.productPrice),
            photos: photoUrls,
          },
        }),
      })

      if (!response.ok) throw new Error('Failed to create store')

      toast.success('Store created! Awaiting admin review...')
      router.push('/seller/dashboard')
    } catch (error) {
      toast.error('Failed to create store')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-4">
          {STEPS.map((s) => (
            <div key={s.number} className="text-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  s.number <= step
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {s.number <= step - 1 ? '✓' : s.number}
              </div>
              <div className="text-xs mt-2 font-medium">{s.title}</div>
              <div className="text-xs text-gray-500">{s.time}</div>
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
        <p className="text-center text-sm text-gray-600 mt-4">
          Step {step}/4 • {Math.ceil((step / 4) * 13)} mins to launch
        </p>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Let's set up your store</h2>
            <input
              type="text"
              placeholder="Your Name"
              className="w-full border rounded px-4 py-2"
              onChange={(e) => handleInputChange('storeName', e.target.value)}
            />
            <select
              className="w-full border rounded px-4 py-2"
              onChange={(e) => handleInputChange('category', e.target.value)}
            >
              <option>Choose Category</option>
              <option>Dresses</option>
              <option>Shirts</option>
              <option>Pants</option>
              <option>Accessories</option>
              <option>Other</option>
            </select>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Add your first product</h2>
            <input
              type="text"
              placeholder="Product name (e.g., Blue Gown)"
              className="w-full border rounded px-4 py-2"
              onChange={(e) => handleInputChange('productTitle', e.target.value)}
            />
            <textarea
              placeholder="Describe your product..."
              className="w-full border rounded px-4 py-2 h-32"
              onChange={(e) => handleInputChange('productDesc', e.target.value)}
            />
            <input
              type="number"
              placeholder="Price in Naira (₦)"
              className="w-full border rounded px-4 py-2"
              onChange={(e) => handleInputChange('productPrice', e.target.value)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Upload photos (3+)</h2>
            <input
              type="file"
              multiple
              accept="image/*"
              className="w-full border rounded px-4 py-2"
              onChange={(e) =>
                handleInputChange('photos', Array.from(e.target.files || []))
              }
            />
            <div className="grid grid-cols-3 gap-4">
              {formData.photos.map((photo, idx) => (
                <div key={idx} className="border rounded overflow-hidden bg-gray-100 h-32">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Preview ${idx}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Ready to launch?</h2>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
              <p className="text-sm font-bold">✓ Store name: {formData.storeName}</p>
              <p className="text-sm font-bold">✓ First product: {formData.productTitle}</p>
              <p className="text-sm font-bold">✓ {formData.photos.length} photos uploaded</p>
            </div>
            <p className="text-sm text-gray-600">
              Admin will review your product within 24 hours. We'll email you updates!
            </p>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 mt-8">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="px-6 py-2 border rounded font-bold"
          >
            Back
          </button>
        )}
        <button
          onClick={step === 4 ? handleSubmit : handleNext}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-green-600 text-white rounded font-bold"
        >
          {step === 4 ? (loading ? 'Creating...' : 'Create Store') : 'Next'}
        </button>
      </div>
    </div>
  )
}
```

### Step 3.2: Create Onboarding API Route (3 hours)

Create `src/app/api/onboarding/quickstart/route.ts`:

```typescript
import { getServerSession } from 'next-auth/react'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { sendOnboardingConfirmationEmail } from '@/lib/emails'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response('Unauthorized', { status: 401 })

    const { storeName, category, product } = await request.json()

    // Create boutique product draft
    const boutiqueProduct = await prisma.boutiqueProduct.create({
      data: {
        title: product.title,
        slug: product.title.toLowerCase().replace(/\s+/g, '-'),
        description: product.description,
        basePrice: product.basePrice,
        categoryId: category, // Assumes category ID passed
        sellerId: session.user.id,
        status: 'DRAFT',
        media: {
          create: product.photos.map((photoUrl: string, idx: number) => ({
            fileName: `photo-${idx}`,
            fileUrl: photoUrl,
            fileType: 'IMAGE',
            mimeType: 'image/jpeg',
            fileSize: 0,
            sortOrder: idx,
          })),
        },
      },
    })

    // Send confirmation email
    await sendOnboardingConfirmationEmail(session.user.email, storeName)

    return new Response(
      JSON.stringify({
        success: true,
        productId: boutiqueProduct.id,
        message: 'Store created! Admin will review within 24 hours.',
      }),
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in onboarding:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
```

### Step 3.3: Add to Sign-up Flow (2 hours)

Update `src/app/auth/signup/page.tsx`:

```typescript
import { SellerOnboarding } from '@/components/SellerOnboarding'

export default function SignupPage() {
  return (
    <div className="container">
      <SellerOnboarding />
    </div>
  )
}
```

---

## Summary

| Phase | What | Hours | Status |
|-------|------|-------|--------|
| 1 | Inventory Risk | 16 | Ready to implement |
| 2 | Shipping Unification | 12 | Ready to implement |
| 3 | Onboarding Streamline | 10 | Ready to implement |
| **TOTAL** | **Critical Foundation** | **38** | **Start Week 1** |

---

## Next Step

Would you like me to:
1. **Implement Phase 1 now** (Inventory Risk)
2. **Implement Phase 2 now** (Shipping Unification)
3. **Implement Phase 3 now** (Onboarding)
4. **All three in parallel** (faster but more complex)

Reply with your choice!
