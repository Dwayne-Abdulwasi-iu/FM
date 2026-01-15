/**
 * Flutterwave Integration
 * 
 * Pan-African payment gateway supporting:
 * - Card payments (Visa, Mastercard)
 * - Mobile money (MTN, Airtel, Vodafone)
 * - Bank transfers
 * - USSD
 * 
 * Target markets: Nigeria, Ghana, Kenya, South Africa, Tanzania, Uganda, Rwanda, etc.
 */

import axios from 'axios';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || '';
const FLUTTERWAVE_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY || '';
// Encryption key for card data - used in payment tokenization
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _FLUTTERWAVE_ENCRYPTION_KEY = process.env.FLUTTERWAVE_ENCRYPTION_KEY || '';

const BASE_URL = 'https://api.flutterwave.com/v3';

export function isFlutterwaveConfigured(): boolean {
  return !!FLUTTERWAVE_SECRET_KEY;
}

export function getFlutterwavePublicKey(): string | null {
  return FLUTTERWAVE_PUBLIC_KEY || null;
}

interface PaymentInitRequest {
  orderId: string;
  amount: number;
  currency: string;  // NGN, GHS, KES, ZAR, USD, etc.
  email: string;
  name: string;
  phone?: string;
  redirectUrl: string;
  paymentOptions?: string;  // card, mobilemoney, ussd, bank_transfer
  customizations?: {
    title?: string;
    description?: string;
    logo?: string;
  };
  meta?: Record<string, string | number>;
}

interface PaymentInitResponse {
  status: string;
  message: string;
  data: {
    link: string;
  };
}

interface TransactionVerifyResponse {
  status: string;
  message: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    device_fingerprint: string;
    amount: number;
    currency: string;
    charged_amount: number;
    app_fee: number;
    merchant_fee: number;
    processor_response: string;
    auth_model: string;
    ip: string;
    narration: string;
    status: string;
    payment_type: string;
    created_at: string;
    account_id: number;
    customer: {
      id: number;
      name: string;
      phone_number: string;
      email: string;
      created_at: string;
    };
    meta?: Record<string, unknown>;
  };
}

interface TransferRequest {
  bankCode: string;
  accountNumber: string;
  amount: number;
  currency: string;  // NGN, GHS, KES, etc.
  narration: string;
  reference: string;
  beneficiaryName: string;
  meta?: Record<string, string>;
}

interface TransferResponse {
  status: string;
  message: string;
  data: {
    id: number;
    account_number: string;
    bank_code: string;
    full_name: string;
    created_at: string;
    currency: string;
    debit_currency: string;
    amount: number;
    fee: number;
    status: string;
    reference: string;
    meta?: Record<string, unknown>;
    narration: string;
    complete_message: string;
    requires_approval: number;
    is_approved: number;
    bank_name: string;
  };
}

interface BankListResponse {
  status: string;
  message: string;
  data: Array<{
    id: number;
    code: string;
    name: string;
  }>;
}

interface MobileMoneyRequest {
  orderId: string;
  amount: number;
  currency: string;  // GHS, KES, UGX, RWF, ZMW, TZS
  email: string;
  phoneNumber: string;
  network: string;   // MTN, VODAFONE, AIRTEL, etc.
  redirectUrl: string;
}

interface MobileMoneyResponse {
  status: string;
  message: string;
  meta?: {
    authorization?: {
      redirect?: string;
      mode?: string;
    };
  };
}

/**
 * Initialize a standard payment (redirects to Flutterwave checkout)
 */
