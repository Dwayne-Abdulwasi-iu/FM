// Boutique rating aggregation utilities
// Updates cached avgRating on BoutiqueProduct when reviews change

import prisma from '@/lib/prisma';

/**
 * Update cached average rating for a boutique product
 * Call this whenever a review is added, updated, or deleted
 * @param productId - Product ID to update
 */
export async function updateProductRating(productId: string): Promise<void> {
  try {
    // Calculate average rating from all approved reviews
    const reviews = await prisma.boutiqueReview.findMany({
      where: {
        productId,
        isApproved: true,
        isHidden: false,
      },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      // No approved reviews - clear the rating
      await prisma.boutiqueProduct.update({
        where: { id: productId },
        data: { avgRating: null },
      });
      return;
    }

    // Calculate average
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalRating / reviews.length;

    // Update product with cached rating
    await prisma.boutiqueProduct.update({
      where: { id: productId },
      data: { avgRating: Math.round(avgRating * 10) / 10 }, // Round to 1 decimal place
    });
  } catch (error) {
    console.error(`Failed to update rating for product ${productId}:`, error);
    throw error;
  }
}

/**
 * Batch recalculate ratings for all products
 * Call this periodically via cron job
 * @returns Object with counts of products processed
 */
export async function recalculateAllProductRatings(): Promise<{
  processed: number;
  updated: number;
  errors: number;
}> {
  const result = { processed: 0, updated: 0, errors: 0 };

  try {
    // Get all products with reviews
    const products = await prisma.boutiqueProduct.findMany({
      select: { id: true },
      where: {
        status: 'LIVE',
      },
    });

    console.log(`Recalculating ratings for ${products.length} products...`);

    for (const product of products) {
      result.processed++;

      try {
        // Get latest review count
        const reviews = await prisma.boutiqueReview.findMany({
          where: {
            productId: product.id,
            isApproved: true,
            isHidden: false,
          },
          select: { rating: true },
        });

        if (reviews.length === 0) {
          // No reviews - clear rating
          const updated = await prisma.boutiqueProduct.update({
            where: { id: product.id },
            data: { avgRating: null },
            select: { id: true },
          });
          if (updated) result.updated++;
        } else {
          // Calculate and cache
          const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
          const avgRating = Math.round((totalRating / reviews.length) * 10) / 10;

          const updated = await prisma.boutiqueProduct.update({
            where: { id: product.id },
            data: { avgRating },
            select: { id: true },
          });
          if (updated) result.updated++;
        }
      } catch (error) {
        result.errors++;
        console.error(`Error updating rating for product ${product.id}:`, error);
      }
    }

    console.log(`Rating recalculation complete: ${result.updated}/${result.processed} updated, ${result.errors} errors`);
    return result;
  } catch (error) {
    console.error('Error recalculating ratings:', error);
    throw error;
  }
}

/**
 * Get rating distribution for a product (useful for UI)
 * @param productId - Product ID
 * @returns Object with count for each rating (1-5)
 */
export async function getProductRatingDistribution(productId: string): Promise<{
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  total: number;
  average: number;
}> {
  const reviews = await prisma.boutiqueReview.findMany({
    where: {
      productId,
      isApproved: true,
      isHidden: false,
    },
    select: { rating: true },
  });

  const distribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    total: reviews.length,
    average: 0,
  };

  if (reviews.length === 0) {
    return distribution;
  }

  reviews.forEach((review) => {
    distribution[review.rating as 1 | 2 | 3 | 4 | 5]++;
  });

  const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
  distribution.average = Math.round((totalRating / reviews.length) * 10) / 10;

  return distribution;
}
