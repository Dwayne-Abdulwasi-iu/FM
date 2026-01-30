import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PaymentAuditTrail } from '@/components/seller/payment-audit-trail'
import { AlertCircle, HelpCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Payment Audit Trail | Seller Dashboard',
  description: 'View detailed transaction history and payment information.',
}

// Mock data - replace with actual data from API
const mockAuditEntries = [
  {
    id: 'txn_001',
    date: new Date('2024-01-15'),
    type: 'SALE' as const,
    amount: 50000,
    commission: 7500,
    netAmount: 42500,
    processor: 'Paystack',
    orderId: 'order_001',
    status: 'COMPLETED' as const,
    description: 'Sale: Geometric Pattern Design',
    metadata: {
      buyer: 'customer@example.com',
      qty: 1,
    },
  },
  {
    id: 'txn_002',
    date: new Date('2024-01-12'),
    type: 'SALE' as const,
    amount: 35000,
    commission: 5250,
    netAmount: 29750,
    processor: 'Paystack',
    orderId: 'order_002',
    status: 'COMPLETED' as const,
    description: 'Sale: Abstract Illustration Pack',
  },
  {
    id: 'txn_003',
    date: new Date('2024-01-10'),
    type: 'PAYOUT' as const,
    amount: 72250,
    netAmount: 72250,
    processor: 'Bank Transfer',
    status: 'COMPLETED' as const,
    description: 'Monthly payout (Dec 2023)',
  },
  {
    id: 'txn_004',
    date: new Date('2024-01-08'),
    type: 'REFUND' as const,
    amount: -15000,
    commission: -2250,
    netAmount: -12750,
    processor: 'Paystack',
    orderId: 'order_003',
    status: 'COMPLETED' as const,
    description: 'Refund: Customer request',
  },
  {
    id: 'txn_005',
    date: new Date('2024-01-05'),
    type: 'SALE' as const,
    amount: 75000,
    commission: 11250,
    netAmount: 63750,
    processor: 'Paystack',
    orderId: 'order_004',
    status: 'PENDING' as const,
    description: 'Sale: Premium Fashion Collection',
  },
]

export default async function PaymentAuditTrailPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  // In production, fetch actual data from your API
  // const auditEntries = await fetchPaymentAuditTrail(session.user.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Audit Trail</h1>
          <p className="text-gray-600 mt-2">
            Complete transaction history with detailed breakdown of every payment
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">Understanding Your Payments</h3>
            <p className="text-sm text-blue-800 mt-1">
              Each transaction shows the gross amount, commission deducted, and your net earnings.
              Sales have a 7-day hold period to allow for disputes and returns before you receive
              payment.
            </p>
          </div>
        </div>

        {/* Audit Trail */}
        <div className="mb-8">
          <PaymentAuditTrail entries={mockAuditEntries} />
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex gap-3 mb-6">
            <HelpCircle className="w-6 h-6 text-primary-600 flex-shrink-0" />
            <h2 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Why do I see a 7-day hold?</h3>
              <p className="text-sm text-gray-600">
                The 7-day hold period allows customers to report issues, request refunds, or file
                chargebacks. Once this period passes without disputes, funds are released for
                monthly payout.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How are commissions calculated?</h3>
              <p className="text-sm text-gray-600">
                Commissions are based on your monthly GMV tier. Higher sales unlock lower
                commission rates. See your commission breakdown in the Payouts page.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What causes chargebacks?</h3>
              <p className="text-sm text-gray-600">
                Chargebacks occur when customers dispute transactions with their bank or card
                issuer. You're liable for chargeback fees and the transaction amount.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">When do I get paid?</h3>
              <p className="text-sm text-gray-600">
                Earnings are collected monthly and paid on the 1st of the following month. Your
                pending earnings show transactions in the 7-day hold period.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How do refunds affect my earnings?</h3>
              <p className="text-sm text-gray-600">
                Refunds reduce both your gross earnings and commission. The net amount shown is your
                actual loss. Refunds within 30 days are fully refunded to the customer.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                How do I export my transaction data?
              </h3>
              <p className="text-sm text-gray-600">
                Use the Export button to download a CSV file of filtered transactions. This is
                useful for accounting and tax purposes.
              </p>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-8 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg border border-primary-200 p-6">
          <h3 className="font-semibold text-primary-900 mb-2">Need Help?</h3>
          <p className="text-sm text-primary-800 mb-4">
            If you see any discrepancies or have questions about your transactions, please contact
            our support team.
          </p>
          <a
            href="/support"
            className="inline-block text-sm font-medium text-primary-600 hover:text-primary-700 underline"
          >
            Contact Support →
          </a>
        </div>
      </div>
    </div>
  )
}
