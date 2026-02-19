import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { getCachedData, invalidateCache, CACHE_TTL } from '@/lib/cache'

/**
 * GET /api/preferences - Get user display preferences
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const fetchPreferences = async () => {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          preferredCurrency: true,
          preferredLanguage: true,
        },
      })

      if (!user) {
        return null
      }

      return {
        currency: user.preferredCurrency,
        language: user.preferredLanguage,
      }
    }

    const cacheKey = `preferences:${session.user.id}`
    const prefs = await getCachedData(cacheKey, CACHE_TTL.PREFERENCES, fetchPreferences)

    if (!prefs) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(prefs)
  } catch (error) {
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    
    console.error('Error fetching preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/preferences - Update user display preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currency, language } = body

    // Validate currency if provided (must match SUPPORTED_CURRENCIES in currency.ts)
    const validCurrencies = ['USD', 'NGN', 'EUR', 'GBP', 'KES', 'GHS', 'ZAR', 'CAD', 'AUD', 'INR']
    if (currency && !validCurrencies.includes(currency)) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
    }

    // Validate language if provided
    const validLanguages = ['en', 'fr', 'es', 'pt', 'zh', 'ar', 'ru']
    if (language && !validLanguages.includes(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
    }

    // Build update object with only provided fields
    const updateData: { preferredCurrency?: string; preferredLanguage?: string } = {}
    if (currency !== undefined) updateData.preferredCurrency = currency
    if (language !== undefined) updateData.preferredLanguage = language

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        preferredCurrency: true,
        preferredLanguage: true,
      },
    })

    await invalidateCache(`preferences:${session.user.id}`)

    return NextResponse.json({
      success: true,
      currency: user.preferredCurrency,
      language: user.preferredLanguage,
    })
  } catch (error) {
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    
    console.error('Error updating preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
