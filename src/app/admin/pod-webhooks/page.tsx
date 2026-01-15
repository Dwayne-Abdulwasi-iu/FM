'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface WebhookStatus {
  printful?: {
    configured: boolean;
    webhooks?: Array<{ url: string; types: string[] }>;
    error?: string;
  };
  printify?: {
    configured: boolean;
    webhooks?: Array<{ id: string; topic: string; url: string }>;
    error?: string;
  };
}

export default function PODWebhooksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; secrets?: Record<string, string> } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [session, status, router]);

  useEffect(() => {
    fetchWebhookStatus();
  }, []);

  const fetchWebhookStatus = async () => {
    try {
      const response = await fetch('/api/admin/setup-pod-webhooks');
      if (response.ok) {
        const data = await response.json();
        setWebhookStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to fetch webhook status:', error);
    } finally {
      setLoading(false);
    }
  };

  const registerWebhooks = async () => {
    setRegistering(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/setup-pod-webhooks', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult({
          success: true,
          message: 'Webhooks registered successfully!',
          secrets: data.envVarsToSet
        });
        // Refresh status
        fetchWebhookStatus();
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to register webhooks'
        });
      }
    } catch (_error) {
      setResult({
        success: false,
        message: 'Network error while registering webhooks'
      });
    } finally {
      setRegistering(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (session?.user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">POD Webhook Management</h1>
          <p className="text-gray-600 mt-2">
            Configure webhooks for Print-on-Demand providers (Printful & Printify)
          </p>
        </div>

        {/* Webhook URLs */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Webhook Endpoints</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <span className="font-medium">Printful Webhook URL:</span>
                <code className="ml-2 text-sm bg-gray-200 px-2 py-1 rounded">
                  https://fm-wtit.onrender.com/api/webhooks/printful
                </code>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText('https://fm-wtit.onrender.com/api/webhooks/printful')}
                className="text-purple-600 hover:text-purple-800"
              >
                Copy
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <span className="font-medium">Printify Webhook URL:</span>
                <code className="ml-2 text-sm bg-gray-200 px-2 py-1 rounded">
                  https://fm-wtit.onrender.com/api/webhooks/printify
                </code>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText('https://fm-wtit.onrender.com/api/webhooks/printify')}
                className="text-purple-600 hover:text-purple-800"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Webhook Status</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Printful Status */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">📦 Printful</h3>
                {webhookStatus?.printful?.configured ? (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Connected</span>
                ) : (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">Not Connected</span>
                )}
              </div>
              
              {webhookStatus?.printful?.error && (
                <p className="text-red-600 text-sm mb-2">{webhookStatus.printful.error}</p>
              )}
              
              {webhookStatus?.printful?.webhooks && webhookStatus.printful.webhooks.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Registered webhooks:</p>
                  {webhookStatus.printful.webhooks.map((wh, i) => (
                    <div key={i} className="text-xs bg-gray-50 p-2 rounded">
                      <div className="font-mono truncate">{wh.url}</div>
                      <div className="text-gray-500 mt-1">
                        Events: {Array.isArray(wh.types) ? wh.types.join(', ') : 'All'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No webhooks registered</p>
              )}
            </div>

            {/* Printify Status */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">🖨️ Printify</h3>
                {webhookStatus?.printify?.configured ? (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Connected</span>
                ) : (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">Not Connected</span>
                )}
              </div>
              
              {webhookStatus?.printify?.error && (
                <p className="text-red-600 text-sm mb-2">{webhookStatus.printify.error}</p>
              )}
              
              {webhookStatus?.printify?.webhooks && webhookStatus.printify.webhooks.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Registered webhooks:</p>
                  {webhookStatus.printify.webhooks.map((wh, i) => (
                    <div key={i} className="text-xs bg-gray-50 p-2 rounded flex justify-between">
                      <span className="font-medium">{wh.topic}</span>
                      <span className="text-gray-500 truncate ml-2">{wh.url}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No webhooks registered</p>
              )}
            </div>
          </div>
        </div>

        {/* Register Button */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Register Webhooks</h2>
          <p className="text-gray-600 mb-4">
            Click the button below to automatically register webhooks with Printful and Printify.
            This will remove any existing webhooks and create new ones with fresh secrets.
          </p>
          
          <button
            onClick={registerWebhooks}
            disabled={registering}
            className={`px-6 py-3 rounded-lg font-medium text-white ${
              registering 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {registering ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Registering...
              </span>
            ) : (
              '🔧 Register Webhooks'
            )}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-lg shadow p-6 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <h3 className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.success ? '✅ Success' : '❌ Error'}
            </h3>
            <p className={`mt-2 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
              {result.message}
            </p>
            
            {result.secrets && (
              <div className="mt-4">
                <p className="font-medium text-gray-800 mb-2">Add these secrets to your .env file:</p>
                <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-x-auto">
                  {Object.entries(result.secrets).map(([key, value]) => (
                    <div key={key}>
                      {key}={value}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="bg-blue-50 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-blue-800 mb-2">ℹ️ How POD Webhooks Work</h3>
          <ul className="text-blue-700 space-y-1 text-sm">
            <li>• When a POD order status changes, the provider sends a webhook to your server</li>
            <li>• The webhook includes tracking info when orders are shipped</li>
            <li>• Customers and sellers are automatically notified of status updates</li>
            <li>• Admin receives alerts for failed orders, cancellations, and returns</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
