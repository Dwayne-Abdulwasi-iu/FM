import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { MOA_TEMPLATE } from '@/lib/documents/moa-template'
import { AOA_TEMPLATE } from '@/lib/documents/aoa-template'
import { SHAREHOLDER_AGREEMENT_TEMPLATE } from '@/lib/documents/shareholder-agreement-template'
import { EMPLOYMENT_CONTRACT_TEMPLATE } from '@/lib/documents/employment-contract-template'

// Document information mapping
const DOCUMENT_INFO: Record<string, { name: string; content: string }> = {
  MOA: { name: 'Memorandum of Association', content: MOA_TEMPLATE },
  AOA: { name: 'Articles of Association', content: AOA_TEMPLATE },
  SHAREHOLDER_AGREEMENT: { name: 'Shareholder Agreement', content: SHAREHOLDER_AGREEMENT_TEMPLATE },
  EMPLOYMENT_CONTRACT: { name: 'Employment Contract Template', content: EMPLOYMENT_CONTRACT_TEMPLATE },
}

// Calculate SHA256 checksum of content
function calculateChecksum(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

// POST: Create a new document version
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { documentType, notes } = body

    // Validate document type
    if (!DOCUMENT_INFO[documentType]) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    }

    const docInfo = DOCUMENT_INFO[documentType]
    const checksum = calculateChecksum(docInfo.content)

    // Check if this content already exists
    const _existingVersion = await prisma.documentVersion.findFirst({
      where: { checksum },
      orderBy: { versionNumber: 'desc' },
    })

    // Get next version number
    const lastVersion = await prisma.documentVersion.findFirst({
      where: { documentType },
      orderBy: { versionNumber: 'desc' },
    })
    const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1

    // Create new version
    const newVersion = await prisma.documentVersion.create({
      data: {
        documentType,
        documentName: docInfo.name,
        versionNumber: nextVersionNumber,
        content: docInfo.content,
        checksum,
        status: 'DRAFT',
        approvalStatus: 'PENDING',
        notes,
        createdBy: session.user.id!,
        previousVersionId: lastVersion?.id,
      },
      include: {
        creator: { select: { id: true, email: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      version: newVersion,
      message: `${docInfo.name} version ${nextVersionNumber} created`,
    })
  } catch (error) {
    console.error('Error creating document version:', error)
    return NextResponse.json({ error: 'Failed to create version' }, { status: 500 })
  }
}

// GET: List document versions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const documentType = searchParams.get('documentType')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const skip = parseInt(searchParams.get('skip') || '0', 10)

    // Build filter
    // Narrow typing for prisma filter
    const filter: Record<string, unknown> = {}
    if (documentType) filter.documentType = documentType
    if (status) filter.status = status

    // Get versions
    const [versions, total] = await Promise.all([
      prisma.documentVersion.findMany({
        where: filter,
        include: {
          creator: { select: { id: true, email: true, name: true } },
          approver: { select: { id: true, email: true, name: true } },
          usageRecords: { select: { usageType: true, accessedAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.documentVersion.count({ where: filter }),
    ])

    // Aggregate usage stats per version
    const versionsWithStats = versions.map((v) => ({
      ...v,
      stats: {
        totalAccesses: v.usageRecords.length,
        views: v.usageRecords.filter((u) => u.usageType === 'VIEWED').length,
        downloads: v.usageRecords.filter((u) => u.usageType === 'DOWNLOADED').length,
        prints: v.usageRecords.filter((u) => u.usageType === 'PRINTED').length,
        signatures: v.usageRecords.filter((u) => u.usageType === 'SIGNED').length,
        lastAccessed: v.usageRecords[0]?.accessedAt || null,
      },
    }))

    return NextResponse.json({
      versions: versionsWithStats,
      pagination: { total, skip, limit, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Error fetching versions:', error)
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 })
  }
}

// PATCH: Update version status or approve
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { versionId, action, status, approvalStatus } = body

    if (!versionId) {
      return NextResponse.json({ error: 'Version ID required' }, { status: 400 })
    }

    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
    })

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    // Safe typing for update payload
    let updateData: Record<string, unknown> = {}

    if (action === 'approve') {
      updateData = {
        approvalStatus: 'APPROVED',
        status: 'ACTIVE',
        approvedBy: session.user.id!,
        approvedAt: new Date(),
        publishedAt: new Date(),
      }
    } else if (action === 'reject') {
      updateData = {
        approvalStatus: 'REJECTED',
        status: 'ARCHIVED',
        approvedBy: session.user.id!,
        approvedAt: new Date(),
      }
    } else if (action === 'archive') {
      updateData = {
        status: 'ARCHIVED',
      }
    } else if (action === 'supersede') {
      updateData = {
        status: 'SUPERSEDED',
      }
    } else if (status) {
      updateData = { status, approvalStatus }
    }

    const updated = await prisma.documentVersion.update({
      where: { id: versionId },
      data: updateData,
      include: {
        creator: { select: { id: true, email: true, name: true } },
        approver: { select: { id: true, email: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      version: updated,
      message: `Document version ${action || 'updated'} successfully`,
    })
  } catch (error) {
    console.error('Error updating version:', error)
    return NextResponse.json({ error: 'Failed to update version' }, { status: 500 })
  }
}

// DELETE: Archive a version (soft delete)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const versionId = searchParams.get('id')

    if (!versionId) {
      return NextResponse.json({ error: 'Version ID required' }, { status: 400 })
    }

    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
    })

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    const updated = await prisma.documentVersion.update({
      where: { id: versionId },
      data: { status: 'ARCHIVED' },
    })

    return NextResponse.json({
      success: true,
      message: 'Version archived successfully',
      version: updated,
    })
  } catch (error) {
    console.error('Error archiving version:', error)
    return NextResponse.json({ error: 'Failed to archive version' }, { status: 500 })
  }
}