export async function initializePayment(request: PaymentInitRequest): Promise<PaymentInitResponse> {
  if (!isFlutterwaveConfigured()) {
    throw new Error('Flutterwave is not configured');
  }

  try {
    const response = await axios.post<PaymentInitResponse>(
      `${BASE_URL}/payments`,
      {
        tx_ref: request.orderId,
        amount: request.amount,
        currency: request.currency,
        redirect_url: request.redirectUrl,
        payment_options: request.paymentOptions || 'card,mobilemoney,ussd,bank_transfer',
        customer: {
          email: request.email,
          name: request.name,
          phonenumber: request.phone,
        },
        customizations: {
          title: request.customizations?.title || 'Fashion Marketplace',
          description: request.customizations?.description || `Payment for order ${request.orderId}`,
          logo: request.customizations?.logo || `${process.env.NEXTAUTH_URL}/logo.png`,
        },
        meta: request.meta,
      },
      {
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: unknown) {
    console.error('Flutterwave payment init error:', error);
    const axiosError = error as { response?: { data?: unknown } };
    throw new Error(`Flutterwave payment failed: ${JSON.stringify(axiosError.response?.data || error)}`);
  }
}

/**
 * Verify a transaction by reference
 */
export async function verifyTransaction(transactionId: string): Promise<TransactionVerifyResponse> {
  if (!isFlutterwaveConfigured()) {
    throw new Error('Flutterwave is not configured');
  }

  try {
    const response = await axios.get<TransactionVerifyResponse>(
      `${BASE_URL}/transactions/${transactionId}/verify`,
      {
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    return response.data;
  } catch (error: unknown) {
    console.error('Flutterwave verification error:', error);
    const axiosError = error as { response?: { data?: unknown } };
    throw new Error(`Flutterwave verification failed: ${JSON.stringify(axiosError.response?.data || error)}`);
  }
}

/**
 * Verify transaction by tx_ref (your order ID)
 */
export async function verifyTransactionByRef(txRef: string): Promise<TransactionVerifyResponse> {
  if (!isFlutterwaveConfigured()) {
    throw new Error('Flutterwave is not configured');
  }

  try {
    const response = await axios.get<{ status: string; data: TransactionVerifyResponse['data'][] }>(
      `${BASE_URL}/transactions`,
      {
        params: { tx_ref: txRef },
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    if (response.data.data && response.data.data.length > 0) {
      return {
        status: 'success',
        message: 'Transaction found',
        data: response.data.data[0],
      };
    }

    throw new Error('Transaction not found');
  } catch (error: unknown) {
    console.error('Flutterwave ref verification error:', error);
    const axiosError = error as { response?: { data?: unknown } };
    throw new Error(`Flutterwave verification failed: ${JSON.stringify(axiosError.response?.data || error)}`);
  }
}

/**
 * Initiate a bank transfer (for seller payouts)
 */
export async function initiateTransfer(request: TransferRequest): Promise<TransferResponse> {
  if (!isFlutterwaveConfigured()) {
    throw new Error('Flutterwave is not configured');
  }

  try {
    const response = await axios.post<TransferResponse>(
      `${BASE_URL}/transfers`,
      {
        account_bank: request.bankCode,
        account_number: request.accountNumber,
        amount: request.amount,
        currency: request.currency,
        narration: request.narration,
        reference: request.reference,
        beneficiary_name: request.beneficiaryName,
        meta: request.meta,
      },
      {
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: unknown) {
    console.error('Flutterwave transfer error:', error);
    const axiosError = error as { response?: { data?: unknown } };
    throw new Error(`Flutterwave transfer failed: ${JSON.stringify(axiosError.response?.data || error)}`);
  }
}

/**
 * Get list of banks by country
 */
export async function getBanks(country: string): Promise<BankListResponse> {
  if (!isFlutterwaveConfigured()) {
    throw new Error('Flutterwave is not configured');
  }

  try {
    const response = await axios.get<BankListResponse>(
      `${BASE_URL}/banks/${country}`,
      {
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    return response.data;
  } catch (error: unknown) {
    console.error('Flutterwave banks error:', error);
    const axiosError = error as { response?: { data?: unknown } };
    throw new Error(`Flutterwave banks fetch failed: ${JSON.stringify(axiosError.response?.data || error)}`);
  }
}

/**
 * Charge mobile money directly (Ghana, Kenya, Uganda, Rwanda, Zambia, Tanzania)
 */
export async function chargeMobileMoney(request: MobileMoneyRequest): Promise<MobileMoneyResponse> {
  if (!isFlutterwaveConfigured()) {
    throw new Error('Flutterwave is not configured');
  }

  // Determine endpoint based on currency
  const endpoints: Record<string, string> = {
    GHS: 'charges?type=mobile_money_ghana',
    KES: 'charges?type=mpesa',
    UGX: 'charges?type=mobile_money_uganda',
    RWF: 'charges?type=mobile_money_rwanda',
    ZMW: 'charges?type=mobile_money_zambia',
    TZS: 'charges?type=mobile_money_tanzania',
    XOF: 'charges?type=mobile_money_franco',
    XAF: 'charges?type=mobile_money_franco',
  };

  const endpoint = endpoints[request.currency];
  if (!endpoint) {
    throw new Error(`Unsupported mobile money currency: ${request.currency}`);
  }

  try {
    const response = await axios.post<MobileMoneyResponse>(
      `${BASE_URL}/${endpoint}`,
      {
        tx_ref: request.orderId,
        amount: request.amount,
        currency: request.currency,
        email: request.email,
        phone_number: request.phoneNumber,
        network: request.network,
        redirect_url: request.redirectUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: unknown) {
    console.error('Flutterwave mobile money error:', error);
    const axiosError = error as { response?: { data?: unknown } };
    throw new Error(`Flutterwave mobile money failed: ${JSON.stringify(axiosError.response?.data || error)}`);
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(signature: string, secretHash: string): boolean {
  return signature === secretHash;
}

/**
 * Get supported countries and their currencies
 */
export function getSupportedCountries() {
  return [
    { code: 'NG', name: 'Nigeria', currency: 'NGN', methods: ['card', 'bank_transfer', 'ussd'] },
    { code: 'GH', name: 'Ghana', currency: 'GHS', methods: ['card', 'mobile_money'] },
    { code: 'KE', name: 'Kenya', currency: 'KES', methods: ['card', 'mpesa'] },
    { code: 'ZA', name: 'South Africa', currency: 'ZAR', methods: ['card'] },
    { code: 'TZ', name: 'Tanzania', currency: 'TZS', methods: ['card', 'mobile_money'] },
    { code: 'UG', name: 'Uganda', currency: 'UGX', methods: ['card', 'mobile_money'] },
    { code: 'RW', name: 'Rwanda', currency: 'RWF', methods: ['card', 'mobile_money'] },
    { code: 'ZM', name: 'Zambia', currency: 'ZMW', methods: ['card', 'mobile_money'] },
    { code: 'CM', name: 'Cameroon', currency: 'XAF', methods: ['mobile_money'] },
    { code: 'CI', name: 'Ivory Coast', currency: 'XOF', methods: ['mobile_money'] },
    { code: 'SN', name: 'Senegal', currency: 'XOF', methods: ['mobile_money'] },
  ];
}

export interface FlutterwaveWebhookEvent {
  event: string;
  'event.type': string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    charged_amount: number;
    app_fee: number;
    status: string;
    payment_type: string;
    customer: {
      id: number;
      email: string;
      name: string;
      phone_number: string;
    };
    created_at: string;
  };
}
