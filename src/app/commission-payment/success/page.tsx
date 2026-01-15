'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CommissionPaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestId = searchParams.get('request_id');
  const reference = searchParams.get('reference');
  
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commission, setCommission] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!requestId) {
        setError('Missing request information');
        setVerifying(false);
        return;
      }

      try {
        // Verify and confirm the payment
        const response = await fetch('/api/commission-requests/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, reference }),
        });

        const data = await response.json();

        if (response.ok) {
          setVerified(true);
          setCommission(data.commissionRequest);
        } else {
          // Payment might already be verified via webhook
          // Try to fetch the commission status
          const statusResponse = await fetch(`/api/commission-requests/${requestId}`);
          const statusData = await statusResponse.json();
          
          if (statusData.isPaid) {
            setVerified(true);
            setCommission(statusData);
          } else {
            setError(data.error || 'Payment verification failed');
          }
        }
      } catch (err) {
        setError('Failed to verify payment. Please contact support if the issue persists.');
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [requestId, reference]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Verifying your payment...</h2>
          <p className="text-gray-500 mt-2">Please wait while we confirm your transaction</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Issue</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <Link
              href={`/commission-payment/${requestId}`}
              className="block w-full py-2 px-4 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
            >
              Try Again
            </Link>
            <Link
              href="/commissions"
              className="block w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              View My Commissions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Your commission payment has been confirmed. The designer has been notified and will begin work soon.
        </p>

        {commission && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">{commission.title}</h3>
            <p className="text-sm text-gray-600 mb-2">
              Designer: {commission.designerName}
            </p>
            {commission.designerDeadline && (
              <p className="text-sm text-gray-600">
                Expected by: {new Date(commission.designerDeadline).toLocaleDateString()}
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-900">
                Amount Paid: ${commission.designerQuote?.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/commissions"
            className="block w-full py-2 px-4 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
          >
            View My Commissions
          </Link>
          <Link
            href="/designs"
            className="block w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Continue Shopping
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            You will receive an email confirmation with details about your commission.
            If you have any questions, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
}
