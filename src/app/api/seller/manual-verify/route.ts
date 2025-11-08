import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { confirmManualVerification } = await request.json()

    if (!confirmManualVerification) {
      return NextResponse.json(
        { message: 'Manual verification confirmation required' },
        { status: 400 }
      )
    }

    // Get the user's current seller account
    const sellerAccount = await prisma.sellerAccount.findUnique({
      where: { userId: session.user.id }
    })

    if (!sellerAccount) {
      return NextResponse.json(
        { message: 'No bank account found' },
        { status: 404 }
      )
    }

    // Manually verify the account
    const updatedAccount = await prisma.sellerAccount.update({
      where: { userId: session.user.id },
      data: {
        isVerified: true,
        recipientCode: null, // Will be created during first transfer attempt
        updatedAt: new Date()
      }
    })

    // Create a note about manual verification
    console.log(`Manual verification completed for user ${session.user.id}:`, {
      accountNumber: sellerAccount.accountNumber,
      bankName: sellerAccount.bankName,
      accountName: sellerAccount.accountName,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Account manually verified! You can now receive payments. Transfer recipient will be created during your first sale.',
      sellerAccount: updatedAccount,
      verificationMethod: 'manual',
      note: 'Manual verification completed. Automatic transfers will be set up during first payout.'
    })

  } catch (error) {
    console.error('Manual verification error:', error)
    const maybe = prismaErrorResponse(error)
    if (maybe) return maybe
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to complete manual verification'
      },
      { status: 500 }
    )
  }
}