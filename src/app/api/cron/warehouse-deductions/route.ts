import { NextRequest, NextResponse } from 'next/server'
import { processWarehouseDeductions } from '@/lib/boutique/warehouse'

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    // Process warehouse deductions (every 180-day boundary)
    const result = await processWarehouseDeductions()

    return NextResponse.json({
      success: true,
      message: 'Warehouse deductions processed',
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error processing warehouse deductions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process deductions',
      },
      { status: 500 }
    )
  }
}
