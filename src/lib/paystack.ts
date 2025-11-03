// Lightweight Paystack REST client implemented with fetch to avoid vulnerable SDK deps
const PAYSTACK_API = 'https://api.paystack.co'

function isServer(): boolean {
  return typeof window === 'undefined'
}

function getSecret(): string | undefined {
  return process.env.PAYSTACK_SECRET_KEY
}

async function http<T>(path: string, options?: RequestInit): Promise<T> {
  if (!isServer()) {
    throw new Error('Paystack client can only run on the server')
  }
  const secret = getSecret()
  if (!secret || secret === 'sk_test_REDACTED') {
    throw new Error('PAYSTACK_SECRET_KEY is not configured')
  }
  const res = await fetch(`${PAYSTACK_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    // Small timeout via AbortController could be added if needed
  })
  // Some endpoints return 4xx with JSON body; parse regardless of ok
  const text = await res.text()
  const json = text ? (JSON.parse(text) as T) : ({} as T)
  return json
}

export const paystack = {
  misc: {
    list_banks: async (args: { country: string }): Promise<{ status: boolean; data: Array<{ name: string; code: string; slug: string }>; message?: string }> => {
      const country = encodeURIComponent(args.country)
      return http(`/bank?country=${country}`)
    },
    resolve_account_number: async (args: { account_number: string; bank_code: string }): Promise<{
      status: boolean
      data: { account_name?: string }
      message?: string
    }> => {
      const q = new URLSearchParams({ account_number: args.account_number, bank_code: args.bank_code }).toString()
      return http(`/bank/resolve?${q}`)
    },
  },
  transfer_recipient: {
    create: async (args: { type: 'nuban'; name: string; account_number: string; bank_code: string; currency: 'NGN' }): Promise<{
      status: boolean
      data: { recipient_code?: string }
      message?: string
    }> => {
      return http('/transferrecipient', {
        method: 'POST',
        body: JSON.stringify(args),
      })
    },
    list: async (): Promise<unknown> => {
      return http('/transferrecipient')
    },
  },
  subaccount: {
    create: async (args: { business_name: string; settlement_bank: string; account_number: string; percentage_charge: number; description: string }): Promise<{
      status: boolean
      data: { subaccount_code?: string }
      message?: string
    }> => {
      return http('/subaccount', {
        method: 'POST',
        body: JSON.stringify(args),
      })
    },
  },
  transaction: {
    initialize: async (args: {
      email: string
      amount: number
      currency: string
      reference: string
      callback_url: string
      metadata: Record<string, string | number | boolean>
      split?: { type: string; subaccounts: Array<{ subaccount: string; share: number }> }
    }): Promise<{ status: boolean; data: { reference: string; authorization_url: string }; message?: string }> => {
      return http('/transaction/initialize', {
        method: 'POST',
        body: JSON.stringify(args),
      })
    },
    verify: async (reference: string): Promise<{
      status: boolean
      data?: {
        status?: string
        reference?: string
        metadata?: Record<string, string>
      }
      message?: string
    }> => {
      const ref = encodeURIComponent(reference)
      return http(`/transaction/verify/${ref}`)
    },
    list: async (args: { perPage: number }): Promise<{ data?: unknown[] }> => {
      const qp = new URLSearchParams({ perPage: String(args.perPage) }).toString()
      return http(`/transaction?${qp}`)
    },
  },
  transfer: {
    initiate: async (args: { source: 'balance'; amount: number; recipient: string; reason: string }): Promise<{
      status: boolean
      message?: string
      data?: unknown
    }> => {
      return http('/transfer', {
        method: 'POST',
        body: JSON.stringify(args),
      })
    },
  },
  balance: {
    list: async (): Promise<{ data?: Array<{ currency: string; balance: number }> }> => {
      return http('/balance')
    },
  },
}

export function calculatePaystackFee(amount: number): number {
  // Paystack charges 1.5% + NGN 100 cap at NGN 2,000
  // For international cards: 3.9%
  // Using 3.9% for international transactions (USD)
  return Math.round(amount * 0.039)
}

export function isPaystackConfigured(): boolean {
  return !!(
    process.env.PAYSTACK_SECRET_KEY &&
    process.env.PAYSTACK_SECRET_KEY !== 'sk_test_REDACTED' &&
    process.env.PAYSTACK_PUBLIC_KEY &&
    process.env.PAYSTACK_PUBLIC_KEY !== 'pk_test_your_paystack_public_key_here'
  )
}

export function convertUSDToNGN(usdAmount: number): number {
  // Using approximate exchange rate USD to NGN (1 USD = 800 NGN)
  // In production, you should use a real-time exchange rate API
  const exchangeRate = 800
  return Math.round(usdAmount * exchangeRate)
}

export function convertNGNToUSD(ngnAmount: number): number {
  // Using approximate exchange rate NGN to USD (800 NGN = 1 USD)
  const exchangeRate = 800
  return ngnAmount / exchangeRate
}