import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/boutique/cart - Get user's boutique cart
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const cartItems = await prisma.boutiqueCartItem.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            basePrice: true,
            salePrice: true,
            thumbnailUrl: true,
            status: true,
            fulfillmentMethod: true,
            sellerShippingTime: true,
            sellerShippingLocations: true,
            seller: {
              select: { id: true, name: true },
            },
          },
        },
        variant: {
          select: {
            id: true,
            size: true,
            color: true,
            colorHex: true,
            quantity: true,
            priceAdjustment: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter out unavailable items
    const validItems = cartItems.filter(
      item => item.product.status === "LIVE" && item.variant && item.variant.quantity > 0
    );
    const invalidItems = cartItems.filter(
      item => item.product.status !== "LIVE" || !item.variant || item.variant.quantity <= 0
    );

    // Calculate totals
    const subtotal = validItems.reduce((sum, item) => {
      const price = item.product.salePrice || item.product.basePrice;
      const adjustment = item.variant?.priceAdjustment || 0;
      return sum + (price + adjustment) * item.quantity;
    }, 0);

    // Check if cart has mixed fulfillment types
    const fulfillmentTypes = new Set(validItems.map(i => i.product.fulfillmentMethod || 'ADMIN_STOCK'));
    const hasSellerDirect = fulfillmentTypes.has('SELLER_DIRECT');
    const hasMixedFulfillment = fulfillmentTypes.size > 1;

    return NextResponse.json({
      success: true,
      cart: {
        items: validItems.map(item => ({
          id: item.id,
          quantity: item.quantity,
          product: item.product,
          variant: item.variant,
          price: (item.product.salePrice || item.product.basePrice) + (item.variant?.priceAdjustment || 0),
          maxQuantity: item.variant?.quantity || 0,
          isSellerDirect: item.product.fulfillmentMethod === 'SELLER_DIRECT',
        })),
        unavailableItems: invalidItems.map(item => ({
          id: item.id,
          product: item.product,
          reason: item.product.status !== "LIVE" ? "Product no longer available" : "Out of stock",
        })),
        subtotal,
        itemCount: validItems.reduce((sum, item) => sum + item.quantity, 0),
        hasSellerDirect,
        hasMixedFulfillment,
        fulfillmentNote: hasSellerDirect 
          ? '🚀 Some items ship directly from sellers'
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch cart" },
      { status: 500 }
    );
  }
}

// POST /api/boutique/cart - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, variantId, quantity = 1 } = body;

    if (!productId || !variantId) {
      return NextResponse.json(
        { success: false, message: "Product and variant are required" },
        { status: 400 }
      );
    }

    // Verify product and variant exist and are available
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: productId },
      include: {
        variants: {
          where: { id: variantId },
        },
      },
    });

    if (!product || product.status !== "LIVE") {
      return NextResponse.json(
        { success: false, message: "Product not available" },
        { status: 400 }
      );
    }

    const variant = product.variants[0];
    if (!variant || variant.quantity < quantity) {
      return NextResponse.json(
        { success: false, message: "Variant not available or insufficient stock" },
        { status: 400 }
      );
    }

    // Check if item already in cart
    const existingItem = await prisma.boutiqueCartItem.findFirst({
      where: {
        userId: session.user.id,
        productId,
        variantId,
      },
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = Math.min(existingItem.quantity + quantity, variant.quantity);
      await prisma.boutiqueCartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      // Create new cart item
      await prisma.boutiqueCartItem.create({
        data: {
          userId: session.user.id,
          productId,
          variantId,
          quantity: Math.min(quantity, variant.quantity),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Item added to cart",
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    return NextResponse.json(
      { success: false, message: "Failed to add to cart" },
      { status: 500 }
    );
  }
}

// PATCH /api/boutique/cart - Update cart item quantity
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { itemId, quantity } = body;

    if (!itemId || typeof quantity !== "number") {
      return NextResponse.json(
        { success: false, message: "Item ID and quantity are required" },
        { status: 400 }
      );
    }

    // Get cart item
    const cartItem = await prisma.boutiqueCartItem.findFirst({
      where: {
        id: itemId,
        userId: session.user.id,
      },
      include: {
        variant: true,
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        { success: false, message: "Cart item not found" },
        { status: 404 }
      );
    }

    if (quantity <= 0) {
      // Delete item
      await prisma.boutiqueCartItem.delete({
        where: { id: itemId },
      });
      return NextResponse.json({
        success: true,
        message: "Item removed from cart",
      });
    }

    // Update quantity
    const newQuantity = Math.min(quantity, cartItem.variant?.quantity || 0);
    await prisma.boutiqueCartItem.update({
      where: { id: itemId },
      data: { quantity: newQuantity },
    });

    return NextResponse.json({
      success: true,
      message: "Cart updated",
    });
  } catch (error) {
    console.error("Error updating cart:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update cart" },
      { status: 500 }
    );
  }
}

// DELETE /api/boutique/cart - Remove item from cart
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json(
        { success: false, message: "Item ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership and delete
    const deleted = await prisma.boutiqueCartItem.deleteMany({
      where: {
        id: itemId,
        userId: session.user.id,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { success: false, message: "Cart item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Item removed from cart",
    });
  } catch (error) {
    console.error("Error removing from cart:", error);
    return NextResponse.json(
      { success: false, message: "Failed to remove from cart" },
      { status: 500 }
    );
  }
}
