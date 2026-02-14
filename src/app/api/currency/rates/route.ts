import { NextResponse } from 'next/server';
import { fetchExchangeRates } from '@/lib/currency';

export async function GET() {
  try {
    const rates = await fetchExchangeRates();
    
    return NextResponse.json({
      rates: {
        USD: 1,
        NGN: rates.NGN || 1600,
        EUR: rates.EUR || 0.92,
        GBP: rates.GBP || 0.79,
        GHS: rates.GHS || 16,
        KES: rates.KES || 155,
        ZAR: rates.ZAR || 19,
        CAD: rates.CAD || 1.38,
        AUD: rates.AUD || 1.55,
        INR: rates.INR || 85,
      },
    });
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    
    // Return default fallback rates
    return NextResponse.json({
      rates: {
        USD: 1,
        NGN: 1600,
        EUR: 0.92,
        GBP: 0.79,
        GHS: 16,
        KES: 155,
        ZAR: 19,
        CAD: 1.38,
        AUD: 1.55,
        INR: 85,
      },
    });
  }
}
