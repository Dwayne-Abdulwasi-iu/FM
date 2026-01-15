import { NextRequest, NextResponse } from 'next/server';
import { generateMockup, isPODConfigured } from '@/lib/pod-service';

/**
 * POST /api/pod/mockups
 * Generate product mockups with a design
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      provider = 'printful',
      productId,
      variantIds,
      imageUrl,
      format = 'png',
      options = {}
    } = body;

    if (!productId || !imageUrl) {
      return NextResponse.json(
        { message: 'productId and imageUrl are required' },
        { status: 400 }
      );
    }

    const validProvider = provider as 'printful' | 'printify' | 'gooten' | 'printivo';
    
    // Check if provider is configured
    if (!isPODConfigured(validProvider)) {
      // Return mock mockup URLs for development
      const mockMockups = await generateMockupMock(productId, imageUrl);
      return NextResponse.json({
        success: true,
        configured: false,
        provider: 'mock',
        mockups: mockMockups,
        message: 'Using mock mockups. Configure POD API keys for real mockups.'
      });
    }

    // Generate real mockups
    const mockups = await generateMockup(validProvider, {
      productId,
      variantIds: variantIds || [],
      imageUrl,
      format: format as 'png' | 'jpg',
      options
    });

    return NextResponse.json({
      success: true,
      configured: true,
      provider,
      mockups,
      count: mockups.length
    });

  } catch (error) {
    console.error('Mockup generation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to generate mockups',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Generate mock mockup URLs for development
 */
async function generateMockupMock(productId: string, imageUrl: string): Promise<MockupResult[]> {
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Use placeholder images with the design overlaid (conceptually)
  const mockupTemplates = [
    { name: 'Front View', placement: 'front', color: '#ffffff' },
    { name: 'Back View', placement: 'back', color: '#ffffff' },
    { name: 'Lifestyle', placement: 'lifestyle', color: '#f0f0f0' },
  ];

  return mockupTemplates.map(template => ({
    url: `https://placehold.co/600x800/333333/white?text=${encodeURIComponent(`${template.name}\\n${productId}`)}`,
    placement: template.placement,
    variantId: `mock-${productId}-${template.placement}`,
    width: 600,
    height: 800
  }));
}

interface MockupResult {
  url: string;
  placement: string;
  variantId: string;
  width: number;
  height: number;
}
