import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getOwnershipContractByNumber } from '@/lib/ownership-documents'

/**
 * GET /api/ownership-contracts?purchaseId=...
 * Get ownership contract for a purchase (buyer or seller can view)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const purchaseId = searchParams.get('purchaseId')
    const contractNumber = searchParams.get('contractNumber')

    if (!purchaseId && !contractNumber) {
      return NextResponse.json(
        { message: 'Either purchaseId or contractNumber is required' },
        { status: 400 }
      )
    }

    let contract

    if (contractNumber) {
      if (typeof contractNumber !== 'string' || contractNumber.trim().length === 0) {
        return NextResponse.json(
          { message: 'Valid contract number is required' },
          { status: 400 }
        )
      }

      contract = await getOwnershipContractByNumber(contractNumber)
    } else {
      if (typeof purchaseId !== 'string' || purchaseId.trim().length === 0) {
        return NextResponse.json(
          { message: 'Valid purchase ID is required' },
          { status: 400 }
        )
      }

      contract = await prisma.ownershipContract.findUnique({
        where: { purchaseId },
        include: {
          buyer: {
            select: { id: true, name: true, displayName: true }
          },
          seller: {
            select: { id: true, name: true, displayName: true }
          }
        }
      })
    }

    if (!contract) {
      return NextResponse.json(
        { message: 'Ownership contract not found' },
        { status: 404 }
      )
    }

    // Verify user is buyer or seller
    if (contract.buyerId !== session.user.id && contract.sellerId !== session.user.id) {
      // Allow admins to view
      if (session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { message: 'You do not have access to this contract' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({
      contract: {
        id: contract.id,
        contractNumber: contract.contractNumber,
        status: contract.status,
        designTitle: contract.designTitle,
        designId: contract.designId,
        sellerFullName: contract.sellerFullName,
        sellerSignature: contract.sellerSignature,
        buyerFullName: contract.buyerFullName,
        buyerSignature: contract.buyerSignature,
        contractContent: contract.contractContent,
        purchaseDate: contract.purchaseDate,
        executedAt: contract.executedAt,
        createdAt: contract.createdAt,
        buyer: contract.buyer,
        seller: contract.seller
      }
    })
  } catch (error) {
    console.error('Get ownership contract error:', error)

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { message: 'Database error - please try again later' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: 'Failed to retrieve contract' },
      { status: 500 }
    )
  }
}
