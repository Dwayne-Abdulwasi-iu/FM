/**
 * Print-on-Demand Integration Service
 * Connects with POD providers like Printful, Printify, Gooten
 */

export interface PODProduct {
  id: string
  name: string
  description?: string
  imageUrl?: string
  category: string
  basePrice: number
  variants: PODVariant[]
  priceRange: { min: number; max: number }
  mockupUrl?: string
}

export interface PODVariant {
  id: string
  name: string
  size?: string
  color?: string
  colorHex?: string
  price: number
  shippingPrice: number
  inStock: boolean
}

export interface PODOrderInput {
  externalId?: string // Our order ID for webhook matching
  items: Array<{
    productId: string
    variantId: string
    quantity: number
    imageUrl: string
    designImageUrl?: string // Design image URL for printing
    placement?: string
  }>
  shippingAddress: {
    name: string
    email?: string // Customer email for shipping notifications
    address1: string
    address2?: string
    city: string
    state?: string
    country: string
    zip: string
    phone?: string
  }
}

interface PODOrder {
  orderId: string
  provider: string
  status: string
  trackingNumber?: string
  trackingUrl?: string
  estimatedDelivery?: Date
  items?: Array<{
    productId: string
    variantId: string
    quantity: number
  }>
}

// POD Provider configurations
const POD_PROVIDERS = {
  printful: {
    name: 'Printful',
    apiUrl: 'https://api.printful.com',
    regions: ['US', 'EU', 'GLOBAL'],
    categories: ['Apparel', 'Accessories', 'Home & Living']
  },
  printify: {
    name: 'Printify',
    apiUrl: 'https://api.printify.com/v1',
    regions: ['US', 'EU', 'AU', 'GLOBAL'],
    categories: ['Clothing', 'Accessories', 'Home Decor']
  },
  gooten: {
    name: 'Gooten',
    apiUrl: 'https://api.gooten.com/api',
    regions: ['US', 'EU', 'GLOBAL'],
    categories: ['Apparel', 'Wall Art', 'Drinkware', 'Phone Cases']
  },
  // African-focused POD providers
  printivo: {
    name: 'Printivo',
    apiUrl: 'https://api.printivo.com',
    regions: ['NG', 'GH', 'KE'],
    categories: ['Apparel', 'Stationery', 'Marketing Materials']
  }
}

type ProviderKey = keyof typeof POD_PROVIDERS

/**
 * Check if POD provider is configured
 */
export function isPODConfigured(provider: ProviderKey): boolean {
  const envKeys: Record<ProviderKey, string> = {
    printful: 'PRINTFUL_API_KEY',
    printify: 'PRINTIFY_API_KEY',
    gooten: 'GOOTEN_RECIPE_ID',
    printivo: 'PRINTIVO_API_KEY'
  }
  
  return !!process.env[envKeys[provider]]
}

/**
 * Get available POD providers
 */
export function getAvailablePODProviders(): Array<{ id: string; name: string; regions: string[] }> {
  return Object.entries(POD_PROVIDERS)
    .filter(([key]) => isPODConfigured(key as ProviderKey))
    .map(([id, config]) => ({
      id,
      name: config.name,
      regions: config.regions
    }))
}

/**
 * Get products from a POD provider
 */
export async function getPODProducts(
  provider: ProviderKey,
  category?: string
): Promise<PODProduct[]> {
  if (!isPODConfigured(provider)) {
    throw new Error(`${provider} is not configured`)
  }

  const config = POD_PROVIDERS[provider]
  
  try {
    switch (provider) {
      case 'printful':
        return await getPrintfulProducts(category)
      case 'printify':
        return await getPrintifyProducts(category)
      case 'gooten':
        return await getGootenProducts(category)
      default:
        // Return mock data for unconfigured providers
        return getMockProducts(config.categories, category)
    }
  } catch (error) {
    console.error(`Failed to get ${provider} products:`, error)
    // Return mock products as fallback
    return getMockProducts(POD_PROVIDERS[provider].categories, category)
  }
}

