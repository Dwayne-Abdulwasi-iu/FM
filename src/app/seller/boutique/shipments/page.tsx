'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowLeft,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';

interface Shipment {
  id: string;
  trackingNumber: string;
  courier: string;
  status: string;
  shippedAt: string | null;
  receivedAt: string | null;
  expectedDeliveryDate: string | null;
  itemsExpected: number;
  itemsReceived: number | null;
  itemsMissing: number | null;
  itemsDamaged: number | null;
  hasDiscrepancy: boolean;
  disputeStatus: string | null;
  disputeResolution: string | null;
  disputeNotes: string | null;
  adminNotes: string | null;
  productIds: string[];
  products: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  SHIPPED: { label: 'In Transit', color: 'text-blue-700', bgColor: 'bg-blue-50', icon: <Truck className="w-4 h-4" /> },
  RECEIVED: { label: 'Received', color: 'text-green-700', bgColor: 'bg-green-50', icon: <CheckCircle className="w-4 h-4" /> },
  DISCREPANCY: { label: 'Discrepancy', color: 'text-orange-700', bgColor: 'bg-orange-50', icon: <AlertTriangle className="w-4 h-4" /> },
  CANCELLED: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-50', icon: <XCircle className="w-4 h-4" /> },
};

const DISPUTE_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  NONE: { label: 'No Dispute', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  OPENED: { label: 'Under Review', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  RESOLVED: { label: 'Resolved', color: 'text-green-700', bgColor: 'bg-green-50' },
};

const RESOLUTION_LABELS: Record<string, string> = {
  SELLER_FAULT: 'Seller Fault - Items not packed as declared',
  CARRIER_FAULT: 'Carrier Fault - Damage during shipping',
  WRITTEN_OFF: 'Written Off - No action required',
  SELLER_RESHIP: 'Reship Required - Please send replacement',
};

export default function SellerShipmentsPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeoutRef, setSearchTimeoutRef] = useState<NodeJS.Timeout | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [authStatus, router]);

  useEffect(() => {
    fetchShipments(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchTimeoutRef) clearTimeout(searchTimeoutRef);
    const timeout = setTimeout(() => {
      fetchShipments(false);
    }, 500);
    setSearchTimeoutRef(timeout);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const fetchShipments = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      const response = await fetch(`/api/boutique/seller/shipments?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setShipments(data.shipments);
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  const getStatusConfig = (shipment: Shipment) => {
    if (shipment.hasDiscrepancy) {
      return STATUS_CONFIG.DISCREPANCY;
    }
    return STATUS_CONFIG[shipment.status] || STATUS_CONFIG.SHIPPED;
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/seller/boutique"
              className="p-1.5 hover:bg-white/20 rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold">Shipments</h1>
              <p className="text-purple-200 mt-0 sm:mt-0.5 text-xs">
                Track shipments and verify receipts
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by tracking number or courier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 pl-9 sm:pl-10 border border-gray-200 rounded-lg text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <svg className="absolute left-2.5 sm:left-3 top-2 sm:top-2.5 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Shipments List */}
        {shipments.length === 0 ? (
          <div className="bg-white rounded-lg p-6 sm:p-8 text-center">
            <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2" />
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">No shipments yet</h3>
            <p className="text-gray-500 mb-4 text-[10px] sm:text-xs">
              Products shipped to warehouse will appear here
            </p>
            <Link
              href="/seller/boutique"
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-3 py-1.5 text-xs sm:text-sm rounded-lg font-semibold hover:bg-purple-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {shipments.map((shipment) => {
              const statusConfig = getStatusConfig(shipment);
              const disputeConfig = shipment.disputeStatus ? DISPUTE_STATUS_CONFIG[shipment.disputeStatus] : null;
              const isExpanded = expandedId === shipment.id;

              return (
                <div
                  key={shipment.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Header Row - Clickable */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : shipment.id)}
                    className="w-full p-3 sm:p-4 text-left hover:bg-gray-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-lg ${statusConfig.bgColor}`}>
                        {statusConfig.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-[10px] sm:text-xs truncate">
                          {shipment.courier} - {shipment.trackingNumber}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-gray-500">
                          {new Date(shipment.shippedAt || shipment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                      {shipment.hasDiscrepancy && disputeConfig && (
                        <span className={`px-2.5 py-0.5 rounded-full font-medium ${disputeConfig.bgColor} ${disputeConfig.color}`}>
                          {disputeConfig.label}
                        </span>
                      )}
                    </div>
                    <ChevronDown 
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Items Info & Details - Only show when expanded */}
                  {isExpanded && (
                    <div className="border-t px-0 py-3 sm:py-4 bg-gray-50 space-y-3">
                      {/* Items Summary */}
                      <div className="px-3 sm:px-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] sm:text-xs">
                    <div className="bg-gray-50 rounded-lg p-1.5">
                      <p className="text-gray-500 text-[9px] sm:text-[10px]">Expected</p>
                      <p className="font-semibold text-gray-900">{shipment.itemsExpected}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-1.5">
                      <p className="text-gray-500 text-[9px] sm:text-[10px]">Received</p>
                      <p className={`font-semibold ${shipment.itemsReceived !== null ? (shipment.itemsReceived === shipment.itemsExpected ? 'text-green-600' : 'text-orange-600') : 'text-gray-400'}`}>
                        {shipment.itemsReceived !== null ? shipment.itemsReceived : 'Pending'}
                      </p>
                    </div>
                    {shipment.itemsMissing !== null && shipment.itemsMissing > 0 && (
                      <div className="bg-red-50 rounded-lg p-1.5">
                        <p className="text-red-500 text-[9px] sm:text-[10px]">Missing</p>
                        <p className="font-semibold text-red-600">{shipment.itemsMissing}</p>
                      </div>
                    )}
                    {shipment.itemsDamaged !== null && shipment.itemsDamaged > 0 && (
                      <div className="bg-orange-50 rounded-lg p-1.5">
                        <p className="text-orange-500 text-[9px] sm:text-[10px]">Damaged</p>
                        <p className="font-semibold text-orange-600">{shipment.itemsDamaged}</p>
                      </div>
                    )}
                        </div>
                      </div>

                      {/* Discrepancy Alert */}
                      {shipment.hasDiscrepancy && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 sm:p-3 mb-3 text-[10px] sm:text-xs">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-orange-800 text-[10px] sm:text-xs mb-0.5">Discrepancy</h4>
                              <p className="text-orange-700 text-[10px] sm:text-xs mb-1">
                                Admin found differences in items.
                              </p>
                              
                              {shipment.disputeResolution && (
                                <div className="mt-1 sm:mt-2 bg-white rounded-lg p-1.5 sm:p-2">
                                  <p className="text-[9px] sm:text-[10px] text-gray-500 mb-0.5">Resolution</p>
                                  <p className="font-medium text-gray-900 text-[10px] sm:text-xs">
                                {RESOLUTION_LABELS[shipment.disputeResolution] || shipment.disputeResolution}
                              </p>
                            </div>
                          )}

                          {shipment.disputeNotes && (
                            <div className="mt-1 sm:mt-2 bg-white rounded-lg p-1.5 sm:p-2">
                              <p className="text-[9px] sm:text-[10px] text-gray-500 mb-0.5">Notes</p>
                              <p className="text-[10px] sm:text-xs text-gray-700">{shipment.disputeNotes}</p>
                            </div>
                          )}

                          {shipment.disputeResolution === 'SELLER_RESHIP' && (
                            <div className="mt-1 sm:mt-2 bg-yellow-100 rounded-lg p-1.5 sm:p-2">
                              <p className="text-[10px] sm:text-xs font-medium text-yellow-800">
                                ⚠️ Please ship replacements
                              </p>
                            </div>
                          )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* All Items OK Message */}
                      {!shipment.hasDiscrepancy && shipment.status === 'RECEIVED' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3 mb-3 text-[10px] sm:text-xs">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <div>
                              <h4 className="font-semibold text-green-800 text-[10px] sm:text-xs">Verified</h4>
                              <p className="text-green-700 text-[10px] sm:text-xs">
                                All items passed verification.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pending Receipt */}
                      {shipment.status === 'SHIPPED' && !shipment.receivedAt && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 mb-3 text-[10px] sm:text-xs">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <div>
                              <h4 className="font-semibold text-blue-800 text-[10px] sm:text-xs">In Transit</h4>
                              <p className="text-blue-700 text-[10px] sm:text-xs">
                                Expected by {shipment.expectedDeliveryDate
                                  ? new Date(shipment.expectedDeliveryDate).toLocaleDateString()
                                  : 'TBD'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Admin Notes (if no discrepancy) */}
                      {!shipment.hasDiscrepancy && shipment.adminNotes && (
                        <div className="bg-gray-50 rounded-lg p-1.5 sm:p-2 mb-3 text-[10px] sm:text-xs">
                          <p className="text-gray-500 text-[9px] sm:text-[10px] mb-0.5">Admin Notes</p>
                          <p className="text-gray-700">{shipment.adminNotes}</p>
                        </div>
                      )}

                      {/* Products */}
                      <div className="border-t pt-3 px-3 sm:px-4">
                        <p className="text-[9px] sm:text-[10px] text-gray-500 mb-2">Products:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {shipment.products.map((product) => (
                            <Link
                              key={product.id}
                              href={`/seller/boutique/ship/${product.id}`}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-[9px] sm:text-[10px] hover:bg-purple-100 hover:text-purple-700 transition"
                            >
                              <Package className="w-2.5 h-2.5" />
                              <span className="truncate max-w-xs">{product.title}</span>
                              <ExternalLink className="w-2 h-2" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
