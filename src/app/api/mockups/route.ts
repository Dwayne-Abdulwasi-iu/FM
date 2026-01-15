import { NextRequest, NextResponse } from 'next/server'
import { 
  generateMockupUrl, 
  getMockupTemplates, 
  getMockupCategories,
  generateAllMockups 
} from '@/lib/mockup-generator'

/**
 * GET /api/mockups
 * Get available mockup templates or generate mockups for a design
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const designPublicId = searchParams.get('designId')
    const category = searchParams.get('category')
    const templateId = searchParams.get('templateId')

    // If no design ID, return available templates
    if (!designPublicId) {
      const templates = getMockupTemplates(category || undefined)
      const categories = getMockupCategories()

      return NextResponse.json({
        templates: templates.map(t => ({
          id: t.id,
          name: t.name,
          category: t.category,
          thumbnail: t.thumbnail
        })),
        categories
      })
    }

    // Generate mockup(s) for a specific design
    if (templateId) {
      // Single mockup
      const mockupUrl = generateMockupUrl(designPublicId, templateId)
      
      if (!mockupUrl) {
        return NextResponse.json(
          { message: 'Invalid template ID' },
          { status: 400 }
        )
      }

      const template = getMockupTemplates().find(t => t.id === templateId)

      return NextResponse.json({
        mockup: {
          templateId,
          name: template?.name,
          url: mockupUrl
        }
      })
    }

    // Generate all mockups for a design
    const mockups = generateAllMockups(designPublicId, category || undefined)

    return NextResponse.json({ mockups })

  } catch (error) {
    console.error('Mockups error:', error)
    return NextResponse.json(
      { message: 'Failed to generate mockups' },
      { status: 500 }
    )
  }
}