// Cache for Printful products (5 minute TTL)
let printfulProductsCache: { data: PODProduct[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Printful API integration - fetches catalog products
 * Uses v2 API with OAuth token for authenticated requests
 */
async function getPrintfulProducts(category?: string): Promise<PODProduct[]> {
  // Check cache first
  if (printfulProductsCache && Date.now() - printfulProductsCache.timestamp < CACHE_TTL) {
    const cached = printfulProductsCache.data;
    if (category) {
      return cached.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
    }
    return cached;
  }

  // Use v2 API for catalog products (works with OAuth tokens)
  const response = await fetch('https://api.printful.com/v2/catalog-products?limit=100', {
    headers: {
      'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Printful API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Map v2 catalog products
  interface PrintfulV2Product {
    id: number;
    name: string;
    type: string;
    type_name: string;
    image: string;
    is_discontinued: boolean;
  }
  
  const products: PODProduct[] = (data.data || [])
    .filter((p: PrintfulV2Product) => !p.is_discontinued)
    .map((p: PrintfulV2Product) => ({
      id: `printful_${p.id}`,
      name: p.name,
      description: p.type_name || p.type,
      imageUrl: p.image || 'https://placehold.co/400x400/f5f5f5/666?text=Product',
      category: p.type_name || p.type || 'Apparel',
      basePrice: 15.00, // Will be updated when variants are fetched
      variants: [], // Variants fetched on demand via getProductVariants
      priceRange: { min: 10, max: 50 }
    }));

  // Cache the results
  printfulProductsCache = { data: products, timestamp: Date.now() };

  if (category) {
    return products.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
  }
  
  return products;
}

/**
 * Fetch variants for a specific Printful product
 * Uses v2 API for product variants
 */
export async function getPrintfulProductVariants(productId: string): Promise<PODVariant[]> {
  // Extract numeric ID from our prefixed ID
  const numericId = productId.replace('printful_', '');
  
  const response = await fetch(`https://api.printful.com/v2/catalog-products/${numericId}/catalog-variants?limit=200`, {
    headers: {
      'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    console.error(`Failed to fetch Printful product ${numericId}: ${response.status}`);
    return [];
  }

  const data = await response.json();
  
  interface PrintfulV2Variant {
    id: number;
    name: string;
    size: string;
    color: string;
    color_code: string;
    retail_price: string;
    availability_status: string;
  }
  
  return (data.data || []).map((v: PrintfulV2Variant) => ({
    id: `${v.id}`,
    name: v.name,
    size: v.size || undefined,
    color: v.color || undefined,
    colorHex: v.color_code || undefined,
    price: parseFloat(v.retail_price) || 15.00,
    shippingPrice: 4.99,
    inStock: v.availability_status === 'active'
  }));
}

// Cache for Printify blueprints (5 minute TTL)
let printifyProductsCache: { data: PODProduct[]; timestamp: number } | null = null;

/**
 * Printify API integration - fetches catalog blueprints
 * Blueprints are product templates (like T-shirts, mugs) that can have designs applied
 */
async function getPrintifyProducts(category?: string): Promise<PODProduct[]> {
  // Check cache first
  if (printifyProductsCache && Date.now() - printifyProductsCache.timestamp < CACHE_TTL) {
    const cached = printifyProductsCache.data;
    if (category) {
      return cached.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
    }
    return cached;
  }

  const response = await fetch('https://api.printify.com/v1/catalog/blueprints.json', {
    headers: {
      'Authorization': `Bearer ${process.env.PRINTIFY_API_KEY}`
    }
  })

  if (!response.ok) {
    throw new Error(`Printify API error: ${response.status}`)
  }

  const blueprints = await response.json()
  
  interface PrintifyBlueprint {
    id: number;
    title: string;
    description: string;
    brand: string;
    model: string;
    images: string[];
  }
  
  // Map blueprints to PODProduct format (limit to first 100 for performance)
  const products: PODProduct[] = blueprints.slice(0, 100).map((b: PrintifyBlueprint) => ({
    id: `printify_${b.id}`,
    name: b.title,
    description: b.description || `${b.brand} ${b.model}`,
    imageUrl: b.images?.[0] || 'https://placehold.co/400x400/f5f5f5/666?text=Product',
    category: getCategoryFromTitle(b.title),
    basePrice: 15.00, // Will be updated when print providers are fetched
    variants: [], // Variants fetched on demand
    priceRange: { min: 10, max: 50 }
  }));

  // Cache the results
  printifyProductsCache = { data: products, timestamp: Date.now() };

  if (category) {
    return products.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
  }
  
  return products;
}

/**
 * Fetch print providers and variants for a Printify blueprint
 */
export async function getPrintifyProductVariants(productId: string): Promise<PODVariant[]> {
  const blueprintId = productId.replace('printify_', '');
  
  // First get print providers for this blueprint
  const providersResponse = await fetch(
    `https://api.printify.com/v1/catalog/blueprints/${blueprintId}/print_providers.json`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.PRINTIFY_API_KEY}`
      }
    }
  );

  if (!providersResponse.ok) {
    console.error(`Failed to fetch Printify providers for blueprint ${blueprintId}: ${providersResponse.status}`);
    return [];
  }

  const providers = await providersResponse.json();
  if (!providers.length) return [];
  
  // Use the first print provider to get variants
  const providerId = providers[0].id;
  
  const variantsResponse = await fetch(
    `https://api.printify.com/v1/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.PRINTIFY_API_KEY}`
      }
    }
  );

  if (!variantsResponse.ok) {
    console.error(`Failed to fetch Printify variants: ${variantsResponse.status}`);
    return [];
  }

  const data = await variantsResponse.json();
  
  interface PrintifyVariant {
    id: number;
    title: string;
    options: {
      size?: string;
      color?: string;
    };
    placeholders: Array<{ position: string }>;
  }
  
  return (data.variants || []).map((v: PrintifyVariant) => ({
    id: `${v.id}`,
    name: v.title,
    size: v.options?.size || undefined,
    color: v.options?.color || undefined,
    colorHex: undefined, // Printify doesn't provide hex codes in this endpoint
    price: 15.00, // Base price, actual price depends on print provider
    shippingPrice: 5.99,
    inStock: true
  }));
}

/**
 * Helper to categorize products by title
 */
function getCategoryFromTitle(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('tee') || lower.includes('shirt') || lower.includes('tank')) return 'Apparel';
  if (lower.includes('hoodie') || lower.includes('sweat')) return 'Apparel';
  if (lower.includes('mug') || lower.includes('cup') || lower.includes('tumbler')) return 'Drinkware';
  if (lower.includes('poster') || lower.includes('canvas') || lower.includes('art')) return 'Wall Art';
  if (lower.includes('phone') || lower.includes('case')) return 'Phone Cases';
  if (lower.includes('bag') || lower.includes('tote')) return 'Bags';
  if (lower.includes('hat') || lower.includes('cap') || lower.includes('beanie')) return 'Headwear';
  return 'Accessories';
}

/**
 * Gooten API integration
 */
async function getGootenProducts(_category?: string): Promise<PODProduct[]> {
  const recipeId = process.env.GOOTEN_RECIPE_ID
  const response = await fetch(`https://api.gooten.com/api/products?recipeid=${recipeId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.GOOTEN_API_KEY}`
    }
  })

  if (!response.ok) {
    throw new Error('Gooten API error')
  }

  const data = await response.json()
  
  return data.Products?.map((p: { Id: string; Name: string; Categories: string[]; Variants: Array<{ Sku: string; Name: string; Price: { Amount: number } }> }) => ({
    id: `gooten_${p.Id}`,
    name: p.Name,
    category: p.Categories?.[0] || 'General',
    variants: p.Variants?.map((v: { Sku: string; Name: string; Price: { Amount: number } }) => ({
      id: v.Sku,
      name: v.Name,
      price: v.Price?.Amount || 20,
      shippingPrice: 6.99
    })) || [],
    priceRange: { min: 10, max: 60 }
  })) || []
}

/**
 * Mock products for demo/development
 */
function getMockProducts(categories: string[], filterCategory?: string): PODProduct[] {
  const mockProducts: PODProduct[] = [
    {
      id: 'mock_tshirt',
      name: 'Classic T-Shirt',
      description: 'Soft, comfortable cotton t-shirt perfect for everyday wear',
      imageUrl: 'https://placehold.co/400x400/f5f5f5/666?text=T-Shirt',
      category: 'Apparel',
      basePrice: 14.99,
      variants: [
        { id: 's_white', name: 'S White', size: 'S', color: 'White', colorHex: '#ffffff', price: 14.99, shippingPrice: 4.99, inStock: true },
        { id: 'm_white', name: 'M White', size: 'M', color: 'White', colorHex: '#ffffff', price: 14.99, shippingPrice: 4.99, inStock: true },
        { id: 'l_white', name: 'L White', size: 'L', color: 'White', colorHex: '#ffffff', price: 14.99, shippingPrice: 4.99, inStock: true },
        { id: 'xl_white', name: 'XL White', size: 'XL', color: 'White', colorHex: '#ffffff', price: 14.99, shippingPrice: 4.99, inStock: true },
        { id: 's_black', name: 'S Black', size: 'S', color: 'Black', colorHex: '#000000', price: 14.99, shippingPrice: 4.99, inStock: true },
        { id: 'm_black', name: 'M Black', size: 'M', color: 'Black', colorHex: '#000000', price: 14.99, shippingPrice: 4.99, inStock: true },
        { id: 'l_black', name: 'L Black', size: 'L', color: 'Black', colorHex: '#000000', price: 14.99, shippingPrice: 4.99, inStock: true },
        { id: 's_navy', name: 'S Navy', size: 'S', color: 'Navy', colorHex: '#1a1a4e', price: 14.99, shippingPrice: 4.99, inStock: true },
        { id: 'm_navy', name: 'M Navy', size: 'M', color: 'Navy', colorHex: '#1a1a4e', price: 14.99, shippingPrice: 4.99, inStock: true },
      ],
      priceRange: { min: 14.99, max: 14.99 }
    },
    {
      id: 'mock_hoodie',
      name: 'Premium Hoodie',
      description: 'Cozy fleece-lined hoodie with front pocket',
      imageUrl: 'https://placehold.co/400x400/f5f5f5/666?text=Hoodie',
      category: 'Apparel',
      basePrice: 34.99,
      variants: [
        { id: 's_grey', name: 'S Grey', size: 'S', color: 'Grey', colorHex: '#808080', price: 34.99, shippingPrice: 6.99, inStock: true },
        { id: 'm_grey', name: 'M Grey', size: 'M', color: 'Grey', colorHex: '#808080', price: 34.99, shippingPrice: 6.99, inStock: true },
        { id: 'l_grey', name: 'L Grey', size: 'L', color: 'Grey', colorHex: '#808080', price: 34.99, shippingPrice: 6.99, inStock: true },
        { id: 's_black', name: 'S Black', size: 'S', color: 'Black', colorHex: '#000000', price: 34.99, shippingPrice: 6.99, inStock: true },
        { id: 'm_black', name: 'M Black', size: 'M', color: 'Black', colorHex: '#000000', price: 34.99, shippingPrice: 6.99, inStock: true },
        { id: 'l_black', name: 'L Black', size: 'L', color: 'Black', colorHex: '#000000', price: 34.99, shippingPrice: 6.99, inStock: true },
      ],
      priceRange: { min: 34.99, max: 34.99 }
    },
    {
      id: 'mock_tote',
      name: 'Canvas Tote Bag',
      description: 'Sturdy cotton canvas tote for everyday use',
      imageUrl: 'https://placehold.co/400x400/f5f5f5/666?text=Tote+Bag',
      category: 'Accessories',
      basePrice: 12.99,
      variants: [
        { id: 'natural', name: 'Natural', color: 'Natural', colorHex: '#f5f5dc', price: 12.99, shippingPrice: 3.99, inStock: true },
        { id: 'black', name: 'Black', color: 'Black', colorHex: '#000000', price: 12.99, shippingPrice: 3.99, inStock: true },
      ],
      priceRange: { min: 12.99, max: 12.99 }
    },
    {
      id: 'mock_mug',
      name: 'Ceramic Mug',
      description: 'Dishwasher and microwave safe ceramic mug',
      imageUrl: 'https://placehold.co/400x400/f5f5f5/666?text=Mug',
      category: 'Home & Living',
      basePrice: 9.99,
      variants: [
        { id: '11oz_white', name: '11oz White', size: '11oz', color: 'White', colorHex: '#ffffff', price: 9.99, shippingPrice: 4.99, inStock: true },
        { id: '15oz_white', name: '15oz White', size: '15oz', color: 'White', colorHex: '#ffffff', price: 11.99, shippingPrice: 4.99, inStock: true },
        { id: '11oz_black', name: '11oz Black', size: '11oz', color: 'Black', colorHex: '#000000', price: 10.99, shippingPrice: 4.99, inStock: true },
      ],
      priceRange: { min: 9.99, max: 11.99 }
    },
    {
      id: 'mock_poster',
      name: 'Art Print Poster',
      description: 'Museum-quality matte poster printed on thick paper',
      imageUrl: 'https://placehold.co/400x400/f5f5f5/666?text=Poster',
      category: 'Wall Art',
      basePrice: 14.99,
      variants: [
        { id: '12x16', name: '12x16 inches', size: '12x16', price: 14.99, shippingPrice: 5.99, inStock: true },
        { id: '18x24', name: '18x24 inches', size: '18x24', price: 19.99, shippingPrice: 6.99, inStock: true },
        { id: '24x36', name: '24x36 inches', size: '24x36', price: 29.99, shippingPrice: 8.99, inStock: true },
      ],
      priceRange: { min: 14.99, max: 29.99 }
    },
    {
      id: 'mock_phonecase',
      name: 'Phone Case',
      description: 'Impact-resistant slim phone case',
      imageUrl: 'https://placehold.co/400x400/f5f5f5/666?text=Phone+Case',
      category: 'Accessories',
      basePrice: 19.99,
      variants: [
        { id: 'iphone14', name: 'iPhone 14', size: 'iPhone 14', price: 19.99, shippingPrice: 3.99, inStock: true },
        { id: 'iphone14pro', name: 'iPhone 14 Pro', size: 'iPhone 14 Pro', price: 19.99, shippingPrice: 3.99, inStock: true },
        { id: 'iphone15', name: 'iPhone 15', size: 'iPhone 15', price: 19.99, shippingPrice: 3.99, inStock: true },
        { id: 'iphone15pro', name: 'iPhone 15 Pro', size: 'iPhone 15 Pro', price: 19.99, shippingPrice: 3.99, inStock: true },
        { id: 'samsung_s23', name: 'Samsung S23', size: 'Samsung S23', price: 19.99, shippingPrice: 3.99, inStock: true },
      ],
      priceRange: { min: 19.99, max: 19.99 }
    },
    {
      id: 'mock_pillow',
      name: 'Throw Pillow',
      description: 'Soft spun polyester pillow with hidden zipper',
      imageUrl: 'https://placehold.co/400x400/f5f5f5/666?text=Pillow',
      category: 'Home & Living',
      basePrice: 24.99,
      variants: [
        { id: '16x16', name: '16x16 inches', size: '16x16', price: 24.99, shippingPrice: 5.99, inStock: true },
        { id: '18x18', name: '18x18 inches', size: '18x18', price: 27.99, shippingPrice: 5.99, inStock: true },
        { id: '20x20', name: '20x20 inches', size: '20x20', price: 29.99, shippingPrice: 6.99, inStock: true },
      ],
      priceRange: { min: 24.99, max: 29.99 }
    },
    {
      id: 'mock_tanktop',
      name: 'Tank Top',
      description: 'Lightweight breathable tank top',
      imageUrl: 'https://placehold.co/400x400/f5f5f5/666?text=Tank+Top',
      category: 'Apparel',
      basePrice: 17.99,
      variants: [
        { id: 's_white', name: 'S White', size: 'S', color: 'White', colorHex: '#ffffff', price: 17.99, shippingPrice: 4.99, inStock: true },
        { id: 'm_white', name: 'M White', size: 'M', color: 'White', colorHex: '#ffffff', price: 17.99, shippingPrice: 4.99, inStock: true },
        { id: 'l_white', name: 'L White', size: 'L', color: 'White', colorHex: '#ffffff', price: 17.99, shippingPrice: 4.99, inStock: true },
        { id: 's_black', name: 'S Black', size: 'S', color: 'Black', colorHex: '#000000', price: 17.99, shippingPrice: 4.99, inStock: true },
        { id: 'm_black', name: 'M Black', size: 'M', color: 'Black', colorHex: '#000000', price: 17.99, shippingPrice: 4.99, inStock: true },
      ],
      priceRange: { min: 17.99, max: 17.99 }
    }
  ]

  if (filterCategory) {
    return mockProducts.filter(p => 
      p.category.toLowerCase().includes(filterCategory.toLowerCase())
    )
  }

  return mockProducts
}

/**
 * Create a POD order with full order input
 * This function calls the actual POD provider APIs
 */
export async function createPODOrder(
  provider: ProviderKey,
  orderInput: PODOrderInput
): Promise<PODOrder> {
  if (!isPODConfigured(provider)) {
    // Return mock order for development
    const orderId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    console.log('[POD] Provider not configured, returning mock order:', orderId)
    return {
      orderId,
      provider: 'mock',
      status: 'pending',
      items: orderInput.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity
      })),
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  }

  try {
    if (provider === 'printful') {
      return await createPrintfulOrder(orderInput)
    } else if (provider === 'printify') {
      return await createPrintifyOrder(orderInput)
    }
    
    // Fallback for unsupported providers
    throw new Error(`Unsupported provider: ${provider}`)
  } catch (error) {
    console.error(`[POD] Order creation error for ${provider}:`, error)
    throw error
  }
}

