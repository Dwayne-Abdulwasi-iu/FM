import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

/**
 * A/B Price Testing API for Sellers
 * 
 * Allows VIP Designer+ sellers to test different price points for their designs.
 * The test price is stored in the database and used at checkout time.
 * 
 * IMPORTANT: This feature is restricted to Tier 3+ (VIP_DESIGNER, VVIP_DESIGNER)
 */

const VIP_TIERS = ['VIP_DESIGNER', 'VVIP_DESIGNER']

/**
 * GET /api/seller/price-test
 * List all price tests for the seller
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get seller info to check tier
    const seller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { designerTier: true },
    })
    
    const hasAccess = seller?.designerTier && VIP_TIERS.includes(seller.designerTier)

    // Get designs with active price tests
    const designs = await prisma.design.findMany({
      where: {
        designerId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        price: true,
        imageUrl: true,
        totalSales: true,
        viewCount: true,
        priceTestActive: true,
        priceTestVariant: true,
        priceTestStartedAt: true,
        priceTestEndsAt: true,
        priceTestViewsA: true,
        priceTestViewsB: true,
        priceTestSalesA: true,
        priceTestSalesB: true,
        priceTestRevenueA: true,
        priceTestRevenueB: true,
      },
    })

    // Separate active and completed tests
    const now = new Date()
    const activeTests = designs.filter(d => d.priceTestActive && d.priceTestEndsAt && new Date(d.priceTestEndsAt) > now)
    const completedTests = designs.filter(d => d.priceTestActive && d.priceTestEndsAt && new Date(d.priceTestEndsAt) <= now)

    return NextResponse.json({
      hasAccess,
      sellerTier: seller?.designerTier || null,
      designs: designs.map(d => ({
        ...d,
        canTest: d.totalSales >= 5 && hasAccess,
        estimatedTestDuration: '7-14 days',
        suggestedPriceVariants: [
          Math.round(d.price * 0.8 * 100) / 100,
          Math.round(d.price * 0.9 * 100) / 100,
          Math.round(d.price * 1.1 * 100) / 100,
          Math.round(d.price * 1.2 * 100) / 100,
        ],
      })),
      activeTests: activeTests.map(t => ({
        id: t.id,
        designTitle: t.title,
        originalPrice: t.price,
        variantPrice: t.priceTestVariant,
        startedAt: t.priceTestStartedAt,
        endsAt: t.priceTestEndsAt,
        results: {
          A: { views: t.priceTestViewsA, sales: t.priceTestSalesA, revenue: t.priceTestRevenueA },
          B: { views: t.priceTestViewsB, sales: t.priceTestSalesB, revenue: t.priceTestRevenueB },
        },
      })),
      completedTests: completedTests.map(t => ({
        id: t.id,
        designTitle: t.title,
        originalPrice: t.price,
        variantPrice: t.priceTestVariant,
        startedAt: t.priceTestStartedAt,
        endsAt: t.priceTestEndsAt,
        results: {
          A: { 
            views: t.priceTestViewsA, 
            sales: t.priceTestSalesA, 
            revenue: t.priceTestRevenueA,
            conversionRate: t.priceTestViewsA > 0 ? (t.priceTestSalesA / t.priceTestViewsA * 100).toFixed(2) : 0,
          },
          B: { 
            views: t.priceTestViewsB, 
            sales: t.priceTestSalesB, 
            revenue: t.priceTestRevenueB,
            conversionRate: t.priceTestViewsB > 0 ? (t.priceTestSalesB / t.priceTestViewsB * 100).toFixed(2) : 0,
          },
        },
        winner: t.priceTestRevenueB > t.priceTestRevenueA ? 'B' : 'A',
      })),
    })
  } catch (error) {
    console.error('[Price Test GET] Error:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/seller/price-test
 * Create a new A/B price test (VIP_DESIGNER+ only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check seller tier
    const seller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { designerTier: true },
    })
    
    if (!seller?.designerTier || !VIP_TIERS.includes(seller.designerTier)) {
      return NextResponse.json({ 
        error: 'A/B price testing requires VIP Designer tier or higher',
        requiredTier: 'VIP_DESIGNER',
        currentTier: seller?.designerTier || 'NONE',
      }, { status: 403 })
    }

    const body = await request.json()
    const { designId, variantPrice, durationDays = 14 } = body

    if (!designId || typeof variantPrice !== 'number') {
      return NextResponse.json(
        { error: 'designId and variantPrice are required' },
        { status: 400 }
      )
    }

    if (variantPrice <= 0) {
      return NextResponse.json(
        { error: 'Variant price must be greater than 0' },
        { status: 400 }
      )
    }

    // Verify design ownership and check if test already active
    const design = await prisma.design.findFirst({
      where: {
        id: designId,
        designerId: session.user.id,
      },
    })

    if (!design) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 })
    }

    if (design.priceTestActive) {
      return NextResponse.json({ 
        error: 'A price test is already active for this design. Stop it first.' 
      }, { status: 400 })
    }

    // Calculate test end date
    const startedAt = new Date()
    const endsAt = new Date(startedAt.getTime() + durationDays * 24 * 60 * 60 * 1000)

    // Save the price test to the database
    await prisma.design.update({
      where: { id: designId },
      data: {
        priceTestActive: true,
        priceTestVariant: variantPrice,
        priceTestStartedAt: startedAt,
        priceTestEndsAt: endsAt,
        // Reset counters
        priceTestViewsA: 0,
        priceTestViewsB: 0,
        priceTestSalesA: 0,
        priceTestSalesB: 0,
        priceTestRevenueA: 0,
        priceTestRevenueB: 0,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'A/B price test created',
      test: {
        id: designId,
        design: {
          id: design.id,
          title: design.title,
        },
        variants: {
          A: { price: design.price, label: 'Control (Original)' },
          B: { price: variantPrice, label: 'Variant (Test)' },
        },
        startedAt: startedAt.toISOString(),
        endsAt: endsAt.toISOString(),
        durationDays,
      },
      instructions: [
        `Your design "${design.title}" is now in A/B testing mode.`,
        `50% of visitors will see $${design.price.toFixed(2)} (Control)`,
        `50% will see $${variantPrice.toFixed(2)} (Variant)`,
        `Test runs for ${durationDays} days until ${endsAt.toLocaleDateString()}`,
        'Each buyer is "sticky" — they always see the same price',
        'Check back for results and recommendations',
      ],
    })
  } catch (error) {
    console.error('[Price Test POST] Error:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/seller/price-test
 * Stop an active price test
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const testId = searchParams.get('testId')

    if (!testId) {
      return NextResponse.json({ error: 'testId is required' }, { status: 400 })
    }

    // Verify ownership
    const design = await prisma.design.findFirst({
      where: {
        id: testId,
        designerId: session.user.id,
      },
    })

    if (!design) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 })
    }

    // Get final results before stopping
    const results = {
      A: {
        price: design.price,
        views: design.priceTestViewsA,
        sales: design.priceTestSalesA,
        revenue: design.priceTestRevenueA,
        conversionRate: design.priceTestViewsA > 0 
          ? (design.priceTestSalesA / design.priceTestViewsA * 100).toFixed(2) 
          : '0.00',
      },
      B: {
        price: design.priceTestVariant,
        views: design.priceTestViewsB,
        sales: design.priceTestSalesB,
        revenue: design.priceTestRevenueB,
        conversionRate: design.priceTestViewsB > 0 
          ? (design.priceTestSalesB / design.priceTestViewsB * 100).toFixed(2) 
          : '0.00',
      },
    }

    const winner = design.priceTestRevenueB > design.priceTestRevenueA ? 'B' : 'A'
    const recommendation = winner === 'B' && design.priceTestVariant
      ? `Consider updating your price to $${design.priceTestVariant.toFixed(2)} based on test results`
      : 'Keep your current price — it performed well in the test'

    // Stop the test (keep results for historical data)
    await prisma.design.update({
      where: { id: testId },
      data: {
        priceTestActive: false,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'A/B price test stopped',
      results,
      winner,
      recommendation,
    })
  } catch (error) {
    console.error('[Price Test DELETE] Error:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
