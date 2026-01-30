import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createOwnershipDocument } from '@/lib/ownership-documents'

/**
 * POST /api/ownership-documents
 * Seller submits ownership document for a design they're uploading
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { designId, sellerFullName, sellerUsername, sellerSignature } = body

    // Validate required fields
    if (!designId || typeof designId !== 'string' || designId.trim().length === 0) {
      return NextResponse.json(
        { message: 'Valid design ID is required' },
        { status: 400 }
      )
    }

    if (!sellerFullName || typeof sellerFullName !== 'string' || sellerFullName.trim().length === 0) {
      return NextResponse.json(
        { message: 'Full name is required' },
        { status: 400 }
      )
    }

    if (!sellerSignature || typeof sellerSignature !== 'string' || sellerSignature.trim().length === 0) {
      return NextResponse.json(
        { message: 'Signature name is required' },
        { status: 400 }
      )
    }

    // Check design exists and belongs to seller
    const design = await prisma.design.findUnique({
      where: { id: designId },
      select: {
        id: true,
        designerId: true,
        title: true,
        buyingTypes: true
      }
    })

    if (!design) {
      return NextResponse.json(
        { message: 'Design not found' },
        { status: 404 }
      )
    }

    if (design.designerId !== session.user.id) {
      return NextResponse.json(
        { message: 'You can only create documents for your own designs' },
        { status: 403 }
      )
    }

    // Only create document if design supports ownership
    if (design.buyingTypes === 'REGULAR') {
      return NextResponse.json(
        { message: 'This design does not support ownership sales' },
        { status: 400 }
      )
    }

    // Check if document already exists for this design
    const existingDoc = await prisma.ownershipDocument.findFirst({
      where: { designId },
      select: { id: true, status: true }
    })

    if (existingDoc) {
      return NextResponse.json(
        { 
          message: 'An ownership document already exists for this design',
          existingDocumentId: existingDoc.id,
          status: existingDoc.status
        },
        { status: 400 }
      )
    }

    // Create the ownership document
    const document = await createOwnershipDocument(
      designId,
      session.user.id,
      sellerFullName.trim(),
      sellerUsername?.trim() || undefined,
      sellerSignature.trim(),
      design.title
    )

    return NextResponse.json(
      {
        message: 'Ownership document created successfully',
        document: {
          id: document.id,
          status: document.status,
          designId: document.designId,
          sellerFullName: document.sellerFullName,
          createdAt: document.createdAt
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create ownership document error:', error)

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { message: 'Database error - please try again later' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: 'Failed to create ownership document' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ownership-documents?designId=...
 * Retrieve ownership document for a design (for buyers viewing before purchase)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const designId = searchParams.get('designId')

    if (!designId || typeof designId !== 'string' || designId.trim().length === 0) {
      return NextResponse.json(
        { message: 'Valid design ID is required' },
        { status: 400 }
      )
    }

    // Get approved ownership document for this design
    const document = await prisma.ownershipDocument.findFirst({
      where: {
        designId,
        status: 'APPROVED'
      },
      select: {
        id: true,
        designId: true,
        sellerFullName: true,
        sellerUsername: true,
        sellerSignature: true,
        documentContent: true,
        documentVersion: true,
        legallyBinding: true,
        createdAt: true,
        seller: {
          select: {
            id: true,
            displayName: true,
            name: true
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json(
        { message: 'No approved ownership document found for this design' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      document: {
        id: document.id,
        designId: document.designId,
        sellerFullName: document.sellerFullName,
        sellerUsername: document.sellerUsername,
        sellerSignature: document.sellerSignature,
        documentContent: document.documentContent,
        documentVersion: document.documentVersion,
        legallyBinding: document.legallyBinding,
        createdAt: document.createdAt,
        seller: document.seller
      }
    })
  } catch (error) {
    console.error('Get ownership document error:', error)

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { message: 'Database error - please try again later' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: 'Failed to retrieve ownership document' },
      { status: 500 }
    )
  }
}
