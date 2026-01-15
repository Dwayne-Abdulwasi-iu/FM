
import axios from 'axios';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getAuthHeaders() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error('Paystack secret key not set');
  return {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  };
}

export async function initializeTransaction(data: any) {
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      data,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error: any) {
    console.error('Paystack API Error:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      errors: error.response?.data?.errors,
      data: data
    });
    throw error;
  }
}

export async function verifyTransaction(reference: string) {
  const response = await axios.get(
    `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
    { headers: getAuthHeaders() }
  );
  return response.data;
}

export async function listBanks(country = 'nigeria') {
  const response = await axios.get(
    `${PAYSTACK_BASE_URL}/bank?country=${country}`,
    { headers: getAuthHeaders() }
  );
  return response.data;
}

export function calculatePaystackFee(amount: number): number {
  // Paystack charges 1.5% + NGN 100 cap at NGN 2,000
  // For international cards: 3.9%
  // Using 3.9% for international transactions (USD)
  return Math.round(amount * 0.039);
}

export function isPaystackConfigured(): boolean {
  return !!(
    process.env.PAYSTACK_SECRET_KEY && 
    process.env.PAYSTACK_SECRET_KEY !== 'sk_test_REDACTED' &&
    process.env.PAYSTACK_PUBLIC_KEY &&
    process.env.PAYSTACK_PUBLIC_KEY !== 'pk_test_your_paystack_public_key_here'
  )
}

// Cache for exchange rate with timestamp
let exchangeRateCache: { rate: number; timestamp: number } | null = null
const CACHE_DURATION = 3600000 // 1 hour in milliseconds

export async function getUSDToNGNRate(): Promise<number> {
  // Check if we have a valid cached rate (within 1 hour)
  if (exchangeRateCache && Date.now() - exchangeRateCache.timestamp < CACHE_DURATION) {
    return exchangeRateCache.rate
  }

  try {
    // Fetch live rate from exchangerate-api.com (free tier)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    if (!response.ok) throw new Error(`API error: ${response.status}`)
    
    const data = await response.json()
    const rate = data.rates?.NGN
    
    if (!rate) throw new Error('NGN rate not found')
    
    // Cache the rate
    exchangeRateCache = { rate, timestamp: Date.now() }
    console.log(`Updated exchange rate: 1 USD = ${rate} NGN`)
    return rate
  } catch (error) {
    console.error('Failed to fetch live exchange rate:', error)
    // Fallback to last cached rate (even if expired)
    if (exchangeRateCache) {
      console.warn(`Using last cached exchange rate: 1 USD = ${exchangeRateCache.rate} NGN (from ${new Date(exchangeRateCache.timestamp).toISOString()})`)
      return exchangeRateCache.rate
    }
    // Use environment variable for fallback rate, or throw if not configured
    const fallbackRate = process.env.FALLBACK_USD_NGN_RATE 
      ? parseFloat(process.env.FALLBACK_USD_NGN_RATE) 
      : null
    
    if (fallbackRate && !isNaN(fallbackRate)) {
      console.warn(`No cached rate available. Using configured fallback: 1 USD = ${fallbackRate} NGN`)
      return fallbackRate
    }
    
    // If no fallback configured, use a conservative recent rate with warning
    console.error('CRITICAL: No exchange rate available. Using emergency fallback: 1 USD = 1600 NGN. Configure FALLBACK_USD_NGN_RATE env var.')
    return 1600 // Updated from 1500 to more recent rate
  }
}

export async function convertUSDToNGN(usdAmount: number): Promise<number> {
  const exchangeRate = await getUSDToNGNRate()
  return Math.round(usdAmount * exchangeRate)
}

export async function convertNGNToUSD(ngnAmount: number): Promise<number> {
  const exchangeRate = await getUSDToNGNRate()
  return ngnAmount / exchangeRate
}

/**
 * Paystack API client object with methods for each resource type.
 * This provides a structured way to access all Paystack APIs.
 */
export const paystack = {
  transaction: {
    async initialize(data: Record<string, unknown>) {
      return initializeTransaction(data);
    },
    async verify(reference: string) {
      return verifyTransaction(reference);
    },
    async list(params?: { perPage?: number }) {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction${params ? `?perPage=${params.perPage}` : ''}`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    }
  },
  misc: {
    async resolve_account_number(data: { account_number: string; bank_code: string }) {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${data.account_number}&bank_code=${data.bank_code}`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    async list_banks(params?: { country?: string }) {
      return listBanks(params?.country);
    }
  },
  transfer_recipient: {
    async create(data: { type: string; name: string; account_number: string; bank_code: string; currency: string }) {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transferrecipient`,
        data,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    async list() {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transferrecipient`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    }
  },
  transfer: {
    async initiate(data: { source: string; amount: number; recipient: string; reason?: string }) {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transfer`,
        data,
        { headers: getAuthHeaders() }
      );
      return response.data;
    }
  },
  subaccount: {
    async create(data: { business_name: string; settlement_bank: string; account_number: string; percentage_charge: number; description?: string }) {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/subaccount`,
        data,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    async update(subaccountCode: string, data: { percentage_charge?: number }) {
      const response = await axios.put(
        `${PAYSTACK_BASE_URL}/subaccount/${subaccountCode}`,
        data,
        { headers: getAuthHeaders() }
      );
      return response.data;
    }
  },
  balance: {
    async list() {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/balance`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    }
  }
};