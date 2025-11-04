import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { paystack } from '@/lib/paystack'
import prisma from '@/lib/prisma'

// Helper function to calculate string similarity
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const sellerAccount = await prisma.sellerAccount.findUnique({
      where: { userId: session.user.id }
    })

    return NextResponse.json({ sellerAccount })

  } catch (error) {
    console.error('Get seller account error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { accountNumber, accountName, bankName, bankCode } = await request.json()

    if (!accountNumber || !accountName || !bankName || !bankCode) {
      return NextResponse.json(
        { message: 'All account details are required' },
        { status: 400 }
      )
    }

    // Check if Paystack is configured.
    const paystackConfigured = Boolean(
      process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_SECRET_KEY !== 'sk_test_REDACTED'
    )

    // In production, require Paystack to be configured; in dev, proceed in grace mode
    if (process.env.NODE_ENV === 'production' && !paystackConfigured) {
      return NextResponse.json(
        { message: 'Payments are not configured. Please contact support.' },
        { status: 503 }
      )
    }

  let verifiedAccountName = accountName
  let isVerified = false
  let responseNote: string | undefined
  let bankSuggestedName: string | undefined

    // Verify bank account with Paystack (only if configured)
    try {
      if (!paystackConfigured) {
        console.warn('[seller/account] Paystack not configured. Skipping bank verification and proceeding in unverified mode.')
        throw new Error('PAYSTACK_NOT_CONFIGURED_SKIP_VERIFICATION')
      }
      console.log('Attempting to verify account:', { accountNumber, bankCode })
      const ps = paystack as {
        misc: { resolve_account_number: (args: { account_number: string; bank_code: string }) => Promise<{ status: boolean; data: { account_name: string }; message?: string }> }
        transfer_recipient: { create: (args: { type: 'nuban'; name: string; account_number: string; bank_code: string; currency: 'NGN' }) => Promise<{ status: boolean; data: { recipient_code?: string }; message?: string }> }
      }
      
      const verification = await ps.misc.resolve_account_number({
        account_number: accountNumber,
        bank_code: bankCode
      })

      console.log('Paystack verification response:', verification)

      if (!verification.status) {
        // Do not hard fail here; proceed to save as unverified and inform the client
        responseNote = `Bank verification could not be completed: ${verification.message || 'Invalid or unavailable account details'}`
      } else {
        // More flexible name matching - remove special characters and extra spaces
        const normalizedInputName = accountName.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
        const normalizedBankName = (verification.data.account_name || '').toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
        
        console.log('Name comparison:', { input: normalizedInputName, bank: normalizedBankName })

        // Check if names are similar (at least 70% match)
        const similarity = calculateSimilarity(normalizedInputName, normalizedBankName)
        if (similarity < 0.7) {
          // Don't block account creation; save as unverified and return suggested bank name for user awareness
          bankSuggestedName = verification.data.account_name
          responseNote = `Account name differs from bank records. Bank shows: "${verification.data.account_name}". You can proceed and verify later.`
        } else {
          verifiedAccountName = verification.data.account_name
          isVerified = true
        }
      }


    } catch (verifyError: unknown) {
      console.error('Bank verification error:', verifyError)
      
      // More specific error messages
      const message = verifyError instanceof Error ? verifyError.message : String(verifyError)
      const code = (verifyError as { code?: string })?.code
      if (message?.includes('Invalid account number')) {
        return NextResponse.json(
          { message: 'Invalid account number. Please check and try again.' },
          { status: 400 }
        )
      }
      
      if (message?.includes('Invalid bank code')) {
        return NextResponse.json(
          { message: 'Invalid bank code. Please select a different bank and try again.' },
          { status: 400 }
        )
      }

      if (message?.includes('network') || code === 'ENOTFOUND') {
        return NextResponse.json(
          { message: 'Network error. Please check your internet connection and try again.' },
          { status: 500 }
        )
      }

  // For development or when Paystack is not configured, allow account creation without verification
  console.log('Skipping verification, creating account anyway as unverified...')
  isVerified = false
    }

    // Create transfer recipient on Paystack
    let recipientCode: string | null = null
    if (isVerified && paystackConfigured) {
      try {
        const ps = paystack as {
          transfer_recipient: { create: (args: { type: 'nuban'; name: string; account_number: string; bank_code: string; currency: 'NGN' }) => Promise<{ status: boolean; data: { recipient_code?: string }; message?: string }> }
        }
        const recipient = await ps.transfer_recipient.create({
          type: 'nuban',
          name: verifiedAccountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN'
        })

        if (recipient.status) {
          recipientCode = recipient.data.recipient_code ?? null
          console.log('Recipient created successfully:', recipientCode)
        }
      } catch (recipientError) {
        console.error('Recipient creation error:', recipientError)
        // Continue without recipient code, can be created later
      }
    }

    // Create or update seller account
    const sellerAccount = await prisma.sellerAccount.upsert({
      where: { userId: session.user.id },
      update: {
        accountNumber,
        accountName: verifiedAccountName,
        bankName,
        bankCode,
        recipientCode,
        isVerified: isVerified && !!recipientCode,
        isActive: true
      },
      create: {
        userId: session.user.id,
        accountNumber,
        accountName: verifiedAccountName,
        bankName,
        bankCode,
        recipientCode,
        isVerified: isVerified && !!recipientCode,
        isActive: true
      }
    })

    return NextResponse.json({ 
      sellerAccount,
      message: isVerified 
        ? 'Bank account verified and added successfully' 
        : `Bank account added successfully (verification pending)${responseNote ? `. ${responseNote}` : ''}`,
      bankAccountName: bankSuggestedName
    })

  } catch (error) {
    console.error('Create seller account error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { isActive } = await request.json()

    const sellerAccount = await prisma.sellerAccount.update({
      where: { userId: session.user.id },
      data: { isActive }
    })

    return NextResponse.json({ 
      sellerAccount,
      message: `Account ${isActive ? 'activated' : 'deactivated'} successfully` 
    })

  } catch (error) {
    console.error('Update seller account error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}