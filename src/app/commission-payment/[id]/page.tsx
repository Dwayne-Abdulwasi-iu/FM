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
  Shield,
  Lock,
  Clock,
  RefreshCw,
} from 'lucide-react';
import MilestoneDisplay from '@/components/commissions/MilestoneDisplay';
import { getCommissionRate } from '@/lib/commission-tiers';

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
    milestoneTemplate?: string;
    totalEarnings: number;
    designerTier: string | null;
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
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [clearingSession, setClearingSession] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paystack'>('stripe');
  const [exchangeRate, setExchangeRate] = useState<number>(1600); // Default fallback
  const [availableMethods, setAvailableMethods] = useState<{ stripe: boolean; paystack: boolean } | null>(null);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (sessionStatus === 'authenticated') {
      fetchRequest();
      fetchExchangeRate();
      fetchAvailablePaymentMethods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, resolvedParams.id]);

  // Handle retry countdown timer
  useEffect(() => {
    if (!retryAfter) {
      setSecondsRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, retryAfter - now);
      const seconds = Math.ceil(remaining / 1000);

      setSecondsRemaining(seconds);

      if (remaining === 0) {
        setRetryAfter(null);
        setSecondsRemaining(0);
        clearInterval(interval);
      }
    }, 100); // Update every 100ms for smooth countdown

    return () => clearInterval(interval);
  }, [retryAfter]);

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

  const fetchAvailablePaymentMethods = async () => {
    try {
      const res = await fetch('/api/commission-requests/payment-methods');
      if (res.ok) {
        const data = await res.json();
        setAvailableMethods(data.methods);
        // Set payment method to first available method
        if (data.methods.stripe) {
          setPaymentMethod('stripe');
        } else if (data.methods.paystack) {
          setPaymentMethod('paystack');
        }
      }
    } catch (err) {
      console.error('Failed to fetch available payment methods:', err);
      // Default to both available on error
      setAvailableMethods({ stripe: true, paystack: true });
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
    setRetryAfter(null);

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
        } else {
          // Response successful but missing redirect URL - this shouldn't happen
          console.error('Payment session created but no redirect URL provided', data);
          setError('Payment session created but failed to redirect. Please try again or contact support.');
        }
      } else {
        setError(data.error || 'Failed to initiate payment');
        // If rate limited, set the retry-after timestamp
        if (data.retryAfter) {
          const retryTime = new Date(data.retryAfter).getTime();
          // Validate that the timestamp is valid and in the future
          if (!isNaN(retryTime) && retryTime > Date.now()) {
            setRetryAfter(retryTime);
          }
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleClearSession = async () => {
    if (!request) return;

    setClearingSession(true);
    try {
      const response = await fetch('/api/commission-requests/clear-payment-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id }),
      });

      if (response.ok) {
        // Successfully cleared - show success feedback
        setError(''); // Clear error display
        setRetryAfter(null); // Clear rate limit
        setSecondsRemaining(0);
        
        // Refresh page data to ensure UI is in sync with server state
        const newData = await fetch(`/api/commission-requests/${request.id}`);
        if (newData.ok) {
          const updatedRequest = await newData.json();
          setRequest(updatedRequest);
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to clear payment session. Please try again.');
      }
    } catch (err) {
      console.error('Clear session error:', err);
      setError('Network error: Failed to clear payment session. Please check your connection and try again.');
    } finally {
      setClearingSession(false);
    }
  };

  // Calculate tiered platform fee based on designer's total earnings and tier
  const quote = request?.designerQuote || 0;
  const designerTotalEarnings = request?.designer.totalEarnings || 0;
  const isProSubscriber = request?.designer.designerTier === 'VIP_DESIGNER' || request?.designer.designerTier === 'VVIP_DESIGNER';
  const platformFeeRate = getCommissionRate(designerTotalEarnings, isProSubscriber);
  const platformFeePercent = Math.round(platformFeeRate * 100);
  const _platformFee = quote * platformFeeRate;
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
    <div className="min-h-screen bg-gray-50 py-3 sm:py-4 md:py-6">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6">
        <Link
          href="/commissions"
          className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-600 hover:text-gray-900 mb-3 sm:mb-4"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
          Back to Commissions
        </Link>

        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 sm:p-4 md:p-6 text-white">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Pay for Commission</h1>
            <p className="text-xs sm:text-sm text-indigo-100 mt-0.5 sm:mt-1">Complete payment to start your project</p>
          </div>

          <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
            {/* Commission Details */}
            <div>
              <h2 className="font-semibold text-sm sm:text-base text-gray-900">{request.title}</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">{request.description}</p>
              
              {request.designerDeadline && (
                <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-gray-500">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  Estimated delivery: {request.designerDeadline}
                </div>
              )}
            </div>

            {/* Designer */}
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
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
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-xs sm:text-sm text-gray-900">
                  {request.designer.displayName || request.designer.name}
                </p>
                <p className="text-xs text-gray-500">Designer</p>
              </div>
              {request.designer.isVerified && (
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
              )}
            </div>

            {/* Designer Message */}
            {request.designerResponse && (
              <div className="p-3 sm:p-4 bg-indigo-50 rounded-lg">
                <p className="text-xs sm:text-sm font-medium text-indigo-800">Message from designer:</p>
                <p className="text-xs sm:text-sm text-indigo-700 mt-1">{request.designerResponse}</p>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="border-t border-b border-gray-200 py-2 sm:py-3">
              <div className="flex justify-between text-xs sm:text-sm mb-1">
                <span className="text-gray-600">Commission Price</span>
                <span className="text-gray-900 font-medium">${quote.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm mb-2">
                <span className="text-gray-600">Platform Fee ({platformFeePercent}%)</span>
                <span className="text-gray-500">Included</span>
              </div>
              <div className="flex justify-between font-semibold text-base sm:text-lg mt-2 pt-1 border-t border-gray-200">
                <span className="text-gray-900">Total</span>
                <div className="text-right">
                  <span className="text-gray-900">${total.toFixed(2)}</span>
                  {paymentMethod === 'paystack' && (
                    <p className="text-xs font-normal text-gray-500 mt-0.5">
                      ≈ ₦{totalInNGN.toLocaleString('en-NG')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Milestone Payment Schedule */}
            <div className="p-3 sm:p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <MilestoneDisplay 
                template={(request.designer.milestoneTemplate || 'standard') as 'simple' | 'standard' | 'detailed' | null}
                totalAmount={total}
                platformFee={_platformFee}
                designerEarnings={quote}
                platformFeePercent={platformFeePercent}
              />
            </div>

            {error && (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-2 p-3 sm:p-4 bg-red-50 text-red-700 rounded-lg text-xs sm:text-sm border border-red-200">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>{error}</p>
                    {retryAfter && secondsRemaining > 0 && (
                      <p className="mt-1 text-xs font-medium text-red-600">
                        Try again in {secondsRemaining} second{secondsRemaining === 1 ? '' : 's'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    onClick={() => router.push('/commissions')}
                    className="py-2 sm:py-2.5 px-3 sm:px-4 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium text-xs sm:text-sm transition-colors"
                  >
                    Back to Commissions
                  </button>
                  <button
                    onClick={handleClearSession}
                    disabled={clearingSession || secondsRemaining > 0}
                    className="py-2 sm:py-2.5 px-3 sm:px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-1"
                  >
                    {clearingSession ? (
                      <>
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                        <span className="hidden sm:inline">Clearing...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Clear & Retry</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              {!availableMethods ? (
                <div className="p-3 sm:p-4 bg-gray-100 rounded-lg text-center text-sm text-gray-600">
                  Loading payment options...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {availableMethods.stripe && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('stripe')}
                        className={`p-2.5 sm:p-4 border-2 rounded-lg text-center transition-colors ${
                          paymentMethod === 'stripe'
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 text-gray-700" />
                        <span className="text-xs sm:text-sm font-medium text-gray-900 block">Card (Stripe)</span>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Pay in USD</p>
                      </button>
                    )}
                    {availableMethods.paystack && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('paystack')}
                        className={`p-2.5 sm:p-4 border-2 rounded-lg text-center transition-colors ${
                          paymentMethod === 'paystack'
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 text-gray-700" />
                        <span className="text-xs sm:text-sm font-medium text-gray-900 block">Paystack</span>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Pay in Naira (₦)</p>
                      </button>
                    )}
                  </div>
                  {!availableMethods.stripe && !availableMethods.paystack && (
                    <div className="p-3 sm:p-4 bg-red-50 text-red-700 rounded-lg text-xs sm:text-sm border border-red-200">
                      No payment methods are currently available. Please contact support.
                    </div>
                  )}
                </>
              )}
              {paymentMethod === 'paystack' && (
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 text-center">
                  Exchange rate: $1 = ₦{exchangeRate.toLocaleString()}
                </p>
              )}
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePayment}
              disabled={processing}
              className="w-full py-2.5 sm:py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Pay {formatAmount(total, paymentMethod)}</>
              )}
            </button>

            {/* Escrow Protection Explanation */}
            <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3 pt-3 border-t border-gray-200">
              <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-green-50 rounded-lg">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-medium text-green-800">Escrow Payment Protection</p>
                  <p className="text-[10px] sm:text-xs text-green-700 mt-0.5">
                    Your payment is held securely until you confirm the work is complete. 
                    Designer gets paid only after you approve delivery.
                  </p>
                </div>
              </div>

              {/* How it works */}
              <div className="p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                <p className="text-xs sm:text-sm font-medium text-gray-800 mb-2">How it works:</p>
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-700">1. Payment Held</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">Payment held by platform, not sent yet</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-700">2. Designer Works</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">Designer creates your item</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-700">3. You Confirm</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">Confirm delivery, then payment released</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-700">4. Disputes</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">We mediate and offer refunds if needed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              <div className="p-2.5 sm:p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs sm:text-sm font-medium text-amber-800 mb-1">Important:</p>
                <ul className="text-[10px] sm:text-xs text-amber-700 space-y-0.5 list-disc list-inside">
                  <li>Designer cannot access funds until you confirm</li>
                  <li>Request revisions if needed</li>
                  <li>Disputes within 7 days of delivery</li>
                  <li>Refunds if designer fails to deliver</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
