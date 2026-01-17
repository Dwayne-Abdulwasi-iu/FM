import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * POST /api/seller/price-test/track
 * Track A/B price test events (views and purchases)
 * 
 * This endpoint is called from the frontend to track:
 * - Views: When a user sees a design with an active price test
 * - Purchases: When a user buys at a specific variant price
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { designId, variant, event } = body
    
    if (!designId || !variant || !event) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    if (variant !== 'A' && variant !== 'B') {
      return NextResponse.json({ error: 'Invalid variant' }, { status: 400 })
    }
    
    if (event !== 'view' && event !== 'purchase') {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }
    
    // Check if design has active test
    const design = await prisma.design.findUnique({
      where: { id: designId },
      select: {
        priceTestActive: true,
        priceTestEndsAt: true,
      },
    })
    
    if (!design?.priceTestActive) {
      // No active test - silently succeed
      return NextResponse.json({ success: true, tracked: false })
    }
    
    // Check if test has expired
    if (design.priceTestEndsAt && new Date(design.priceTestEndsAt) <= new Date()) {
      return NextResponse.json({ success: true, tracked: false, expired: true })
    }
    
    // Update the appropriate counter
    if (event === 'view') {
      if (variant === 'A') {
        await prisma.design.update({
          where: { id: designId },
          data: { priceTestViewsA: { increment: 1 } },
        })
      } else {
        await prisma.design.update({
          where: { id: designId },
          data: { priceTestViewsB: { increment: 1 } },
        })
      }
    }
    // Note: Purchases are tracked in the checkout API
    
    return NextResponse.json({ success: true, tracked: true })
  } catch (error) {
    console.error('[Price Test Track] Error:', error)
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 })
  }
}
