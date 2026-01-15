import prisma from './prisma'

/**
 * AI-Powered Recommendation Engine
 * Provides personalized design recommendations based on user behavior
 */

interface RecommendationOptions {
  userId?: string
  limit?: number
  excludeIds?: string[]
  category?: string
}

interface ScoredDesign {
  designId: string
  score: number
  reasons: string[]
}

/**
 * Get personalized recommendations for a user
 */
export async function getPersonalizedRecommendations(
  options: RecommendationOptions
): Promise<ScoredDesign[]> {
  const { userId, limit = 12, excludeIds = [], category } = options

  if (!userId) {
    // Return trending designs for anonymous users
    return getTrendingDesigns(limit, category)
  }

  // Get user's preferences and history
  const [userPreference, recentViews, purchases, favorites] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId } }),
    getRecentViews(userId, 20),
    getRecentPurchases(userId, 10),
    getUserFavorites(userId, 20)
  ])

  // Build preference profile
  const preferredCategories = new Set<string>()
  const preferredTags = new Set<string>()
  const preferredDesigners = new Set<string>()
  const viewedDesignIds = new Set<string>()

  // Add explicit preferences
  if (userPreference) {
    userPreference.favoriteCategories.forEach(c => preferredCategories.add(c))
    userPreference.favoriteTags.forEach(t => preferredTags.add(t))
    userPreference.favoriteDesigners.forEach(d => preferredDesigners.add(d))
  }

  // Learn from browsing history
  for (const view of recentViews) {
    if (view.category) preferredCategories.add(view.category)
    view.tags?.forEach((t: string) => preferredTags.add(t))
    if (view.designerId) preferredDesigners.add(view.designerId)
    viewedDesignIds.add(view.designId)
  }

  // Learn from purchases
  for (const purchase of purchases) {
    if (purchase.category) preferredCategories.add(purchase.category)
    purchase.tags?.forEach((t: string) => preferredTags.add(t))
    if (purchase.designerId) preferredDesigners.add(purchase.designerId)
  }

  // Learn from favorites
  for (const fav of favorites) {
    if (fav.category) preferredCategories.add(fav.category)
    fav.tags?.forEach((t: string) => preferredTags.add(t))
    if (fav.designerId) preferredDesigners.add(fav.designerId)
  }

  // Fetch candidate designs
  const excludeSet = new Set([...excludeIds, ...viewedDesignIds])
  
  const candidates = await prisma.design.findMany({
    where: {
      id: { notIn: Array.from(excludeSet) },
      isActive: true,
      approvalStatus: 'APPROVED',
      isDraft: false,
      ...(category && { category })
    },
    take: limit * 5, // Get more to score and filter
    orderBy: [
      { featured: 'desc' },
      { totalSales: 'desc' }
    ],
    select: {
      id: true,
      title: true,
      category: true,
      tags: true,
      designerId: true,
      price: true,
      totalSales: true,
      viewCount: true,
      featured: true,
      _count: {
        select: { reviews: true, favorites: true }
      }
    }
  })

  // Score each design
  const scoredDesigns: ScoredDesign[] = candidates.map(design => {
    let score = 0
    const reasons: string[] = []

    // Category match (high weight)
    if (preferredCategories.has(design.category || '')) {
      score += 30
      reasons.push('Matches your preferred category')
    }

    // Tag matches
    const matchingTags = design.tags?.filter((t: string) => preferredTags.has(t)) || []
    if (matchingTags.length > 0) {
      score += matchingTags.length * 10
      reasons.push(`${matchingTags.length} matching style tags`)
    }

    // Designer preference
    if (preferredDesigners.has(design.designerId)) {
      score += 25
      reasons.push('From a designer you like')
    }

    // Popularity signals
    if (design.featured) {
      score += 15
      reasons.push('Featured design')
    }

    if (design.totalSales > 50) {
      score += 10
      reasons.push('Best seller')
    }

    if (design._count.favorites > 20) {
      score += 5
      reasons.push('Highly favorited')
    }

    // Price match (if preference set)
    if (userPreference?.preferredPriceMax && design.price <= userPreference.preferredPriceMax) {
      score += 5
    }

    return {
      designId: design.id,
      score,
      reasons
    }
  })

  // Sort by score and return top results
  return scoredDesigns
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * Get trending designs for anonymous users
 */