/**
 * Create order via Printful API
 */
async function createPrintfulOrder(orderInput: PODOrderInput): Promise<PODOrder> {
  const response = await fetch('https://api.printful.com/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      external_id: orderInput.externalId || `fm_${Date.now()}`,
      recipient: {
        name: orderInput.shippingAddress.name,
        email: orderInput.shippingAddress.email || '',
        address1: orderInput.shippingAddress.address1,
        address2: orderInput.shippingAddress.address2 || '',
        city: orderInput.shippingAddress.city,
        state_code: orderInput.shippingAddress.state || '',
        country_code: orderInput.shippingAddress.country,
        zip: orderInput.shippingAddress.zip,
        phone: orderInput.shippingAddress.phone || ''
      },
      items: orderInput.items.map(item => ({
        sync_variant_id: item.variantId.replace('printful_', ''),
        quantity: item.quantity,
        files: item.designImageUrl ? [{
          type: 'default',
          url: item.designImageUrl
        }] : undefined
      }))
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Printful order failed: ${response.status} - ${JSON.stringify(errorData)}`)
  }

  const data = await response.json()
  const result = data.result
  
  console.log('[POD] Printful order created:', result.id)
  
  return {
    orderId: result.id?.toString(),
    provider: 'printful',
    status: result.status || 'pending',
    items: orderInput.items.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity
    })),
    estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
}

/**
 * Create order via Printify API
 */
async function createPrintifyOrder(orderInput: PODOrderInput): Promise<PODOrder> {
  const shopId = process.env.PRINTIFY_SHOP_ID
  
  const response = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PRINTIFY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      external_id: orderInput.externalId || `fm_${Date.now()}`,
      line_items: orderInput.items.map(item => ({
        product_id: item.productId.replace('printify_', ''),
        variant_id: parseInt(item.variantId),
        quantity: item.quantity
      })),
      shipping_method: 1,
      send_shipping_notification: true,
      address_to: {
        first_name: orderInput.shippingAddress.name.split(' ')[0],
        last_name: orderInput.shippingAddress.name.split(' ').slice(1).join(' ') || orderInput.shippingAddress.name,
        email: orderInput.shippingAddress.email || '',
        phone: orderInput.shippingAddress.phone || '',
        country: orderInput.shippingAddress.country,
        region: orderInput.shippingAddress.state || '',
        address1: orderInput.shippingAddress.address1,
        address2: orderInput.shippingAddress.address2 || '',
        city: orderInput.shippingAddress.city,
        zip: orderInput.shippingAddress.zip
      }
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Printify order failed: ${response.status} - ${JSON.stringify(errorData)}`)
  }

  const data = await response.json()
  
  console.log('[POD] Printify order created:', data.id)
  
  return {
    orderId: data.id,
    provider: 'printify',
    status: data.status || 'pending',
    items: orderInput.items.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity
    })),
    estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
}

