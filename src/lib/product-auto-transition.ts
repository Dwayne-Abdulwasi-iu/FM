// Product auto-transition logic for variant discrepancies
// When all variants are decided, auto-transition product status

import prisma from './prisma';

/**
 * Auto-transition product status based on variant discrepancy decisions
 * - If ALL variants ACCEPTED → LIVE
 * - If ANY variant RETURNING/PARTIAL → back to review queue
 * - If MIXED → LIVE (some accepted, some returning is allowed)
 */
export async function autoTransitionProductStatus(shipmentId: string, productId: string) {
  try {
    // Get all variant discrepancies for this shipment related to this product
    const discrepancies = await prisma.variantDiscrepancy.findMany({
      where: {
        shipmentId,
        variant: {
          productId, // Get variants for this specific product
        },
      },
      include: {
        variant: true,
      },
    });

    if (discrepancies.length === 0) {
      return null; // No discrepancies for this product
    }

    // Get product variant count to see if all are decided
    const productVariants = await prisma.boutiqueProductVariant.findMany({
      where: { productId },
      select: { id: true },
    });

    // Check if all product variants have been decided
    const decidedVariants = discrepancies.filter(
      (d) => d.acceptanceStatus !== 'PENDING'
    );

    if (decidedVariants.length < productVariants.length) {
      return null; // Not all variants decided yet
    }

    // Determine new product status
    const hasAcceptedVariants = decidedVariants.some(
      (d) => d.acceptanceStatus === 'ACCEPTED'
    );
    const hasReturningVariants = decidedVariants.some(
      (d) => d.acceptanceStatus === 'RETURNING'
    );
    const hasPartialVariants = decidedVariants.some(
      (d) => d.acceptanceStatus === 'PARTIAL'
    );

    let newStatus = 'LIVE'; // Default: if variants are accepted

    if (hasReturningVariants && !hasAcceptedVariants && !hasPartialVariants) {
      // ALL variants rejected - send back for revision
      newStatus = 'CONTENT_PENDING_APPROVAL';
    } else if (hasPartialVariants || hasReturningVariants) {
      // Some units rejected - LIVE with reduced inventory (partial/mixed)
      newStatus = 'LIVE';
    }

    // Update product status
    const product = await prisma.boutiqueProduct.update({
      where: { id: productId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
      include: {
        variants: {
          select: { id: true, quantity: true },
        },
      },
    });

    console.log(
      `Auto-transitioned product ${productId} to status ${newStatus}`
    );

    return {
      productId,
      newStatus,
      totalVariants: productVariants.length,
      decidedVariants: decidedVariants.length,
      acceptedVariants: decidedVariants.filter(
        (d) => d.acceptanceStatus === 'ACCEPTED'
      ).length,
      returningVariants: decidedVariants.filter(
        (d) => d.acceptanceStatus === 'RETURNING'
      ).length,
      partialVariants: decidedVariants.filter(
        (d) => d.acceptanceStatus === 'PARTIAL'
      ).length,
    };
  } catch (error) {
    console.error(
      `Failed to auto-transition product status: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

/**
 * Check if a product is ready for auto-transition
 * Returns null if not ready, or an object with transition details if ready
 */
export async function checkProductReadyForTransition(
  shipmentId: string,
  productId: string
) {
  try {
    const discrepancies = await prisma.variantDiscrepancy.findMany({
      where: {
        shipmentId,
        variant: {
          productId,
        },
      },
      select: {
        id: true,
        acceptanceStatus: true,
      },
    });

    if (discrepancies.length === 0) {
      return null;
    }

    const allDecided = discrepancies.every(
      (d) => d.acceptanceStatus !== 'PENDING'
    );
    const pendingCount = discrepancies.filter(
      (d) => d.acceptanceStatus === 'PENDING'
    ).length;

    return {
      ready: allDecided,
      totalVariants: discrepancies.length,
      decidedVariants: discrepancies.length - pendingCount,
      pendingVariants: pendingCount,
    };
  } catch (error) {
    console.error('Failed to check product transition readiness:', error);
    return null;
  }
}