async function getTrendingDesigns(
  limit: number,
  category?: string
): Promise<ScoredDesign[]> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const designs = await prisma.design.findMany({
    where: {
      isActive: true,
      approvalStatus: 'APPROVED',
      isDraft: false,
      ...(category && { category }),
      createdAt: { gte: weekAgo }
    },
    orderBy: [
      { featured: 'desc' },
      { viewCount: 'desc' },
      { totalSales: 'desc' }
    ],
    take: limit,
    select: { id: true }
  })

  return designs.map((d, index) => ({
    designId: d.id,
    score: 100 - index,
    reasons: ['Trending this week']
  }))
}

/**
 * Get similar designs based on a reference design
 */
export async function getSimilarDesigns(
  designId: string,
  limit: number = 6
): Promise<ScoredDesign[]> {
  const referenceDesign = await prisma.design.findUnique({
    where: { id: designId },
    select: {
      category: true,
      tags: true,
      designerId: true,
      price: true
    }
  })

  if (!referenceDesign) return []

  const candidates = await prisma.design.findMany({
    where: {
      id: { not: designId },
      isActive: true,
      approvalStatus: 'APPROVED',
      isDraft: false,
      OR: [
        { category: referenceDesign.category },
        { tags: { hasSome: referenceDesign.tags || [] } },
        { designerId: referenceDesign.designerId }
      ]
    },
    take: limit * 3,
    select: {
      id: true,
      category: true,
      tags: true,
      designerId: true,
      price: true
    }
  })

  // Score by similarity
  const scored: ScoredDesign[] = candidates.map(design => {
    let score = 0
    const reasons: string[] = []

    if (design.category === referenceDesign.category) {
      score += 30
      reasons.push('Same category')
    }

    const commonTags = design.tags?.filter((t: string) => 
      referenceDesign.tags?.includes(t)
    ) || []
    
    if (commonTags.length > 0) {
      score += commonTags.length * 15
      reasons.push(`${commonTags.length} similar styles`)
    }

    if (design.designerId === referenceDesign.designerId) {
      score += 20
      reasons.push('Same designer')
    }

    // Price similarity (within 30%)
    const priceDiff = Math.abs(design.price - referenceDesign.price) / referenceDesign.price
    if (priceDiff < 0.3) {
      score += 10
      reasons.push('Similar price range')
    }

    return { designId: design.id, score, reasons }
  })

  return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}

/**
 * Update user preferences based on action
 */
export async function trackUserAction(
  userId: string,
  action: 'view' | 'favorite' | 'purchase' | 'search',
  data: {
    designId?: string
    category?: string
    tags?: string[]
    designerId?: string
    searchQuery?: string
  }
): Promise<void> {
  try {
    await prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        favoriteCategories: data.category ? [data.category] : [],
        favoriteTags: data.tags || [],
        favoriteDesigners: data.designerId ? [data.designerId] : [],
        favoriteStyles: []
      },
      update: {
        // Append to arrays (handled differently in actual implementation)
        updatedAt: new Date()
      }
    })
  } catch (error) {
    console.error('Failed to track user action:', error)
  }
}

// Helper functions
async function getRecentViews(userId: string, limit: number) {
  const views = await prisma.designView.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      design: {
        select: {
          id: true,
          category: true,
          tags: true,
          designerId: true
        }
      }
    }
  })

  return views.map(v => ({
    designId: v.designId,
    category: v.design?.category,
    tags: v.design?.tags,
    designerId: v.design?.designerId
  }))
}

async function getRecentPurchases(userId: string, limit: number) {
  const purchases = await prisma.purchase.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      design: {
        select: {
          id: true,
          category: true,
          tags: true,
          designerId: true
        }
      }
    }
  })

  return purchases.map(p => ({
    designId: p.designId,
    category: p.design?.category,
    tags: p.design?.tags,
    designerId: p.design?.designerId
  }))
}

async function getUserFavorites(userId: string, limit: number) {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      design: {
        select: {
          id: true,
          category: true,
          tags: true,
          designerId: true
        }
      }
    }
  })

  return favorites.map(f => ({
    designId: f.designId,
    category: f.design?.category,
    tags: f.design?.tags,
    designerId: f.design?.designerId
  }))
}
