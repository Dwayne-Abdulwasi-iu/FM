import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { paystack } from '@/lib/paystack'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 401 }
      )
    }

    // Check Paystack account balance
    let balance = null
    let balanceError = null
    try {
      const balanceResponse = await paystack.balance.list()
      balance = balanceResponse.data
    } catch (error: any) {
      balanceError = error.message
    }

    // Check if transfers are enabled
    let transfersEnabled = false
    let transferError = null
    try {
      // Try to list transfer recipients to check if transfers are enabled
      const recipientsResponse = await paystack.transfer_recipient.list()
      transfersEnabled = true
    } catch (error: any) {
      transferError = error.message
      if (error.message?.includes('not enabled') || error.message?.includes('permission')) {
        transfersEnabled = false
      }
    }

    // Get recent transactions
    let recentTransactions = null
    try {
      const transactionsResponse = await paystack.transaction.list({ perPage: 5 })
      recentTransactions = transactionsResponse.data
    } catch (error: any) {
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
        recentTransactions: recentTransactions?.length || 0
      },
      recommendations: [
        !transfersEnabled ? '⚠️ Transfers may not be enabled on your Paystack account' : '✅ Transfers appear to be enabled',
        balance ? `💰 Current balance: ${balance.map((b: any) => `${b.currency} ${b.balance/100}`).join(', ')}` : '⚠️ Could not fetch balance',
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