/**
 * Design Mockup Generator
 * Creates realistic product mockups using Cloudinary transformations
 */

interface MockupTemplate {
  id: string
  name: string
  category: string
  baseImage: string
  overlay: {
    x: number
    y: number
    width: number
    height: number
    angle?: number
  }
  thumbnail: string
}

// Predefined mockup templates
export const MOCKUP_TEMPLATES: MockupTemplate[] = [
  {
    id: 'tshirt-white',
    name: 'White T-Shirt',
    category: 'Apparel',
    baseImage: 'mockups/tshirt-white',
    overlay: { x: 200, y: 150, width: 400, height: 400 },
    thumbnail: '/mockups/thumbnails/tshirt-white.jpg'
  },
  {
    id: 'tshirt-black',
    name: 'Black T-Shirt',
    category: 'Apparel',
    baseImage: 'mockups/tshirt-black',
    overlay: { x: 200, y: 150, width: 400, height: 400 },
    thumbnail: '/mockups/thumbnails/tshirt-black.jpg'
  },
  {
    id: 'hoodie-grey',
    name: 'Grey Hoodie',
    category: 'Apparel',
    baseImage: 'mockups/hoodie-grey',
    overlay: { x: 180, y: 180, width: 350, height: 350 },
    thumbnail: '/mockups/thumbnails/hoodie-grey.jpg'
  },
  {
    id: 'tote-bag',
    name: 'Canvas Tote Bag',
    category: 'Accessories',
    baseImage: 'mockups/tote-bag',
    overlay: { x: 150, y: 200, width: 300, height: 300 },
    thumbnail: '/mockups/thumbnails/tote-bag.jpg'
  },
  {
    id: 'phone-case',
    name: 'Phone Case',
    category: 'Accessories',
    baseImage: 'mockups/phone-case',
    overlay: { x: 50, y: 100, width: 200, height: 400 },
    thumbnail: '/mockups/thumbnails/phone-case.jpg'
  },
  {
    id: 'mug-white',
    name: 'White Mug',
    category: 'Home',
    baseImage: 'mockups/mug-white',
    overlay: { x: 100, y: 150, width: 250, height: 180 },
    thumbnail: '/mockups/thumbnails/mug-white.jpg'
  },
  {
    id: 'poster-frame',
    name: 'Framed Poster',
    category: 'Art',
    baseImage: 'mockups/poster-frame',
    overlay: { x: 80, y: 60, width: 640, height: 480 },
    thumbnail: '/mockups/thumbnails/poster-frame.jpg'
  },
  {
    id: 'pillow',
    name: 'Throw Pillow',
    category: 'Home',
    baseImage: 'mockups/pillow',
    overlay: { x: 75, y: 75, width: 350, height: 350 },
    thumbnail: '/mockups/thumbnails/pillow.jpg'
  },
  {
    id: 'dress-model',
    name: 'Dress on Model',
    category: 'Fashion',
    baseImage: 'mockups/dress-model',
    overlay: { x: 150, y: 100, width: 300, height: 500 },
    thumbnail: '/mockups/thumbnails/dress-model.jpg'
  },
  {
    id: 'fabric-swatch',
    name: 'Fabric Swatch',
    category: 'Textiles',
    baseImage: 'mockups/fabric-swatch',
    overlay: { x: 50, y: 50, width: 400, height: 400 },
    thumbnail: '/mockups/thumbnails/fabric-swatch.jpg'
  }
]

/**
 * Generate mockup URL using Cloudinary composite
 */
export function generateMockupUrl(
  designPublicId: string,
  templateId: string,
  cloudName: string = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo'
): string | null {
  const template = MOCKUP_TEMPLATES.find(t => t.id === templateId)
  if (!template) return null

  const { overlay } = template
  
  // Build Cloudinary URL with overlay transformation
  const transformations = [
    `l_${designPublicId.replace(/\//g, ':')}`,
    `c_fill,w_${overlay.width},h_${overlay.height}`,
    `fl_layer_apply,g_north_west,x_${overlay.x},y_${overlay.y}`
  ]
  
  if (overlay.angle) {
    transformations.splice(2, 0, `a_${overlay.angle}`)
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations.join(',')}/${template.baseImage}`
}

/**
 * Generate multiple mockups for a design
 */
export function generateAllMockups(
  designPublicId: string,
  category?: string
): Array<{ templateId: string; name: string; url: string | null }> {
  const templates = category 
    ? MOCKUP_TEMPLATES.filter(t => t.category === category)
    : MOCKUP_TEMPLATES

  return templates.map(template => ({
    templateId: template.id,
    name: template.name,
    url: generateMockupUrl(designPublicId, template.id)
  }))
}

/**
 * Get mockup templates by category
 */
export function getMockupTemplates(category?: string): MockupTemplate[] {
  if (!category) return MOCKUP_TEMPLATES
  return MOCKUP_TEMPLATES.filter(t => t.category === category)
}

/**
 * Get unique categories from templates
 */
export function getMockupCategories(): string[] {
  return [...new Set(MOCKUP_TEMPLATES.map(t => t.category))]
}
