import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PaymentReconciliationDashboard } from '@/components/admin/payment-reconciliation-dashboard'

export const metadata: Metadata = {
  title: 'Payment Reconciliation | Admin Dashboard',
  description: 'Reconcile payments across all processors and track payouts.',
}

export default async function PaymentReconciliationPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Payment Reconciliation</h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-1 sm:mt-2">
            Monitor all payments across processors, reconcile balances, and track payouts
          </p>
        </div>

        <PaymentReconciliationDashboard />
      </div>
    </div>
  )
}
