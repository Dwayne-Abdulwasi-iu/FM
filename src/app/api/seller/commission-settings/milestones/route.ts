import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Fetch user's milestone template preference
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        milestoneTemplate: true,
        designerTier: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      milestoneTemplate: user.milestoneTemplate || 'standard',
      designerTier: user.designerTier,
    })
  } catch (error) {
    console.error('Error fetching milestone template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Save user's milestone template preference
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { milestoneTemplate } = body

    // Validate template
    const validTemplates = ['simple', 'standard', 'detailed']
    if (!validTemplates.includes(milestoneTemplate)) {
      return NextResponse.json(
        { error: 'Invalid milestone template' },
        { status: 400 }
      )
    }

    // Get user's tier to check if they can use 'simple' template
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { designerTier: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 'simple' template is only for GOLD_DESIGNER tier and above
    const goldPlusTiers = ['GOLD_DESIGNER', 'VIP_DESIGNER', 'VVIP_DESIGNER']
    if (milestoneTemplate === 'simple' && !goldPlusTiers.includes(user.designerTier || '')) {
      return NextResponse.json(
        {
          error: 'Simple template (50/50) is only available for GOLD Designer tier and above. Your current tier is ' +
            (user.designerTier || 'DESIGNER') +
            '. Please choose Standard or Detailed template instead.'
        },
        { status: 403 }
      )
    }

    // Save preference
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { milestoneTemplate },
      select: { milestoneTemplate: true }
    })

    return NextResponse.json({
      success: true,
      milestoneTemplate: updated.milestoneTemplate
    })
  } catch (error) {
    console.error('Error saving milestone template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
