import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { approveOwnershipDocument, rejectOwnershipDocument } from '@/lib/ownership-documents'

/**
 * GET /api/ownership-documents/pending
 * Admin: Get list of pending ownership documents for review
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

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { message: 'Invalid page or limit parameters' },
        { status: 400 }
      )
    }

    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { message: 'Invalid status filter' },
        { status: 400 }
      )
    }

    const skip = (page - 1) * limit

    // Get total count
    const total = await prisma.ownershipDocument.count({
      where: { status }
    })

    // Get documents
    const documents = await prisma.ownershipDocument.findMany({
      where: { status },
      include: {
        design: {
          select: {
            id: true,
            title: true,
            imageUrl: true
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            displayName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    return NextResponse.json({
      documents: documents.map(doc => ({
        id: doc.id,
        status: doc.status,
        designId: doc.design.id,
        designTitle: doc.design.title,
        designImage: doc.design.imageUrl,
        sellerFullName: doc.sellerFullName,
        sellerUsername: doc.sellerUsername,
        sellerSignature: doc.sellerSignature,
        seller: doc.seller,
        legallyBinding: doc.legallyBinding,
        verifiedAt: doc.verifiedAt,
        createdAt: doc.createdAt,
        rejectionReason: doc.rejectionReason,
        documentContent: doc.documentContent,
        documentVersion: doc.documentVersion,
        // FLAW FIX #4: Include preview metadata for admin review
        previewFileUrl: doc.previewFileUrl,
        previewFileType: doc.previewFileType,
        previewFileName: doc.previewFileName,
        previewDescription: doc.previewDescription
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get pending documents error:', error)

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { message: 'Database error - please try again later' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/ownership-documents/admin
 * Admin: Approve or reject an ownership document
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const body = await request.json()
    const { id: documentId, reason } = body

    if (!documentId || typeof documentId !== 'string' || documentId.trim().length === 0) {
      return NextResponse.json(
        { message: 'Valid document ID is required' },
        { status: 400 }
      )
    }

    // Get the document
    const document = await prisma.ownershipDocument.findUnique({
      where: { id: documentId },
      select: { id: true, status: true, designId: true }
    })

    if (!document) {
      return NextResponse.json(
        { message: 'Document not found' },
        { status: 404 }
      )
    }

    if (document.status !== 'PENDING') {
      return NextResponse.json(
        { message: 'Only pending documents can be reviewed' },
        { status: 400 }
      )
    }

    if (action === 'reject') {
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return NextResponse.json(
          { message: 'Rejection reason is required' },
          { status: 400 }
        )
      }

      const updated = await rejectOwnershipDocument(
        documentId,
        session.user.id,
        reason.trim()
      )

      return NextResponse.json({
        message: 'Ownership document rejected',
        document: {
          id: updated.id,
          status: updated.status,
          rejectionReason: updated.rejectionReason
        }
      })
    } else if (action === 'approve') {
      const updated = await approveOwnershipDocument(documentId, session.user.id)

      return NextResponse.json({
        message: 'Ownership document approved and legally binding',
        document: {
          id: updated.id,
          status: updated.status,
          legallyBinding: updated.legallyBinding,
          verifiedAt: updated.verifiedAt
        }
      })
    } else {
      return NextResponse.json(
        { message: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Update document status error:', error)

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { message: 'Database error - please try again later' },
        { status: 503 }
      )
    }

    // Return specific error message if available
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Failed to update document status' },
      { status: 500 }
    )
  }
}