/**
 * Generate product mockup with design image
 */
export async function generateMockup(
  provider: ProviderKey,
  options: {
    productId: string
    variantIds?: string[]
    imageUrl: string
    format?: 'png' | 'jpg'
    options?: Record<string, unknown>
  }
): Promise<Array<{ url: string; placement: string; variantId: string; width: number; height: number }>> {
  // In production, call the actual POD API
  // For now, return placeholder mockups
  
  const mockups = [
    { url: `https://placehold.co/600x800/333333/white?text=Front+View`, placement: 'front', variantId: options.productId + '_front', width: 600, height: 800 },
    { url: `https://placehold.co/600x800/333333/white?text=Back+View`, placement: 'back', variantId: options.productId + '_back', width: 600, height: 800 },
    { url: `https://placehold.co/600x800/555555/white?text=Lifestyle`, placement: 'lifestyle', variantId: options.productId + '_lifestyle', width: 600, height: 800 },
  ]

  return mockups
}

/**
 * Get POD order status
 */
export async function getOrderStatus(
  provider: ProviderKey,
  orderId: string
): Promise<PODOrder | null> {
  // Mock implementation
  return {
    orderId,
    provider,
    status: 'in_production',
    trackingNumber: 'TRACK123456',
    trackingUrl: 'https://tracking.example.com/TRACK123456',
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
  }
}

