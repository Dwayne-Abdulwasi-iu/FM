import { NextRequest, NextResponse } from 'next/server'

/**
 * DELETE /api/subscriptions/pro/cancel
 * Cancelled subscriptions are not supported
 * Pro subscriptions are permanent once purchased
 */
export async function DELETE(req: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Subscriptions cannot be cancelled. Pro subscriptions are permanent once purchased.' 
    }, 
    { status: 403 }
  )
}
