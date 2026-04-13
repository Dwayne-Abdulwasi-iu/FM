import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getCommissionRate, getSellerTierInfo } from '@/lib/commission-tiers'
import CommissionCalculatorWidget from '@/components/seller/CommissionCalculatorWidget.client'
import { AlertCircle, HelpCircle } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Commission & Payouts | Seller Dashboard',
  description: 'View your earnings, commission rates, and payment history.',
}

export default async function SellerPayoutsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  // Check if user is a seller
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      displayName: true,
      totalEarnings: true,
      designerTier: true,
      proSubscriptionActive: true,
      proSubscriptionExpiresAt: true,
      proTrialActivated: true,
      proTrialExpiresAt: true,
      earnings: {
        select: {
          id: true,
          sellerAmount: true,
          platformCommission: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
    },
  })

  // All logged-in users are allowed to access payouts page (no role check)
  // This lets regular users who have become sellers view their payouts
  if (!user) {
    redirect('/auth/signin')
  }

  // Calculate statistics
  const totalEarnings = user.earnings.reduce((sum: number, e) => sum + (e.sellerAmount || 0), 0)
  const totalCommissions = user.earnings.reduce((sum: number, e) => sum + (e.platformCommission || 0), 0)
  // Note: Paid out earnings should be tracked separately in the database
  const paidOutEarnings = 0
  const pendingEarnings = totalEarnings - paidOutEarnings

  // Calculate monthly GMV (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const monthlyOrders = await prisma.order.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      items: {
        some: {
          design: {
            designerId: user.id,
          },
        },
      },
    },
    select: {
      totalAmount: true,
    },
  })

  const monthlyGMV = monthlyOrders.reduce((sum: number, order) => sum + order.totalAmount, 0)
  const monthlyCommissions = monthlyOrders.reduce((sum: number, order) => {
    const isProSubscriber = user.designerTier === 'VIP_DESIGNER' || user.designerTier === 'VVIP_DESIGNER'
    const now = new Date()
    const hasActiveTrial = Boolean((user.proTrialActivated ?? false) && user.proTrialExpiresAt && user.proTrialExpiresAt > now)
    const hasActiveSubscription = Boolean((user.proSubscriptionActive ?? false) && user.proSubscriptionExpiresAt && user.proSubscriptionExpiresAt > now)
    const hasProBenefits = isProSubscriber || hasActiveSubscription || hasActiveTrial
    const commissionRate = getCommissionRate(user.totalEarnings, hasProBenefits)
    const commission = order.totalAmount * commissionRate
    return sum + commission
  }, 0)

  // Seller tier info (for sidebar & calculator)
  const sellerTierInfo = await getSellerTierInfo(user.id)

  // Get next payout date (1st of next month)
  const today = new Date()
  const nextPayoutDate = new Date(today.getFullYear(), today.getMonth() + 1, 1)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Commission & Payouts</h1>
          <p className="text-gray-600 mt-2">
            Manage your earnings, track commissions, and view payment history
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">How Payouts Work</h3>
            <p className="text-sm text-blue-800 mt-1">
              Your commission rate is based on your earnings tier. Higher total earnings unlock
              lower commission rates. Earnings are held for 7 days to process disputes, then paid
              out monthly on the 1st.
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm font-medium text-gray-600">Monthly GMV</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  ₦{monthlyGMV.toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm font-medium text-gray-600">Monthly Commission</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">
                  ₦{monthlyCommissions.toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm font-medium text-gray-600">Pending Earnings</p>
                <p className="text-2xl font-bold text-yellow-600 mt-2">
                  ₦{pendingEarnings.toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm font-medium text-gray-600">Paid Out</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  ₦{paidOutEarnings.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Quick Links */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link
                  href="/seller/designs"
                  className="block w-full px-4 py-2 text-left border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition"
                >
                  My Designs
                </Link>
                <Link
                  href="/seller/settings"
                  className="block w-full px-4 py-2 text-left border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition"
                >
                  Payout Settings
                </Link>
              </div>
            </div>

            {/* Tier Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Your Tier</h3>
                <span className="text-sm text-gray-600">As of {new Date().toLocaleDateString()}</span>
              </div>
              {sellerTierInfo ? (
                <div>
                  <p className="text-sm font-medium text-gray-800">{sellerTierInfo.tierName}</p>
                  <p className="text-xs text-gray-600 mt-1">Lifetime earnings: ${sellerTierInfo.totalEarnings.toFixed(2)}</p>
                  <p className="mt-3 text-sm">Current rate: <strong className="text-orange-600">{(sellerTierInfo.commissionRate * 100).toFixed(2)}%</strong></p>
                  {sellerTierInfo.nextTier && (
                    <p className="text-xs text-gray-600 mt-2">{sellerTierInfo.amountToNextTier && sellerTierInfo.amountToNextTier > 0 ? `Earn $${sellerTierInfo.amountToNextTier.toFixed(2)} more to reach ${sellerTierInfo.nextTier}` : 'Top tier reached'}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No tier data available.</p>
              )}

              <div className="mt-4">
                <CommissionCalculatorWidget />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Earnings History */}
        {user.earnings.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Earnings</h2>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                      Commission
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {user.earnings.slice(0, 10).map((earning) => (
                    <tr key={earning.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(earning.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {earning.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        ₦{(earning.sellerAmount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                        ₦{(earning.platformCommission || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                          Pending
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {user.earnings.length > 10 && (
              <div className="mt-4 text-center">
                <Link href="/seller/earnings-history" className="inline-block px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50">
                  View All Earnings
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

