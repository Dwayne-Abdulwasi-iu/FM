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

export async function GET(request: NextRequest) {
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

    // Check if Paystack is configured
    if (!process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY === 'sk_test_your_paystack_secret_key_here') {
      return NextResponse.json(
        { message: 'Payment system not configured. Please contact support.' },
        { status: 503 }
      )
    }

    let verifiedAccountName = accountName
    let isVerified = false

    // Verify bank account with Paystack
    try {
      console.log('Attempting to verify account:', { accountNumber, bankCode })
      
      const verification = await paystack.misc.resolve_account_number({
        account_number: accountNumber,
        bank_code: bankCode
      })

      console.log('Paystack verification response:', verification)

      if (!verification.status) {
        return NextResponse.json(
          { message: `Bank verification failed: ${verification.message || 'Invalid account details'}` },
          { status: 400 }
        )
      }

      // More flexible name matching - remove special characters and extra spaces
      const normalizedInputName = accountName.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
      const normalizedBankName = verification.data.account_name.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
      
      console.log('Name comparison:', { input: normalizedInputName, bank: normalizedBankName })

      // Check if names are similar (at least 70% match)
      const similarity = calculateSimilarity(normalizedInputName, normalizedBankName)
      if (similarity < 0.7) {
        return NextResponse.json(
          { 
            message: `Account name mismatch. Bank shows: "${verification.data.account_name}". Please enter the exact name.`,
            bankAccountName: verification.data.account_name
          },
          { status: 400 }
        )
      }

      verifiedAccountName = verification.data.account_name
      isVerified = true

    } catch (verifyError: any) {
      console.error('Bank verification error:', verifyError)
      
      // More specific error messages
      if (verifyError.message?.includes('Invalid account number')) {
        return NextResponse.json(
          { message: 'Invalid account number. Please check and try again.' },
          { status: 400 }
        )
      }
      
      if (verifyError.message?.includes('Invalid bank code')) {
        return NextResponse.json(
          { message: 'Invalid bank code. Please select a different bank and try again.' },
          { status: 400 }
        )
      }

      if (verifyError.message?.includes('network') || verifyError.code === 'ENOTFOUND') {
        return NextResponse.json(
          { message: 'Network error. Please check your internet connection and try again.' },
          { status: 500 }
        )
      }

      // For development, allow account creation without verification
      console.log('Skipping verification due to error, creating account anyway...')
      isVerified = false
    }

    // Create transfer recipient on Paystack
    let recipientCode = null
    if (isVerified) {
      try {
        const recipient = await paystack.transfer_recipient.create({
          type: 'nuban',
          name: verifiedAccountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN'
        })

        if (recipient.status) {
          recipientCode = recipient.data.recipient_code
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
        : 'Bank account added successfully (verification pending)'
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