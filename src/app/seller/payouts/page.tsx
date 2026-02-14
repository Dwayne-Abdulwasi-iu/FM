import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getCommissionRate } from '@/lib/commission-tiers'
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
    // Recalculate commission using tiered rates with trial check
    const isProSubscriber = user.designerTier === 'VIP_DESIGNER' || user.designerTier === 'VVIP_DESIGNER'
    
    // Check for active trial or subscription
    const now = new Date()
    const hasActiveTrial = Boolean(
      (user.proTrialActivated ?? false) && 
      user.proTrialExpiresAt && 
      user.proTrialExpiresAt > now
    )
    const hasActiveSubscription = Boolean(
      (user.proSubscriptionActive ?? false) && 
      user.proSubscriptionExpiresAt && 
      user.proSubscriptionExpiresAt > now
    )
    
    // Apply trial benefits to commission rate (1% discount)
    const hasProBenefits = isProSubscriber || hasActiveSubscription || hasActiveTrial
    const commissionRate = getCommissionRate(user.totalEarnings, hasProBenefits)
    const commission = order.totalAmount * commissionRate
    return sum + commission
  }, 0)

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

            {/* Help Card */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
              <div className="flex gap-3 mb-4">
                <HelpCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <h3 className="font-semibold text-purple-900">Commission Tiers</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="text-purple-800">
                  <strong>STARTER:</strong> $0-$100 = 0.1%
                </li>
                <li className="text-purple-800">
                  <strong>NEW:</strong> $100-$500 = 10%
                </li>
                <li className="text-purple-800">
                  <strong>SILVER:</strong> $2k-$5k = 9%
                </li>
                <li className="text-purple-800">
                  <strong>GOLD:</strong> $5k-$10k = 8.5%
                </li>
              </ul>
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
