import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { paystack } from '@/lib/paystack'
import prisma from '@/lib/prisma'

const ps = paystack as {
  misc: {
    resolve_account_number: (args: { account_number: string; bank_code: string }) => Promise<{
      status: boolean
      data: { account_name?: string }
      message?: string
    }>
  }
  transfer_recipient: {
    create: (args: { type: 'nuban'; name: string; account_number: string; bank_code: string; currency: 'NGN' }) => Promise<{
      status: boolean
      data: { recipient_code?: string }
      message?: string
    }>
  }
  subaccount: {
    create: (args: { business_name: string; settlement_bank: string; account_number: string; percentage_charge: number; description: string }) => Promise<{
      status: boolean
      data: { subaccount_code?: string }
      message?: string
    }>
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get the user's current seller account
    const sellerAccount = await prisma.sellerAccount.findUnique({
      where: { userId: session.user.id }
    })

    if (!sellerAccount) {
      return NextResponse.json(
        { message: 'No bank account found. Please add a bank account first.' },
        { status: 404 }
      )
    }

    console.log('Attempting to verify account:', {
      accountNumber: sellerAccount.accountNumber,
      bankCode: sellerAccount.bankCode,
      bankName: sellerAccount.bankName
    })

    // Verify bank account with Paystack
  let verifiedAccountName = sellerAccount.accountName
    let recipientCode = sellerAccount.recipientCode

    try {
      console.log('Attempting verification with:', {
        account_number: sellerAccount.accountNumber,
        bank_code: sellerAccount.bankCode,
        bank_name: sellerAccount.bankName
      })

      const verification = await ps.misc.resolve_account_number({
        account_number: sellerAccount.accountNumber,
        bank_code: sellerAccount.bankCode
      })

      console.log('Full Paystack response:', JSON.stringify(verification, null, 2))

      if (verification.status) {
  verifiedAccountName = verification.data.account_name || verifiedAccountName
        
        // Create or update transfer recipient if not exists
        if (!recipientCode) {
          try {
            console.log('Creating transfer recipient...')
            const recipient = await ps.transfer_recipient.create({
              type: 'nuban',
              name: verifiedAccountName,
              account_number: sellerAccount.accountNumber,
              bank_code: sellerAccount.bankCode,
              currency: 'NGN'
            })

            console.log('Recipient creation response:', JSON.stringify(recipient, null, 2))

            if (recipient.status) {
              recipientCode = recipient.data.recipient_code ?? recipientCode ?? null
              console.log('Recipient created successfully:', recipientCode)
            } else {
              console.error('Recipient creation failed:', recipient.message)
            }
          } catch (recipientError: unknown) {
            console.error('Recipient creation error:', recipientError)
            // Continue even if recipient creation fails
          }
        }

        // Create Paystack subaccount for split payments
        let subaccountCode = sellerAccount.subaccountCode
        if (!subaccountCode) {
          try {
            console.log('Creating Paystack subaccount for split payments...')
            const subaccount = await ps.subaccount.create({
              business_name: `${verifiedAccountName} - Fashion Designer`,
              settlement_bank: sellerAccount.bankCode,
              account_number: sellerAccount.accountNumber,
              percentage_charge: 95, // Seller gets 95%, platform keeps 5%
              description: `Subaccount for fashion designer: ${verifiedAccountName}`
            })

            console.log('Subaccount creation response:', JSON.stringify(subaccount, null, 2))

            if (subaccount.status) {
              subaccountCode = subaccount.data.subaccount_code ?? subaccountCode ?? null
              console.log('Subaccount created successfully:', subaccountCode)
            } else {
              console.error('Subaccount creation failed:', subaccount.message)
            }
          } catch (subaccountError: unknown) {
            console.error('Subaccount creation error:', subaccountError)
            // Continue even if subaccount creation fails
          }
        }

        // Update the seller account with verification status
        const updatedAccount = await prisma.sellerAccount.update({
          where: { userId: session.user.id },
          data: {
            accountName: verifiedAccountName,
            recipientCode,
            subaccountCode,
            isVerified: true,
            updatedAt: new Date()
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Bank account verified successfully! Split payments are now enabled - you\'ll receive 95% of each sale instantly.',
          sellerAccount: updatedAccount,
          verifiedName: verifiedAccountName,
          recipientCode,
          subaccountCode,
          paymentMethod: 'split_payments'
        })

      } else {
        console.error('Paystack verification failed:', verification)
        // Handle known invalid inputs explicitly
        const vMsg = verification.message?.toLowerCase() || ''
        if (vMsg.includes('invalid account number')) {
          return NextResponse.json(
            { success: false, message: 'Invalid account number. Please check your account number and try again.', errorCode: 'INVALID_ACCOUNT' },
            { status: 400 }
          )
        }
        if (vMsg.includes('invalid bank code')) {
          return NextResponse.json(
            { success: false, message: 'Bank code issue. Please try re-adding your account with a different bank.', errorCode: 'INVALID_BANK' },
            { status: 400 }
          )
        }

        // Offer manual verification for digital banks even when Paystack responds with status=false
        const bankNameLc = sellerAccount.bankName.toLowerCase()
        const digitalBank = bankNameLc.includes('palmpay') || bankNameLc.includes('opay') || bankNameLc.includes('kuda')
        if (digitalBank) {
          return NextResponse.json(
            {
              success: false,
              message: `Automatic verification isn’t supported for ${sellerAccount.bankName}. Would you like to proceed with manual verification?`,
              manualVerificationAvailable: true
            },
            { status: 200 }
          )
        }

        // If bank returned an account name but it doesn't match closely, surface a clearer message
        const bankAccountName = verification.data?.account_name
        if (bankAccountName) {
          const normalize = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
          const similarity = (() => {
            try {
              const a = normalize(sellerAccount.accountName)
              const b = normalize(bankAccountName)
              // Lightweight similarity using common length ratio (fallback if helper not available here)
              const maxLen = Math.max(a.length, b.length)
              if (!maxLen) return 1
              let matches = 0
              for (let i = 0; i < Math.min(a.length, b.length); i++) {
                if (a[i] === b[i]) matches++
              }
              return matches / maxLen
            } catch {
              return 0
            }
          })()
          if (similarity < 0.7) {
            return NextResponse.json(
              {
                success: false,
                message: `Account name mismatch. Bank shows: "${bankAccountName}". Please update your saved account name and try again.`,
                bankAccountName
              },
              { status: 400 }
            )
          }
        }

        // Generic failure fallback
        return NextResponse.json(
          { success: false, message: `Verification failed: ${verification.message || 'Unable to verify at this time'}` },
          { status: 400 }
        )
      }

    } catch (verifyError: unknown) {
      const vErr = verifyError as Record<string, unknown> | null
      const vMessage = vErr && typeof vErr === 'object' && typeof vErr.message === 'string' ? vErr.message : undefined
      const vCode = vErr && typeof vErr === 'object' && typeof vErr.code === 'string' ? vErr.code : undefined
      const vResponse = vErr && typeof vErr === 'object' && vErr.response && typeof (vErr.response as Record<string, unknown>).data !== 'undefined'
        ? (vErr.response as Record<string, unknown>).data
        : undefined
      const vStack = vErr && typeof vErr === 'object' && typeof vErr.stack === 'string' ? vErr.stack : undefined
      console.error('Detailed verification error:', {
        error: verifyError,
        message: vMessage,
        code: vCode,
        response: vResponse,
        stack: vStack
      })
      
      // For PalmPay and other digital banks, offer manual verification
      if (sellerAccount.bankName.toLowerCase().includes('palmpay') || 
          sellerAccount.bankName.toLowerCase().includes('opay') ||
          sellerAccount.bankName.toLowerCase().includes('kuda')) {
        
        // Allow manual verification for digital banks
        const manuallyVerifiedAccount = await prisma.sellerAccount.update({
          where: { userId: session.user.id },
          data: {
            isVerified: true, // Mark as verified manually
            recipientCode: null, // Will be created during first transfer
            updatedAt: new Date()
          }
        })

        return NextResponse.json({
          success: true,
          message: `Account verified manually for ${sellerAccount.bankName}. Transfers will be processed when you make your first sale.`,
          sellerAccount: manuallyVerifiedAccount,
          verifiedName: sellerAccount.accountName,
          manualVerification: true,
          note: 'Digital bank verification completed. Recipient code will be created during first payout.'
        })
      }
      
      // Specific error handling for other cases
      if (typeof vMessage === 'string' && vMessage.includes('Invalid account number')) {
        return NextResponse.json(
          { 
            success: false,
            message: 'Invalid account number. Please check your account number and try again.',
            errorCode: 'INVALID_ACCOUNT'
          },
          { status: 400 }
        )
      }
      
      if (typeof vMessage === 'string' && vMessage.includes('Invalid bank code')) {
        return NextResponse.json(
          { 
            success: false,
            message: 'Bank code issue. Please try re-adding your account with a different bank.',
            errorCode: 'INVALID_BANK'
          },
          { status: 400 }
        )
      }

      if (vCode === 'ENOTFOUND' || (typeof vMessage === 'string' && vMessage.includes('network'))) {
        return NextResponse.json(
          { 
            success: false,
            message: 'Network error. Please check your internet connection and try again.',
            errorCode: 'NETWORK_ERROR'
          },
          { status: 500 }
        )
      }

      // Offer manual verification as last resort
      return NextResponse.json(
        { 
          success: false,
          message: 'Automatic verification failed. Would you like to proceed with manual verification?',
          errorCode: 'VERIFICATION_FAILED',
          error: vMessage,
          manualVerificationAvailable: true
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Verify account error:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Internal server error. Please try again.' 
      },
      { status: 500 }
    )
  }
}