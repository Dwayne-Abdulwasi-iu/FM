import React from 'react'
import ProfileTabs from '@/components/profile/ProfileTabs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export default async function ProfilePage() {
  // Try to load session and initial profile/stats on the server so signed-in users
  // see their balance immediately on first paint.
  const session = await getServerSession(authOptions)

  let initialProfile = null
  let initialStats = null
  let initialPayoutSummary = null

  if (session?.user?.id) {
    try {
      const [user, designsCount, ordersData, sellerEarnings] = await Promise.all([
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            id: true,
            email: true,
            name: true,
            bio: true,
            website: true,
            location: true,
            role: true,
            isVerified: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        prisma.design.count({ where: { designerId: session.user.id } }),
        prisma.orderItem.findMany({
          where: { design: { designerId: session.user.id } },
          include: { order: { select: { totalAmount: true, createdAt: true } } }
        }),
        prisma.sellerEarning.findMany({
          where: { sellerId: session.user.id },
          select: { sellerAmount: true, platformCommission: true, createdAt: true, payoutStatus: true, payoutCompletedAt: true, payoutAttemptedAt: true }
        })
      ])

      if (user) initialProfile = user

      const totalSales = ordersData.length
      const totalRevenue = ordersData.reduce((sum: number, item: { order?: { totalAmount?: number } }) => sum + (item.order?.totalAmount || 0), 0)
      const totalEarnings = sellerEarnings.reduce((sum: number, e: { sellerAmount?: number }) => sum + (e.sellerAmount || 0), 0)
      const platformCommission = sellerEarnings.reduce((sum: number, e: { platformCommission?: number }) => sum + (e.platformCommission || 0), 0)

      // Calculate monthly earnings for the last 6 months (same logic as the API route)
      const currentDate = new Date()
      const monthlyEarnings: { month: string; earnings: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1)
        const monthEarnings = sellerEarnings
          .filter((earning: { createdAt: Date | string }) => {
            const d = new Date(earning.createdAt as Date | string)
            return d >= monthStart && d < nextMonth
          })
          .reduce((sum: number, e: { sellerAmount?: number }) => sum + (e.sellerAmount || 0), 0)

        monthlyEarnings.push({ month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), earnings: monthEarnings })
      }

      // compute payout summary from sellerEarnings (assign to outer variable so it is passed to the client)
      if (sellerEarnings && sellerEarnings.length > 0) {
        type SE = { createdAt: Date | string; payoutStatus?: string | null; payoutCompletedAt?: Date | null; payoutAttemptedAt?: Date | null }
        const list = sellerEarnings as SE[]
        const sorted = list.slice().sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf())
        const first = sorted[0]
        const recentStatus = first?.payoutStatus || null
        const paid = sorted.find((s) => s.payoutStatus === 'PAID')
        let lastPaidDate: string | null = null
        if (paid) {
          const d = paid.payoutCompletedAt || paid.payoutAttemptedAt
          if (d) lastPaidDate = new Date(d).toISOString()
        }
        initialPayoutSummary = { lastPayoutStatus: recentStatus, lastPayoutDate: lastPaidDate }
      }

      initialStats = {
        totalDesigns: designsCount,
        totalSales,
        totalRevenue,
        totalEarnings,
        platformCommission,
        monthlyEarnings
      }
      // pass initialPayoutSummary separately
    } catch (err) {
      // swallow server-side fetch errors — client will fallback to API fetches
      console.error('Profile page server fetch error:', err)
    }
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-4 xs:p-5 md:p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Profile</h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto px-4 sm:px-6 space-x-3 xs:space-x-4 sm:space-x-8">
              {/* Tab navigation is handled inside the client component so interactions are client-side only */}
            </nav>
          </div>

      <div className="p-4 xs:p-5 md:p-6">
  {/* Pass initial profile, stats and payout summary to the client component so SSR paint shows balances */}
  <ProfileTabs initialProfile={initialProfile} initialStats={initialStats} initialPayoutSummary={initialPayoutSummary} />
          </div>
        </div>
      </div>
    </div>
  )
}