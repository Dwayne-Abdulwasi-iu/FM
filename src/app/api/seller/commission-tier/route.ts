import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSellerTierInfo, getAllTiersInfo } from '@/lib/commission-tiers'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const tierInfo = await getSellerTierInfo(session.user.id)
    
    if (!tierInfo) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    const allTiers = getAllTiersInfo(tierInfo.totalEarnings, tierInfo.isProSubscriber)

    return NextResponse.json({
      ...tierInfo,
      allTiers,
    })

  } catch (error) {
    console.error('Commission tier fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
