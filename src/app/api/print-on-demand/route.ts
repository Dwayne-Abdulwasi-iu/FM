import { NextRequest, NextResponse } from 'next/server'
import { 
  getAvailablePODProviders, 
  getPODProducts,
  createPODOrder,
  calculatePODPrice
} from '@/lib/pod-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/print-on-demand
 * Get available POD providers and products
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const provider = searchParams.get('provider')
    const category = searchParams.get('category')

    // Get available providers
    const providers = getAvailablePODProviders()

    // If no provider specified, return list of providers
    if (!provider) {
      return NextResponse.json({ 
        providers,
        message: providers.length === 0 
          ? 'No POD providers configured. Contact admin to set up print-on-demand.'
          : undefined
      })
    }

    // Get products from specific provider
    const products = await getPODProducts(
      provider as 'printful' | 'printify' | 'gooten' | 'printivo',
      category || undefined
    )

    // Add calculated prices with markup
    const productsWithPricing = products.map(product => ({
      ...product,
      variants: product.variants.map(variant => ({
        ...variant,
        pricing: calculatePODPrice(variant.price, variant.shippingPrice, 30)
      }))
    }))

    return NextResponse.json({ 
      provider,
      products: productsWithPricing 
    })

  } catch (error) {
    console.error('POD GET error:', error)
    return NextResponse.json(
      { message: 'Failed to get POD products' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/print-on-demand
 * Create a POD order
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      provider, 
      designUrl, 
      productId, 
      variantId, 
      quantity = 1,
      shippingAddress 
    } = body

    // Validate required fields
    if (!provider || !designUrl || !productId || !variantId || !shippingAddress) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate shipping address
    const requiredAddressFields = ['name', 'address1', 'city', 'country', 'zip']
    for (const field of requiredAddressFields) {
      if (!shippingAddress[field]) {
        return NextResponse.json(
          { message: `Missing shipping address field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Create POD order
    const order = await createPODOrder(
      provider as 'printful' | 'printify' | 'gooten' | 'printivo',
      {
        items: [{
          productId,
          variantId,
          quantity,
          imageUrl: designUrl,
          designImageUrl: designUrl
        }],
        shippingAddress
      }
    )

    return NextResponse.json({ 
      message: 'POD order created successfully',
      order 
    }, { status: 201 })

  } catch (error) {
    console.error('POD POST error:', error)
    return NextResponse.json(
      { message: 'Failed to create POD order' },
      { status: 500 }
    )
  }
}
