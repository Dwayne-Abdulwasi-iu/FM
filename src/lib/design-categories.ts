// Shared design categories across the application
export const DESIGN_CATEGORIES = [
  'Fashion Illustrations',
  'Digital Designs',
  'Pattern Designs',
  'Sketches',
  'Technical Drawings',
  'Concept Art'
] as const

export type DesignCategory = typeof DESIGN_CATEGORIES[number]

/**
 * Validates and normalizes a category string
 * Returns null if invalid
 */
export function validateCategory(category: string | null | undefined): DesignCategory | null {
  if (!category) return null
  
  const trimmed = String(category).trim()
  const match = DESIGN_CATEGORIES.find(c => c.toLowerCase() === trimmed.toLowerCase())
  
  return match || null
}
