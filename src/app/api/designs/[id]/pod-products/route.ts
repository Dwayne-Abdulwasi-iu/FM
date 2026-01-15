import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { 
  getPrintfulProductVariants, 
  getPrintifyProductVariants 
} from '@/lib/pod-service';

/**
 * GET /api/designs/[id]/pod-products
 * Get available POD products for a design (configured by the seller)
 * Only returns products if:
 * 1. The seller has acceptsPOD enabled
 * 2. The design has POD products configured
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: designId } = await params;

    if (!designId) {
      return NextResponse.json(
        { message: 'Design ID required' },
        { status: 400 }
      );
    }

    // First, check if the design exists and if the seller has POD enabled
    const design = await prisma.design.findUnique({
      where: { id: designId },
      include: {
        designer: {
          select: {
            id: true,
            acceptsPOD: true,
            podDefaultMarkup: true
          }
        }
      }
    });

    if (!design) {
      return NextResponse.json({
        success: false,
        message: 'Design not found'
      }, { status: 404 });
    }

    // Check if seller has POD enabled
    if (!design.designer.acceptsPOD) {
      return NextResponse.json({
        success: true,
        hasPOD: false,
        products: [],
        message: 'Seller has not enabled POD for their designs'
      });
    }

    // Get POD configurations for this design
    const podConfigs = await prisma.designPODConfig.findMany({
      where: {
        designId,
        enabled: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (podConfigs.length === 0) {
      return NextResponse.json({
        success: true,
        hasPOD: false,
        products: [],
        message: 'No POD products configured for this design'
      });
    }

    // Fetch actual pricing from providers for each product
    const products = await Promise.all(podConfigs.map(async (config) => {
      const provider = config.provider.toLowerCase();
      let basePrice = 15.00; // Default fallback
      let priceRange = { min: 15.00, max: 30.00 };
      let availableVariants: Array<{ id: string; name: string; size?: string; color?: string; colorHex?: string; price: number; shippingPrice: number; inStock: boolean }> = [];
      
      try {
        // Fetch real variant prices from the provider
        if (provider === 'printful') {
          availableVariants = await getPrintfulProductVariants(config.productId);
        } else if (provider === 'printify') {
          availableVariants = await getPrintifyProductVariants(config.productId);
        }
        
        if (availableVariants.length > 0) {
          // Filter to only enabled variants if specified
          const variants = config.variantIds.length > 0
            ? availableVariants.filter(v => 
                config.variantIds.includes(v.id) || 
                config.variantIds.some(vid => v.id.includes(vid))
              )
            : availableVariants;
          
          if (variants.length > 0) {
            const prices = variants.map(v => v.price);
            basePrice = Math.min(...prices);
            priceRange = {
              min: Math.min(...prices),
              max: Math.max(...prices)
            };
          }
        }
      } catch (error) {
        console.error(`Failed to fetch variants for ${config.productId}:`, error);
        // Continue with default prices
      }

      // Apply markup
      const markup = config.markup || design.designer.podDefaultMarkup || 20;
      const markupMultiplier = 1 + markup / 100;
      
      return {
        id: config.id,
        productId: config.productId,
        productName: config.productName,
        provider: config.provider,
        markup: markup,
        variantIds: config.variantIds,
        basePrice: basePrice,
        estimatedPrice: Number((basePrice * markupMultiplier).toFixed(2)),
        priceRange: {
          min: Number((priceRange.min * markupMultiplier).toFixed(2)),
          max: Number((priceRange.max * markupMultiplier).toFixed(2))
        },
        hasVariants: availableVariants.length > 0,
        variantCount: config.variantIds.length > 0 ? config.variantIds.length : availableVariants.length
      };
    }));

    return NextResponse.json({
      success: true,
      hasPOD: true,
      products,
      count: products.length
    });

  } catch (error) {
    console.error('Get POD products error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch POD products'
    }, { status: 500 });
  }
}
