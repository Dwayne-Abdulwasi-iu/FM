import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPODProducts, getAvailablePODProviders, isPODConfigured } from '@/lib/pod-service';
import prisma from '@/lib/prisma';

/**
 * GET /api/pod/products
 * Get available POD products from configured providers
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'printful';
    const category = searchParams.get('category') || undefined;

    // Check if any POD provider is configured
    const availableProviders = getAvailablePODProviders();
    
    if (availableProviders.length === 0) {
      // Return mock products for development
      const mockProducts = await getPODProducts('printful' as 'printful', category);
      return NextResponse.json({
        success: true,
        configured: false,
        provider: 'mock',
        products: mockProducts,
        providers: [],
        message: 'Using mock data. Configure PRINTFUL_API_KEY for real products.'
      });
    }

    // Get products from the specified provider
    const validProvider = provider as 'printful' | 'printify' | 'gooten' | 'printivo';
    
    if (!isPODConfigured(validProvider)) {
      return NextResponse.json({
        success: false,
        message: `${provider} is not configured`
      }, { status: 400 });
    }

    const products = await getPODProducts(validProvider, category);

    return NextResponse.json({
      success: true,
      configured: true,
      provider,
      products,
      providers: availableProviders,
      count: products.length
    });

  } catch (error) {
    console.error('POD products error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch POD products',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/pod/products
 * Save seller's POD product selections for a design
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { designId, products } = body;

    if (!designId || !products || !Array.isArray(products)) {
      return NextResponse.json(
        { message: 'designId and products array are required' },
        { status: 400 }
      );
    }

    // Validate each product selection
    const validatedProducts = products.map((p: {
      productId: string;
      productName?: string;
      variantIds: string[];
      markup: number;
      enabled: boolean;
    }) => ({
      productId: p.productId,
      productName: p.productName || p.productId,
      variantIds: p.variantIds || [],
      markup: Math.max(0, Math.min(200, p.markup || 30)), // 0-200% markup
      enabled: p.enabled !== false
    }));

    // Verify the design belongs to this seller
    const design = await prisma.design.findFirst({
      where: {
        id: designId,
        designerId: session.user.id
      }
    });

    if (!design) {
      return NextResponse.json(
        { message: 'Design not found or you do not have permission' },
        { status: 404 }
      );
    }

    // Extract provider from productId (e.g., "printful_12" -> "printful")
    const getProvider = (productId: string) => {
      if (productId.startsWith('printful_')) return 'printful';
      if (productId.startsWith('printify_')) return 'printify';
      if (productId.startsWith('gooten_')) return 'gooten';
      if (productId.startsWith('printivo_')) return 'printivo';
      return 'unknown';
    };

    // Delete existing POD configs for this design and save new ones
    await prisma.designPODConfig.deleteMany({
      where: { designId }
    });

    // Create new POD configs
    const createdConfigs = await Promise.all(
      validatedProducts
        .filter((p: { enabled: boolean }) => p.enabled)
        .map((p: { productId: string; productName: string; variantIds: string[]; markup: number }) =>
          prisma.designPODConfig.create({
            data: {
              designId,
              provider: getProvider(p.productId),
              productId: p.productId,
              productName: p.productName,
              variantIds: p.variantIds,
              markup: p.markup,
              enabled: true
            }
          })
        )
    );

    console.log('Saved POD products for design:', designId, createdConfigs.length, 'products');

    return NextResponse.json({
      success: true,
      message: 'POD products saved successfully',
      designId,
      productCount: createdConfigs.length
    });

  } catch (error) {
    console.error('Save POD products error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to save POD products'
    }, { status: 500 });
  }
}
