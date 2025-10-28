import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { paystack } from '@/lib/paystack'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { accountNumber } = await request.json()

    // Test specifically with PalmPay account
    const testAccount = accountNumber || '9112752160' // Your account number
    const palmPayCode = '999991'

    console.log('Testing PalmPay account verification:', {
      accountNumber: testAccount,
      bankCode: palmPayCode
    })

    try {
      const verification = await paystack.misc.resolve_account_number({
        account_number: testAccount,
        bank_code: palmPayCode
      })

      return NextResponse.json({
        success: true,
        message: 'Account verification successful',
        data: {
          accountNumber: testAccount,
          bankCode: palmPayCode,
          bankName: 'PalmPay',
          verificationResponse: verification,
          accountName: verification.data?.account_name,
          status: verification.status
        }
      })

    } catch (error: any) {
      console.error('PalmPay verification error:', error)
      
      return NextResponse.json({
        success: false,
        message: 'Verification failed',
        error: error.message,
        details: {
          accountNumber: testAccount,
          bankCode: palmPayCode,
          bankName: 'PalmPay',
          errorType: error.name || 'Unknown',
          possibleCauses: [
            'Account number might be incorrect',
            'PalmPay account might not be eligible for transfers',
            'Account might be inactive or restricted',
            'Paystack might not support this PalmPay account type'
          ],
          recommendations: [
            'Double-check your PalmPay account number',
            'Ensure your PalmPay account is active and verified',
            'Try with a traditional bank account (GTB, Access, UBA, etc.)',
            'Contact PalmPay support to confirm account status'
          ]
        }
      })
    }

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}