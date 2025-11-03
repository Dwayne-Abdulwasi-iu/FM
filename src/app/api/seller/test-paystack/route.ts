import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { paystack } from '@/lib/paystack'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Test Paystack configuration
    const tests = []

    // Test 1: Check environment variables
    const hasSecretKey = !!(process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_SECRET_KEY !== 'sk_test_REDACTED')
    const hasPublicKey = !!(process.env.PAYSTACK_PUBLIC_KEY && process.env.PAYSTACK_PUBLIC_KEY !== 'pk_test_your_paystack_public_key_here')
    
    tests.push({
      name: 'Environment Variables',
      status: hasSecretKey && hasPublicKey ? 'PASS' : 'FAIL',
      details: {
        secretKey: hasSecretKey ? 'SET' : 'MISSING',
        publicKey: hasPublicKey ? 'SET' : 'MISSING'
      }
    })

    // Test 2: API Connectivity
    let apiConnectivity = 'FAIL'
    let apiError: string | null = null
    try {
      const ps = paystack as unknown as { misc: { list_banks: (args: { country: string }) => Promise<{ status?: boolean; data: unknown[] }> } }
      const response = await ps.misc.list_banks({ country: 'nigeria' })
      if (response.status && response.data.length > 0) {
        apiConnectivity = 'PASS'
      }
    } catch (error: unknown) {
      apiError = error instanceof Error ? error.message : 'Unknown error'
    }

    tests.push({
      name: 'API Connectivity',
      status: apiConnectivity,
      details: apiError ? { error: apiError } : { banks: 'Available' }
    })

    // Test 3: Account Resolution (using a known test account)
    let accountResolution = 'FAIL'
    let resolutionError: string | null = null
    try {
      // Test with Access Bank - a commonly used bank
      const ps = paystack as unknown as { misc: { resolve_account_number: (args: { account_number: string; bank_code: string }) => Promise<unknown> } }
      await ps.misc.resolve_account_number({
        account_number: '0123456789', // Dummy account for testing API
        bank_code: '044' // Access Bank
      })
      
      // This should fail (dummy account), but if the API responds properly, connectivity is good
      accountResolution = 'API_RESPONDING'
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      if (message?.includes('Could not resolve account name')) {
        // This is expected for dummy account - means API is working
        accountResolution = 'PASS'
      } else {
        resolutionError = message
      }
    }

    tests.push({
      name: 'Account Resolution API',
      status: accountResolution,
      details: resolutionError ? { error: resolutionError } : { message: 'API responding correctly' }
    })

    // Overall status
    const overallStatus = tests.every(test => test.status === 'PASS' || test.status === 'API_RESPONDING') ? 'HEALTHY' : 'ISSUES_DETECTED'

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      tests,
      recommendations: overallStatus === 'ISSUES_DETECTED' ? [
        'Check your Paystack API keys in .env.local',
        'Ensure you have a stable internet connection',
        'Verify your Paystack account is active'
      ] : [
        'Paystack integration is working correctly',
        'You can now add bank accounts for sellers'
      ]
    })

  } catch (error) {
    console.error('Paystack test error:', error)
    return NextResponse.json(
      { 
        status: 'ERROR',
        message: 'Test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}