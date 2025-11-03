import { NextRequest, NextResponse } from 'next/server'

// Simple inference of user locale and currency from headers
// - Country from common edge headers or Accept-Language region
// - Currency: NG -> NGN, otherwise USD
export async function GET(request: NextRequest) {
  try {
    const headers = request.headers
    const vercelCountry = headers.get('x-vercel-ip-country') || headers.get('x-vercel-edge-country')
    const cfCountry = headers.get('cf-ipcountry')
    const acceptLanguage = headers.get('accept-language') || ''

    // Determine country
    let country = (vercelCountry || cfCountry || '').toUpperCase()
    if (!country) {
      // Try to parse from accept-language like en-NG,en;q=0.9
      const firstLang = acceptLanguage.split(',')[0]
      const parts = firstLang.split('-')
      if (parts.length > 1) {
        country = parts[1].toUpperCase()
      }
    }

    // Determine locale string
    const locale = (() => {
      if (acceptLanguage) {
        return acceptLanguage.split(',')[0]
      }
      // Fallback by country
      if (country === 'NG') return 'en-NG'
      return 'en-US'
    })()

    // Determine currency
    const currency = country === 'NG' ? 'NGN' : 'USD'

    return NextResponse.json({ country: country || null, currency, locale })
  } catch {
    return NextResponse.json({ country: null, currency: 'USD', locale: 'en-US' })
  }
}