/**
 * Calculate POD product price with design markup
 */
export function calculatePODPrice(
  baseCost: number,
  shippingCost: number,
  markupPercentage: number = 30
): { basePrice: number; shipping: number; markup: number; total: number } {
  const markup = baseCost * (markupPercentage / 100)
  return {
    basePrice: baseCost,
    shipping: shippingCost,
    markup,
    total: baseCost + shippingCost + markup
  }
}

/**
 * Fulfill a POD order after payment is confirmed
 * This is called from the webhook after payment success
 */
export async function fulfillPODOrder(
  orderId: string,
  items: Array<{
    productId: string
    variantId: string
    quantity: number
    designImageUrl: string
  }>,
  shippingAddress: {
    name: string
    address1: string
    address2?: string
    city: string
    state?: string
    country: string
    zip: string
    phone?: string
    email?: string
  }
): Promise<{ success: boolean; podOrderId?: string; provider?: string; error?: string }> {
  // Determine provider from product ID prefix
  const firstProductId = items[0]?.productId || ''
  let provider: ProviderKey = 'printful'
  
  if (firstProductId.startsWith('printify_')) {
    provider = 'printify'
  } else if (firstProductId.startsWith('gooten_')) {
    provider = 'gooten'
  }

  if (!isPODConfigured(provider)) {
    console.log(`[POD] Provider ${provider} not configured, using mock fulfillment`)
    return {
      success: true,
      podOrderId: `mock_${Date.now()}`,
      provider: 'mock'
    }
  }

  try {
    if (provider === 'printful') {
      return await fulfillPrintfulOrder(orderId, items, shippingAddress)
    } else if (provider === 'printify') {
      return await fulfillPrintifyOrder(orderId, items, shippingAddress)
    }
    
    return {
      success: false,
      error: `Unsupported provider: ${provider}`
    }
  } catch (error) {
    console.error(`[POD] Fulfillment error:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Fulfill order via Printful API
 */
async function fulfillPrintfulOrder(
  externalOrderId: string,
  items: Array<{
    productId: string
    variantId: string
    quantity: number
    designImageUrl: string
  }>,
  shippingAddress: {
    name: string
    address1: string
    address2?: string
    city: string
    state?: string
    country: string
    zip: string
    phone?: string
    email?: string
  }
): Promise<{ success: boolean; podOrderId?: string; provider?: string; error?: string }> {
  const response = await fetch('https://api.printful.com/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      external_id: externalOrderId, // Our order ID for webhook matching
      recipient: {
        name: shippingAddress.name,
        email: shippingAddress.email || '', // Include customer email for notifications
        address1: shippingAddress.address1,
        address2: shippingAddress.address2 || '',
        city: shippingAddress.city,
        state_code: shippingAddress.state || '',
        country_code: shippingAddress.country,
        zip: shippingAddress.zip,
        phone: shippingAddress.phone || ''
      },
      items: items.map(item => ({
        sync_variant_id: item.variantId.replace('printful_', ''),
        quantity: item.quantity,
        files: [{
          type: 'default',
          url: item.designImageUrl
        }]
      }))
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Printful order failed: ${response.status} - ${JSON.stringify(errorData)}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    podOrderId: data.result?.id?.toString(),
    provider: 'printful'
  }
}

/**
 * Fulfill order via Printify API
 */
async function fulfillPrintifyOrder(
  externalOrderId: string,
  items: Array<{
    productId: string
    variantId: string
    quantity: number
    designImageUrl: string
  }>,
  shippingAddress: {
    name: string
    address1: string
    address2?: string
    city: string
    state?: string
    country: string
    zip: string
    phone?: string
    email?: string
  }
): Promise<{ success: boolean; podOrderId?: string; provider?: string; error?: string }> {
  const shopId = process.env.PRINTIFY_SHOP_ID
  
  // First, we need to create products in Printify for each item
  // This is a simplified version - production would need product management
  const response = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PRINTIFY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      external_id: externalOrderId, // Our order ID for webhook matching
      line_items: items.map(item => ({
        product_id: item.productId.replace('printify_', ''),
        variant_id: parseInt(item.variantId),
        quantity: item.quantity
      })),
      shipping_method: 1, // Standard shipping
      send_shipping_notification: true, // Printify sends shipping email to customer
      address_to: {
        first_name: shippingAddress.name.split(' ')[0],
        last_name: shippingAddress.name.split(' ').slice(1).join(' ') || shippingAddress.name,
        email: shippingAddress.email || '', // Customer email for shipping notifications
        phone: shippingAddress.phone || '',
        country: shippingAddress.country,
        region: shippingAddress.state || '',
        address1: shippingAddress.address1,
        address2: shippingAddress.address2 || '',
        city: shippingAddress.city,
        zip: shippingAddress.zip
      }
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Printify order failed: ${response.status} - ${JSON.stringify(errorData)}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    podOrderId: data.id,
    provider: 'printify'
  }
}
