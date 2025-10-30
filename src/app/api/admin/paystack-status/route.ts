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

    // Check Paystack account balance
    let balance: unknown = null
    let balanceError: string | null = null
    try {
      const balanceResponse = await paystack.balance.list()
      balance = balanceResponse.data
    } catch (err: unknown) {
      balanceError = err instanceof Error ? err.message : String(err)
    }

    // Check if transfers are enabled
    let transfersEnabled = false
    let transferError: string | null = null
    try {
      // Try to list transfer recipients to check if transfers are enabled
      await paystack.transfer_recipient.list()
      transfersEnabled = true
    } catch (err: unknown) {
      transferError = err instanceof Error ? err.message : String(err)
      if (transferError.includes('not enabled') || transferError.includes('permission')) {
        transfersEnabled = false
      }
    }

    // Get recent transactions
    let recentTransactions: unknown = null
    try {
      const transactionsResponse = await paystack.transaction.list({ perPage: 5 })
      recentTransactions = transactionsResponse.data
    } catch (err: unknown) {
      // Ignore transaction errors for now but log
      console.debug('Paystack transactions fetch failed:', err)
    }

    // Build a safe balance summary
    let balanceSummary = '⚠️ Could not fetch balance'
    if (Array.isArray(balance)) {
      try {
        type BalanceEntry = { currency?: string; balance?: number }
        balanceSummary = `💰 Current balance: ${(
          (balance as BalanceEntry[])
        ).map((b) => `${b.currency ?? 'UNKNOWN'} ${Math.round((b.balance ?? 0) / 100)}`).join(', ')}`
      } catch {
        balanceSummary = '💰 Balance available (unformatted)'
      }
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
        recentTransactions: Array.isArray(recentTransactions) ? recentTransactions.length : 0
      },
      recommendations: [
        !transfersEnabled ? '⚠️ Transfers may not be enabled on your Paystack account' : '✅ Transfers appear to be enabled',
        balanceSummary,
        'For production: Ensure your Paystack account has transfer permissions enabled',
        'Test transfers work differently - they may not actually move money',
        'Consider using Paystack Split Payments for automatic distribution'
      ]
    })

  } catch (error) {
    void error
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