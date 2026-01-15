'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  User,
  Calendar,
  FileText,
  Shield,
  Lock,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface CommissionRequest {
  id: string;
  title: string;
  description: string;
  category: string | null;
  designerQuote: number;
  designerDeadline: string | null;
  designerResponse: string | null;
  status: string;
  designer: {
    id: string;
    name: string | null;
    displayName: string | null;
    email: string;
    image: string | null;
    isVerified: boolean;
  };
}

export default function CommissionPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [request, setRequest] = useState<CommissionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paystack'>('stripe');
  const [exchangeRate, setExchangeRate] = useState<number>(1600); // Default fallback

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (sessionStatus === 'authenticated') {
      fetchRequest();
      fetchExchangeRate();
    }
  }, [sessionStatus, resolvedParams.id]);

  const fetchExchangeRate = async () => {
    try {
      const res = await fetch('/api/exchange-rate');
      if (res.ok) {
        const data = await res.json();
        if (data.rate) {
          setExchangeRate(data.rate);
        }
      }
    } catch (err) {
      console.error('Failed to fetch exchange rate:', err);
      // Keep default fallback rate
    }
  };

  const fetchRequest = async () => {
    try {
      const response = await fetch(`/api/commission-requests/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        
        // Verify this request belongs to the user and is quoted
        if (data.request.requesterId !== session?.user?.id) {
          router.push('/commissions');
          return;
        }
        
        if (data.request.status !== 'QUOTED') {
          router.push('/commissions');
          return;
        }
        
        setRequest(data.request);
      } else {
        router.push('/commissions');
      }
    } catch (err) {
      console.error('Failed to fetch request:', err);
      router.push('/commissions');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!request) return;

    setProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/commission-requests/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to payment provider
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else if (data.authorizationUrl) {
          window.location.href = data.authorizationUrl;
        }
      } else {
        setError(data.error || 'Failed to initiate payment');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const platformFeePercent = 10;
  const quote = request?.designerQuote || 0;
  const platformFee = quote * (platformFeePercent / 100);
  const total = quote;
  
  // Convert to Naira for Paystack display using dynamic rate
  const totalInNGN = total * exchangeRate;

  // Format currency based on payment method
  const formatAmount = (amount: number, method: 'stripe' | 'paystack') => {
    if (method === 'paystack') {
      return `₦${(amount * exchangeRate).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Commission request not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/commissions"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Commissions
        </Link>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
            <h1 className="text-2xl font-bold">Pay for Commission</h1>
            <p className="text-indigo-100 mt-1">Complete payment to start your custom project</p>
          </div>

          <div className="p-6">
            {/* Commission Details */}
            <div className="mb-6">
              <h2 className="font-semibold text-gray-900 mb-3">{request.title}</h2>
              <p className="text-gray-600 text-sm">{request.description}</p>
              
              {request.designerDeadline && (
                <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  Estimated delivery: {request.designerDeadline}
                </div>
              )}
            </div>

            {/* Designer */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg mb-6">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                {request.designer.image ? (
                  <Image
                    src={request.designer.image}
                    alt=""
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {request.designer.displayName || request.designer.name}
                </p>
                <p className="text-sm text-gray-500">Designer</p>
              </div>
              {request.designer.isVerified && (
                <CheckCircle className="w-5 h-5 text-blue-500 ml-auto" />
              )}
            </div>

            {/* Designer Message */}
            {request.designerResponse && (
              <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm font-medium text-indigo-800 mb-1">Message from designer:</p>
                <p className="text-indigo-700">{request.designerResponse}</p>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="border-t border-b border-gray-200 py-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Commission Price</span>
                <span className="text-gray-900">${quote.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Platform Fee ({platformFeePercent}%)</span>
                <span className="text-gray-500">Included</span>
              </div>
              <div className="flex justify-between font-semibold text-lg mt-4">
                <span className="text-gray-900">Total</span>
                <div className="text-right">
                  <span className="text-gray-900">${total.toFixed(2)}</span>
                  {paymentMethod === 'paystack' && (
                    <p className="text-sm font-normal text-gray-500">
                      ≈ ₦{totalInNGN.toLocaleString('en-NG')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg mb-6">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {/* Payment Method */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('stripe')}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    paymentMethod === 'stripe'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CreditCard className="w-6 h-6 mx-auto mb-2 text-gray-700" />
                  <span className="text-sm font-medium text-gray-900">Card (Stripe)</span>
                  <p className="text-xs text-gray-500 mt-1">Pay in USD</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('paystack')}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    paymentMethod === 'paystack'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CreditCard className="w-6 h-6 mx-auto mb-2 text-gray-700" />
                  <span className="text-sm font-medium text-gray-900">Paystack</span>
                  <p className="text-xs text-gray-500 mt-1">Pay in Naira (₦)</p>
                </button>
              </div>
              {paymentMethod === 'paystack' && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Exchange rate: $1 = ₦{exchangeRate.toLocaleString()}
                </p>
              )}
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePayment}
              disabled={processing}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Pay {formatAmount(total, paymentMethod)}</>
              )}
            </button>

            {/* Escrow Protection Explanation */}
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">Escrow Payment Protection</p>
                  <p className="text-xs text-green-700 mt-1">
                    Your payment is held securely until you confirm the work is complete. 
                    The designer will NOT receive payment until you approve delivery.
                  </p>
                </div>
              </div>

              {/* How it works */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-800 mb-3">How Payment Protection Works:</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-3 h-3 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">1. Payment Held Securely</p>
                      <p className="text-xs text-gray-500">Your payment is held by the platform, not sent to designer</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-3 h-3 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">2. Designer Creates Your Item</p>
                      <p className="text-xs text-gray-500">Designer works on your commission knowing payment is secured</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3 h-3 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">3. You Confirm Delivery</p>
                      <p className="text-xs text-gray-500">Only after you confirm receiving your item is payment released</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <RefreshCw className="w-3 h-3 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">4. Dispute Resolution</p>
                      <p className="text-xs text-gray-500">If issues arise, our team mediates and can refund if needed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm font-medium text-amber-800 mb-2">Important Notes:</p>
                <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                  <li>Designer cannot access funds until you confirm completion</li>
                  <li>You can request revisions if the work doesn't match requirements</li>
                  <li>Disputes must be raised within 7 days of delivery</li>
                  <li>Refunds are available if the designer fails to deliver</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
