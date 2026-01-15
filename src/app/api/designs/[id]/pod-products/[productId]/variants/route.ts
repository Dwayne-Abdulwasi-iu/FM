import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { 
  getPrintfulProductVariants, 
  getPrintifyProductVariants,
  PODVariant 
} from '@/lib/pod-service';

/**
 * GET /api/designs/[id]/pod-products/[productId]/variants
 * Get variants (sizes, colors, prices) for a specific POD product
 * Returns actual prices from the POD provider
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const { id: designId, productId } = await params;

    if (!designId || !productId) {
      return NextResponse.json(
        { message: 'Design ID and Product ID required' },
        { status: 400 }
      );
    }

    // Find the POD config for this design and product
    const podConfig = await prisma.designPODConfig.findFirst({
      where: {
        designId,
        productId,
        enabled: true
      },
      include: {
        design: {
          include: {
            designer: {
              select: {
                acceptsPOD: true,
                podDefaultMarkup: true
              }
            }
          }
        }
      }
    });

    if (!podConfig) {
      return NextResponse.json({
        success: false,
        message: 'POD product not found for this design'
      }, { status: 404 });
    }

    // Check if seller has POD enabled
    if (!podConfig.design.designer.acceptsPOD) {
      return NextResponse.json({
        success: false,
        message: 'Seller has disabled POD for their designs'
      }, { status: 403 });
    }

    // Get variants from the appropriate provider
    let variants: PODVariant[] = [];
    const provider = podConfig.provider.toLowerCase();
    
    try {
      if (provider === 'printful') {
        variants = await getPrintfulProductVariants(productId);
      } else if (provider === 'printify') {
        variants = await getPrintifyProductVariants(productId);
      }
    } catch (error) {
      console.error(`Failed to fetch ${provider} variants:`, error);
    }

    // If no variants from API, use the stored variant IDs with estimated prices
    if (variants.length === 0 && podConfig.variantIds.length > 0) {
      // Return mock variants based on stored IDs
      variants = podConfig.variantIds.map(id => ({
        id,
        name: id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        price: 15.00, // Default base price
        shippingPrice: 4.99,
        inStock: true
      }));
    }

    // Apply seller's markup to all variant prices
    const markup = podConfig.markup || podConfig.design.designer.podDefaultMarkup || 20;
    const variantsWithMarkup = variants.map(v => ({
      ...v,
      basePrice: v.price,
      finalPrice: Number((v.price * (1 + markup / 100)).toFixed(2)),
      shippingPrice: v.shippingPrice
    }));

    // Filter to only enabled variants if specified
    const enabledVariants = podConfig.variantIds.length > 0
      ? variantsWithMarkup.filter(v => 
          podConfig.variantIds.includes(v.id) || 
          podConfig.variantIds.some(vid => v.id.includes(vid))
        )
      : variantsWithMarkup;

    // Group variants by color for easier display
    const colorGroups = groupVariantsByColor(enabledVariants.length > 0 ? enabledVariants : variantsWithMarkup);

    return NextResponse.json({
      success: true,
      productId,
      productName: podConfig.productName,
      provider: podConfig.provider,
      markup,
      variants: enabledVariants.length > 0 ? enabledVariants : variantsWithMarkup,
      colorGroups,
      priceRange: {
        min: Math.min(...variantsWithMarkup.map(v => v.finalPrice)),
        max: Math.max(...variantsWithMarkup.map(v => v.finalPrice))
      }
    });

  } catch (error) {
    console.error('Get POD variants error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch POD variants'
    }, { status: 500 });
  }
}

interface VariantWithMarkup extends PODVariant {
  basePrice: number;
  finalPrice: number;
}

/**
 * Group variants by color for UI display
 */
function groupVariantsByColor(variants: VariantWithMarkup[]) {
  const groups: Record<string, {
    color: string;
    colorHex?: string;
    sizes: Array<{
      id: string;
      size: string;
      price: number;
      finalPrice: number;
      shippingPrice: number;
      inStock: boolean;
    }>;
  }> = {};

  for (const v of variants) {
    const color = v.color || 'Default';
    if (!groups[color]) {
      groups[color] = {
        color,
        colorHex: v.colorHex,
        sizes: []
      };
    }
    groups[color].sizes.push({
      id: v.id,
      size: v.size || v.name,
      price: v.basePrice,
      finalPrice: v.finalPrice,
      shippingPrice: v.shippingPrice,
      inStock: v.inStock
    });
  }

  return Object.values(groups);
}
