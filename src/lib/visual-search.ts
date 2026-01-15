/**
 * Visual Similarity Search Service
 * Uses Cloudinary AI and color/style analysis for finding similar designs
 */

import prisma from '@/lib/prisma';
import cloudinary from '@/lib/cloudinary';

export interface SimilarityResult {
  designId: string;
  score: number;
  matchType: 'visual' | 'color' | 'style' | 'category';
}

export interface DesignFeatures {
  dominantColors: string[];
  colorHistogram: Record<string, number>;
  style: string;
  category: string;
  tags: string[];
  aspectRatio: number;
}

/**
 * Extract visual features from an image using Cloudinary AI
 */
export async function extractImageFeatures(imageUrl: string): Promise<{
  colors: Array<{ color: string; percentage: number }>;
  quality: number;
  faces: number;
  tags: string[];
}> {
  try {
    // Use Cloudinary's image analysis API
    const publicId = extractPublicIdFromUrl(imageUrl);
    
    if (!publicId) {
      return { colors: [], quality: 0, faces: 0, tags: [] };
    }

    // Cloudinary AI analysis (requires add-on)
    const analysis = await new Promise<{
      colors?: Array<[string, number]>;
      quality_analysis?: { focus: number };
      faces?: Array<unknown>;
    }>((resolve, reject) => {
      cloudinary.api.resource(publicId, {
        colors: true,
        image_metadata: true,
        quality_analysis: true,
        faces: true
      }, (error: Error | null, result: unknown) => {
        if (error) reject(error);
        else resolve(result as { colors?: Array<[string, number]>; quality_analysis?: { focus: number }; faces?: Array<unknown> });
      });
    });

    return {
      colors: (analysis.colors || []).map(([color, percentage]: [string, number]) => ({
        color,
        percentage
      })),
      quality: analysis.quality_analysis?.focus || 0,
      faces: analysis.faces?.length || 0,
      tags: []
    };
  } catch (error) {
    console.error('Failed to extract image features:', error);
    return { colors: [], quality: 0, faces: 0, tags: [] };
  }
}

/**
 * Extract public ID from Cloudinary URL
 */
function extractPublicIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Find the upload segment and get everything after it
    const uploadIndex = pathParts.findIndex(p => p === 'upload');
    if (uploadIndex === -1) return null;
    
    // Skip version number if present (v1234567890)
    let startIndex = uploadIndex + 1;
    if (pathParts[startIndex]?.match(/^v\d+$/)) {
      startIndex++;
    }
    
    // Join remaining parts and remove file extension
    const publicId = pathParts.slice(startIndex).join('/').replace(/\.[^.]+$/, '');
    return publicId;
  } catch {
    return null;
  }
}

/**
 * Calculate color similarity between two color palettes
 */
export function calculateColorSimilarity(
  colors1: Array<{ color: string; percentage: number }>,
  colors2: Array<{ color: string; percentage: number }>
): number {
  if (!colors1.length || !colors2.length) return 0;

  let totalSimilarity = 0;
  let comparisons = 0;

  for (const c1 of colors1.slice(0, 5)) {
    for (const c2 of colors2.slice(0, 5)) {
      const similarity = calculateHexColorSimilarity(c1.color, c2.color);
      const weight = (c1.percentage + c2.percentage) / 200;
      totalSimilarity += similarity * weight;
      comparisons++;
    }
  }

  return comparisons > 0 ? totalSimilarity / comparisons : 0;
}

/**
 * Calculate similarity between two hex colors (0-1)
 */
function calculateHexColorSimilarity(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  
  if (!rgb1 || !rgb2) return 0;

  // Calculate Euclidean distance in RGB space
  const distance = Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );

  // Max distance is sqrt(255^2 * 3) ≈ 441.67
  const maxDistance = 441.67;
  return 1 - (distance / maxDistance);
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate tag/keyword similarity using Jaccard index
 */
