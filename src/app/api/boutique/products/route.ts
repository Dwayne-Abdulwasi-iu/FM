// GET /api/boutique/products - Get boutique products (public listing)
// POST /api/boutique/products - Create new product (seller only)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { 
  PRODUCT_STATUS, 
  FULFILLMENT_METHOD, 
  canUseDirectShipping,
  needsSampleVerification,
  type FulfillmentMethod,
  type SellerTier
} from '@/lib/boutique/constants';

// GET - List products (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const gender = searchParams.get('gender');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sort = searchParams.get('sort') || 'newest';
    const search = searchParams.get('search');
    const sellerId = searchParams.get('sellerId');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      status: PRODUCT_STATUS.LIVE,
    };

    if (category) {
      // Check if it's a parent or child category
      const categoryRecord = await prisma.boutiqueCategory.findUnique({
        where: { slug: category },
        include: { children: true },
      });

      if (categoryRecord) {
        if (categoryRecord.children.length > 0) {
          // Parent category - include all children
          where.OR = [
            { categoryId: categoryRecord.id },
            { categoryId: { in: categoryRecord.children.map(c => c.id) } },
          ];
        } else {
          where.categoryId = categoryRecord.id;
        }
      }
    }

    if (gender) {
      where.gender = gender;
    }

    if (minPrice || maxPrice) {
      where.basePrice = {};
      if (minPrice) (where.basePrice as Record<string, number>).gte = parseFloat(minPrice);
      if (maxPrice) (where.basePrice as Record<string, number>).lte = parseFloat(maxPrice);
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    if (sellerId) {
      where.sellerId = sellerId;
    }

    // Build orderBy
    let orderBy: Record<string, string> = { createdAt: 'desc' };
    switch (sort) {
      case 'price-low':
        orderBy = { basePrice: 'asc' };
        break;
      case 'price-high':
        orderBy = { basePrice: 'desc' };
        break;
      case 'popular':
        orderBy = { viewCount: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { approvedAt: 'desc' };
    }

    const [products, total] = await Promise.all([
      prisma.boutiqueProduct.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, slug: true, parentId: true },
          },
          seller: {
            select: { id: true, name: true, image: true },
          },
          media: {
            where: { isApproved: true },
            orderBy: { sortOrder: 'asc' },
            take: 4,
          },
          variants: {
            where: { isActive: true, quantity: { gt: 0 } },
          },
          _count: {
            select: { reviews: true, favorites: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.boutiqueProduct.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching boutique products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST - Create new product (seller only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is a seller
    if (session.user.role !== 'SELLER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Seller account required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      categoryId,
      subcategory,
      basePrice,
      salePrice,
      brand,
      material,
      careInstructions,
      tags,
      style,
      occasion,
      gender,
      condition,
      weight,
      dimensions,
      variants,
      isDraft,
      fulfillmentMethod, // NEW: ADMIN_STOCK or SELLER_DIRECT
      sellerShippingLocations, // For seller direct
      sellerShippingTime,
      sellerReturnPolicy,
    } = body;

    // Validation
    if (!title || !description || !categoryId || !basePrice) {
      return NextResponse.json(
        { success: false, message: 'Title, description, category, and price are required' },
        { status: 400 }
      );
    }

    // Get seller info for tier check
    const seller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { designerTier: true },
    });

    // Validate fulfillment method
    let validatedFulfillmentMethod: FulfillmentMethod = FULFILLMENT_METHOD.ADMIN_STOCK;
    let requiresSampleVerification = false;
    
    if (fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT) {
      // Check if seller is eligible for direct shipping
      const sellerTier = seller?.designerTier as SellerTier | null;
      if (!canUseDirectShipping(sellerTier)) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Seller Direct shipping requires VIP Designer tier or higher. Continue building your reputation to unlock this feature!' 
          },
          { status: 403 }
        );
      }
      
      validatedFulfillmentMethod = FULFILLMENT_METHOD.SELLER_DIRECT;
      
      // Check if this seller needs sample verification for first few direct products
      const directProductCount = await prisma.boutiqueProduct.count({
        where: {
          sellerId: session.user.id,
          fulfillmentMethod: FULFILLMENT_METHOD.SELLER_DIRECT,
          status: { in: [PRODUCT_STATUS.LIVE, PRODUCT_STATUS.SOLD] },
        },
      });
      
      requiresSampleVerification = needsSampleVerification(directProductCount);
      
      // Validate required fields for seller direct
      if (!sellerShippingLocations || sellerShippingLocations.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Please specify shipping locations for Seller Direct products' },
          { status: 400 }
        );
      }
    }

    // Verify category exists
    const category = await prisma.boutiqueCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Invalid category' },
        { status: 400 }
      );
    }

    // Generate unique slug from title
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Check for existing slugs and add suffix if needed
    let slug = baseSlug;
    let suffix = 0;
    while (true) {
      const existingProduct = await prisma.boutiqueProduct.findFirst({
        where: { slug },
      });
      if (!existingProduct) break;
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }

    // Create the product
    const product = await prisma.boutiqueProduct.create({
      data: {
        title,
        slug,
        description,
        categoryId,
        subcategory,
        basePrice: parseFloat(basePrice),
        salePrice: salePrice ? parseFloat(salePrice) : null,
        brand,
        material,
        careInstructions,
        tags: tags || [],
        style,
        occasion,
        gender,
        condition: condition || 'NEW',
        weight: weight ? parseFloat(weight) : null,
        dimensions: dimensions || null,
        sellerId: session.user.id,
        status: isDraft ? PRODUCT_STATUS.DRAFT : PRODUCT_STATUS.DRAFT,
        // Fulfillment method fields
        fulfillmentMethod: validatedFulfillmentMethod,
        shipsFrom: validatedFulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT ? 'SELLER_LOCATION' : 'ADMIN_WAREHOUSE',
        sellerShippingLocations: validatedFulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT ? sellerShippingLocations : [],
        sellerShippingTime: validatedFulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT ? sellerShippingTime : null,
        sellerReturnPolicy: validatedFulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT ? sellerReturnPolicy : null,
        // All new products start as draft until submitted
      },
    });

    // Create variants if provided
    if (variants && variants.length > 0) {
      await prisma.boutiqueProductVariant.createMany({
        data: variants.map((v: { size?: string; color?: string; colorHex?: string; priceAdjustment?: number; quantity?: number; sku?: string }, index: number) => ({
          productId: product.id,
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
          priceAdjustment: v.priceAdjustment || 0,
          quantity: v.quantity || 1,
          sku: v.sku,
        })),
      });
    }

    // Fetch the complete product with relations
    const completeProduct = await prisma.boutiqueProduct.findUnique({
      where: { id: product.id },
      include: {
        category: true,
        variants: true,
        media: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      product: completeProduct,
      fulfillmentInfo: {
        method: validatedFulfillmentMethod,
        requiresSampleVerification,
        workflow: validatedFulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT
          ? 'Content Review → Approved → Live'
          : 'Content Review → Ship to Admin → Verification → Live',
      },
    });
  } catch (error) {
    console.error('Error creating boutique product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create product' },
      { status: 500 }
    );
  }
}
