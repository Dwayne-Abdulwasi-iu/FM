import { NextResponse } from 'next/server'
import { paystack } from '@/lib/paystack'

export async function GET() {
  try {
    // Get list of Nigerian banks from Paystack
    const response = await paystack.misc.list_banks({ country: 'nigeria' })

    if (response.status) {
      const banks = response.data.map((bank: any) => ({
        name: bank.name,
        code: bank.code,
        slug: bank.slug
      }))

      return NextResponse.json({ banks })
    } else {
      throw new Error('Failed to fetch banks')
    }

  } catch (error) {
    console.error('Banks fetch error:', error)
    
    // Fallback list of major Nigerian banks
    const fallbackBanks = [
      { name: 'Access Bank', code: '044', slug: 'access-bank' },
      { name: 'Guarantee Trust Bank', code: '058', slug: 'guaranty-trust-bank' },
      { name: 'United Bank For Africa', code: '033', slug: 'united-bank-for-africa' },
      { name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
      { name: 'First Bank of Nigeria', code: '011', slug: 'first-bank-of-nigeria' },
      { name: 'Fidelity Bank', code: '070', slug: 'fidelity-bank' },
      { name: 'Union Bank of Nigeria', code: '032', slug: 'union-bank-of-nigeria' },
      { name: 'Sterling Bank', code: '232', slug: 'sterling-bank' },
      { name: 'Stanbic IBTC Bank', code: '221', slug: 'stanbic-ibtc-bank' },
      { name: 'Ecobank Nigeria', code: '050', slug: 'ecobank-nigeria' },
      // Digital Banks & Fintech Services
      { name: 'PalmPay', code: '999991', slug: 'palmpay' },
      { name: 'OPay Digital Services', code: '999992', slug: 'opay' },
      { name: 'Kuda Bank', code: '50211', slug: 'kuda-bank' },
      { name: 'Moniepoint MFB', code: '50515', slug: 'moniepoint' },
      { name: 'Carbon (Formerly Paylater)', code: '565', slug: 'carbon' },
      { name: 'Rubies MFB', code: '125', slug: 'rubies' },
      { name: 'VFD Microfinance Bank', code: '566', slug: 'vfd' },
      { name: 'Sparkle Microfinance Bank', code: '51310', slug: 'sparkle' },
      { name: 'ALAT by WEMA', code: '035A', slug: 'alat' },
      { name: 'Eyowo', code: '50126', slug: 'eyowo' },
      { name: 'FairMoney Microfinance Bank', code: '51318', slug: 'fairmoney' },
      { name: 'Renmoney MFB', code: '50767', slug: 'renmoney' },
      { name: 'TeamApt Limited', code: '51269', slug: 'teamapt' },
      { name: 'Mint MFB', code: '50304', slug: 'mint' },
      { name: 'GoMoney', code: '100022', slug: 'gomoney' },
      { name: 'Barter by Flutterwave', code: '999993', slug: 'barter' },
      { name: 'Cowrywise', code: '51243', slug: 'cowrywise' },
      { name: 'PiggyVest', code: '100002', slug: 'piggyvest' }
    ]

    return NextResponse.json({ banks: fallbackBanks })
  }
}