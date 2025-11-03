import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { paystack } from '@/lib/paystack'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 401 }
      )
    }

    // Narrow Paystack client methods used in this route
    const ps = paystack as {
      balance: { list: () => Promise<{ data?: Array<{ currency: string; balance: number }> }> }
      transfer_recipient: { list: () => Promise<unknown> }
      transaction: { list: (args: { perPage: number }) => Promise<{ data?: unknown[] }> }
    }

    // Check Paystack account balance
    let balance: Array<{ currency: string; balance: number }> | null = null
    let balanceError: string | null = null
    try {
      const balanceResponse = await ps.balance.list()
      balance = Array.isArray(balanceResponse?.data) ? balanceResponse.data : null
    } catch (error: unknown) {
      balanceError = error instanceof Error ? error.message : String(error)
    }

    // Check if transfers are enabled
    let transfersEnabled = false
    let transferError: string | null = null
    try {
      // Try to list transfer recipients to check if transfers are enabled
      await ps.transfer_recipient.list()
      transfersEnabled = true
    } catch {
      const message = 'Transfers not enabled or insufficient permissions'
      transferError = message
      if (message?.includes('not enabled') || message?.includes('permission')) {
        transfersEnabled = false
      }
    }

    // Get recent transactions
    let recentTransactionsCount = 0
    try {
      const transactionsResponse = await ps.transaction.list({ perPage: 5 })
      recentTransactionsCount = Array.isArray(transactionsResponse?.data) ? transactionsResponse.data.length : 0
    } catch {
      // Ignore transaction errors for now
    }

    return NextResponse.json({
      paystack: {
        balance: {
          status: balance ? 'SUCCESS' : 'ERROR',
          data: balance,
          error: balanceError
        },
        transfers: {
          enabled: transfersEnabled,
          error: transferError
        },
        recentTransactions: recentTransactionsCount
      },
      recommendations: [
        !transfersEnabled ? '⚠️ Transfers may not be enabled on your Paystack account' : '✅ Transfers appear to be enabled',
        balance ? `💰 Current balance: ${balance.map((b) => `${b.currency} ${b.balance/100}`).join(', ')}` : '⚠️ Could not fetch balance',
        'For production: Ensure your Paystack account has transfer permissions enabled',
        'Test transfers work differently - they may not actually move money',
        'Consider using Paystack Split Payments for automatic distribution'
      ]
    })

  } catch (error) {
    console.error('Paystack account check error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check Paystack account status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}