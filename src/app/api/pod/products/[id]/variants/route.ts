import { NextRequest, NextResponse } from 'next/server';
import { getPrintfulProductVariants, getPrintifyProductVariants } from '@/lib/pod-service';

/**
 * GET /api/pod/products/[id]/variants
 * Get variants for a specific POD product
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID required' },
        { status: 400 }
      );
    }

    // Printful products
    if (productId.startsWith('printful_')) {
      const variants = await getPrintfulProductVariants(productId);
      
      return NextResponse.json({
        success: true,
        productId,
        variants,
        count: variants.length
      });
    }

    // Printify products
    if (productId.startsWith('printify_')) {
      const variants = await getPrintifyProductVariants(productId);
      
      return NextResponse.json({
        success: true,
        productId,
        variants,
        count: variants.length
      });
    }

    // For mock products, return empty (they already have variants)
    return NextResponse.json({
      success: true,
      productId,
      variants: [],
      message: 'Variants included in product data'
    });

  } catch (error) {
    console.error('Get variants error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch variants',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