export function calculateTagSimilarity(tags1: string[], tags2: string[]): number {
  if (!tags1.length || !tags2.length) return 0;

  const set1 = new Set(tags1.map(t => t.toLowerCase().trim()));
  const set2 = new Set(tags2.map(t => t.toLowerCase().trim()));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Find similar designs based on multiple criteria
 */
export async function findSimilarDesigns(
  designId: string,
  options: {
    limit?: number;
    includeColorMatch?: boolean;
    includeStyleMatch?: boolean;
    includeCategoryMatch?: boolean;
    minScore?: number;
  } = {}
): Promise<Array<{
  id: string;
  title: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  price: number;
  score: number;
  matchReasons: string[];
  designer: { id: string; name: string | null };
}>> {
  const {
    limit = 12,
    includeColorMatch = true,
    includeStyleMatch = true,
    includeCategoryMatch = true,
    minScore = 0.3
  } = options;

  // Get the source design
  const sourceDesign = await prisma.design.findUnique({
    where: { id: designId },
    select: {
      id: true,
      category: true,
      style: true,
      tags: true,
      colorPalette: true,
      garmentType: true,
      targetAudience: true,
      designerId: true
    }
  });

  if (!sourceDesign) {
    return [];
  }

  // Find candidate designs (same category or overlapping tags)
  const candidates = await prisma.design.findMany({
    where: {
      id: { not: designId },
      isActive: true,
      approvalStatus: 'APPROVED',
      OR: [
        includeCategoryMatch ? { category: sourceDesign.category } : {},
        includeStyleMatch && sourceDesign.style ? { style: sourceDesign.style } : {},
        { garmentType: sourceDesign.garmentType || undefined },
        { targetAudience: sourceDesign.targetAudience || undefined }
      ].filter(obj => Object.keys(obj).length > 0)
    },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      thumbnailUrl: true,
      price: true,
      category: true,
      style: true,
      tags: true,
      colorPalette: true,
      garmentType: true,
      targetAudience: true,
      designer: {
        select: {
          id: true,
          name: true
        }
      }
    },
    take: limit * 3 // Get more candidates to filter
  });

  // Calculate similarity scores
  const scoredDesigns = candidates.map(candidate => {
    let totalScore = 0;
    let factors = 0;
    const matchReasons: string[] = [];

    // Category match (high weight)
    if (includeCategoryMatch && candidate.category === sourceDesign.category) {
      totalScore += 0.4;
      factors++;
      matchReasons.push('Same category');
    }

    // Style match
    if (includeStyleMatch && candidate.style && candidate.style === sourceDesign.style) {
      totalScore += 0.3;
      factors++;
      matchReasons.push(`${candidate.style} style`);
    }

    // Tag similarity
    const tagScore = calculateTagSimilarity(
      sourceDesign.tags || [],
      candidate.tags || []
    );
    if (tagScore > 0.2) {
      totalScore += tagScore * 0.3;
      factors++;
      matchReasons.push('Similar keywords');
    }

    // Color palette match
    if (includeColorMatch && sourceDesign.colorPalette?.length && candidate.colorPalette?.length) {
      const colorScore = calculateColorArraySimilarity(
        sourceDesign.colorPalette,
        candidate.colorPalette
      );
      if (colorScore > 0.3) {
        totalScore += colorScore * 0.25;
        factors++;
        matchReasons.push('Similar colors');
      }
    }

    // Garment type match
    if (candidate.garmentType && candidate.garmentType === sourceDesign.garmentType) {
      totalScore += 0.2;
      factors++;
      matchReasons.push(`${candidate.garmentType}`);
    }

    // Target audience match
    if (candidate.targetAudience && candidate.targetAudience === sourceDesign.targetAudience) {
      totalScore += 0.15;
      factors++;
    }

    const normalizedScore = factors > 0 ? totalScore / Math.max(factors, 1) : 0;

    return {
      ...candidate,
      score: normalizedScore,
      matchReasons
    };
  });

  // Filter by minimum score and sort by score descending
  return scoredDesigns
    .filter(d => d.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Calculate similarity between two color palette arrays
 */
function calculateColorArraySimilarity(colors1: string[], colors2: string[]): number {
  if (!colors1.length || !colors2.length) return 0;

  let maxSimilarity = 0;
  
  for (const c1 of colors1) {
    for (const c2 of colors2) {
      const similarity = calculateHexColorSimilarity(c1, c2);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
  }

  return maxSimilarity;
}

/**
 * Get design recommendations for a user based on their history
 */
export async function getPersonalizedRecommendations(
  userId: string,
  limit: number = 12
): Promise<Array<{
  id: string;
  title: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  price: number;
  reason: string;
  designer: { id: string; name: string | null };
}>> {
  // Get user's purchase history and favorites
  const [purchases, favorites] = await Promise.all([
    prisma.purchase.findMany({
      where: { userId },
      select: { design: { select: { category: true, style: true, tags: true } } },
      take: 20,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.favorite.findMany({
      where: { userId },
      select: { design: { select: { category: true, style: true, tags: true } } },
      take: 20,
      orderBy: { createdAt: 'desc' }
    })
  ]);

  // Extract preferences
  const categoryCount: Record<string, number> = {};
  const styleCount: Record<string, number> = {};
  const allTags: string[] = [];

  [...purchases, ...favorites].forEach(item => {
    const design = item.design;
    if (design.category) {
      categoryCount[design.category] = (categoryCount[design.category] || 0) + 1;
    }
    if (design.style) {
      styleCount[design.style] = (styleCount[design.style] || 0) + 1;
    }
    if (design.tags) {
      allTags.push(...design.tags);
    }
  });

  // Get top preferences
  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  const topStyles = Object.entries(styleCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([style]) => style);

  // Find recommendations
  const recommendations = await prisma.design.findMany({
    where: {
      isActive: true,
      approvalStatus: 'APPROVED',
      OR: [
        { category: { in: topCategories } },
        { style: { in: topStyles } }
      ],
      // Exclude already purchased/favorited
      NOT: {
        OR: [
          { purchases: { some: { userId } } },
          { favorites: { some: { userId } } }
        ]
      }
    },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      thumbnailUrl: true,
      price: true,
      category: true,
      style: true,
      designer: {
        select: {
          id: true,
          name: true
        }
      }
    },
    take: limit,
    orderBy: [
      { trendingScore: 'desc' },
      { totalSales: 'desc' }
    ]
  });

  return recommendations.map(design => ({
    ...design,
    reason: topCategories.includes(design.category)
      ? `Based on your interest in ${design.category}`
      : design.style && topStyles.includes(design.style)
        ? `${design.style} style you might like`
        : 'Trending in your interests'
  }));
}

/**
 * Store design similarity relationships in database
 */
export async function updateDesignSimilarities(designId: string): Promise<void> {
  const similarDesigns = await findSimilarDesigns(designId, {
    limit: 20,
    minScore: 0.4
  });

  // Update similarity records
  for (const similar of similarDesigns) {
    await prisma.designSimilarity.upsert({
      where: {
        sourceId_similarId: {
          sourceId: designId,
          similarId: similar.id
        }
      },
      update: {
        score: similar.score
      },
      create: {
        sourceId: designId,
        similarId: similar.id,
        score: similar.score
      }
    });
  }
}
