'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Image from 'next/image';
import {
  Package,
  Search,
  Check,
  X,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Play,
  ImageIcon,
  User,
  Rocket,
  Warehouse,
  ShoppingBag,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { FULFILLMENT_METHOD, SELLER_TIER_CONFIG, type SellerTier } from '@/lib/boutique/constants';

interface ProductMedia {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  isPrimary: boolean;
}

interface Variant {
  id: string;
  size: string;
  color: string;
  colorHex: string;
  quantity: number;
}

interface Product {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  status: string;
  thumbnailUrl: string;
  createdAt: string;
  submittedAt: string;
  fulfillmentMethod: string;
  sellerShippingLocations?: string[];
  sellerShippingTime?: string;
  category: {
    name: string;
  };
  seller: {
    id: string;
    name: string;
    email: string;
    designerTier?: string;
  };
  media: ProductMedia[];
  variants: Variant[];
  brand: string;
  material: string;
  condition: string;
  shipment?: {
    id: string;
    carrier: string;
    trackingNumber: string;
    status: string;
    estimatedArrival: string;
  };
}

interface VariantVerification {
  variantId: string;
  size: string;
  color: string;
  expected: number;
  received: number;
  damaged: number;
  passed: number;
}

interface StatusCounts {
  pendingContentReview: number;
  contentApproved: number;
  shippedToAdmin: number;
  receivedByAdmin: number;
  verificationPassed: number;
  live: number;
  rejected: number;
  // Seller Direct specific
  sellerDirectPending: number;
  sellerDirectLive: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  PENDING_CONTENT_REVIEW: { label: 'Pending Review', color: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: Clock },
  CONTENT_APPROVED: { label: 'Content Approved', color: 'text-blue-700', bgColor: 'bg-blue-50', icon: Check },
  SHIPPED_TO_ADMIN: { label: 'In Transit', color: 'text-purple-700', bgColor: 'bg-purple-50', icon: Truck },
  RECEIVED_BY_ADMIN: { label: 'At Warehouse', color: 'text-indigo-700', bgColor: 'bg-indigo-50', icon: Package },
  VERIFICATION_PASSED: { label: 'Verified', color: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle },
  LIVE: { label: 'Live', color: 'text-emerald-700', bgColor: 'bg-emerald-50', icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-50', icon: XCircle },
};

// Tabs for Admin Stock products
const ADMIN_STOCK_TABS = [
  { key: 'content', label: 'Content Review', status: 'PENDING_CONTENT_REVIEW' },
  { key: 'awaiting', label: 'Awaiting Shipment', status: 'CONTENT_APPROVED' },
  { key: 'transit', label: 'In Transit', status: 'SHIPPED_TO_ADMIN' },
  { key: 'warehouse', label: 'At Warehouse', status: 'RECEIVED_BY_ADMIN' },
  { key: 'verified', label: 'Ready to Go Live', status: 'VERIFICATION_PASSED' },
  { key: 'live', label: 'Live Products', status: 'LIVE' },
];

// Tabs for Seller Direct products
const SELLER_DIRECT_TABS = [
  { key: 'direct_content', label: 'Review', status: 'PENDING_CONTENT_REVIEW' },
  { key: 'direct_approved', label: 'Approved', status: 'CONTENT_APPROVED' },
  { key: 'direct_live', label: 'Live', status: 'LIVE' },
];

export default function AdminBoutiquePage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts | null>(null);
  const [activeTab, setActiveTab] = useState('content');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<'ALL' | 'ADMIN_STOCK' | 'SELLER_DIRECT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionType, setActionType] = useState<'content' | 'physical'>('content');
  const [selectedMedia, setSelectedMedia] = useState<ProductMedia | null>(null);
  
  // Verification modal state
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [variantVerifications, setVariantVerifications] = useState<VariantVerification[]>([]);
  const [verificationNotes, setVerificationNotes] = useState('');

  // Determine which tabs to show based on fulfillment filter
  const activeTabs = fulfillmentFilter === 'SELLER_DIRECT' ? SELLER_DIRECT_TABS : ADMIN_STOCK_TABS;
  const currentTabConfig = activeTabs.find(t => t.key === activeTab);
  const currentTabStatus = currentTabConfig?.status || 'PENDING_CONTENT_REVIEW';

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (authStatus === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [authStatus, session, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchProducts();
    }
  }, [session, activeTab, page, fulfillmentFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const fulfillmentParam = fulfillmentFilter !== 'ALL' ? `&fulfillmentMethod=${fulfillmentFilter}` : '';
      const response = await fetch(
        `/api/boutique/admin/products?status=${currentTabStatus}&page=${page}&search=${searchQuery}${fulfillmentParam}`
      );
      const data = await response.json();

      if (data.success) {
        setProducts(data.products);
        setStatusCounts(data.statusCounts);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (productId: string, action: string, reason?: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/boutique/admin/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          action,
          reason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Show success message before closing
        toast.success(data.message || 'Action completed');
        setSelectedProduct(null);
        setShowRejectModal(false);
        setRejectReason('');
        fetchProducts();
      } else {
        toast.error(data.message || 'Action failed');
      }
    } catch (error) {
      console.error('Action failed:', error);
      toast.error('Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (type: 'content' | 'physical') => {
    setActionType(type);
    setShowRejectModal(true);
  };

  const submitRejection = () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    const action = actionType === 'content' ? 'reject_content' : 'reject_physical';
    handleAction(selectedProduct!.id, action, rejectReason);
  };

  // Open verification modal and initialize variant verifications
  const openVerificationModal = () => {
    if (!selectedProduct) return;
    
    const initialVerifications: VariantVerification[] = selectedProduct.variants.map(v => ({
      variantId: v.id,
      size: v.size,
      color: v.color,
      expected: v.quantity,
      received: v.quantity,
      damaged: 0,
      passed: v.quantity,
    }));
    
    setVariantVerifications(initialVerifications);
    setVerificationNotes('');
    setShowVerificationModal(true);
  };

  // Update a specific variant's verification data
  const updateVariantVerification = (variantId: string, field: 'received' | 'damaged' | 'passed', value: number) => {
    setVariantVerifications(prev => prev.map(v => {
      if (v.variantId !== variantId) return v;
      
      const updated = { ...v, [field]: Math.max(0, value) };
      
      // Auto-calculate passed if received or damaged changes
      if (field === 'received' || field === 'damaged') {
        updated.passed = Math.max(0, updated.received - updated.damaged);
      }
      // Ensure passed doesn't exceed received - damaged
      if (field === 'passed') {
        updated.passed = Math.min(value, updated.received - updated.damaged);
      }
      
      return updated;
    }));
  };

  // Submit verification with variant-level data
  const submitVerification = async (allPassed: boolean) => {
    if (!selectedProduct) return;
    
    setActionLoading(true);
    try {
      // Calculate totals
      const totalExpected = variantVerifications.reduce((sum, v) => sum + v.expected, 0);
      const totalReceived = variantVerifications.reduce((sum, v) => sum + v.received, 0);
      const totalDamaged = variantVerifications.reduce((sum, v) => sum + v.damaged, 0);
      const totalPassed = variantVerifications.reduce((sum, v) => sum + v.passed, 0);
      const totalMissing = totalExpected - totalReceived;
      
      const hasDiscrepancy = totalMissing > 0 || totalDamaged > 0 || totalPassed < totalExpected;
      
      const response = await fetch(`/api/boutique/admin/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          action: allPassed ? 'verify_physical' : 'reject_physical',
          reason: !allPassed ? verificationNotes : undefined,
          verification: {
            variantVerifications,
            totalExpected,
            totalReceived,
            totalDamaged,
            totalPassed,
            totalMissing,
            hasDiscrepancy,
            notes: verificationNotes,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'Verification completed');
        setShowVerificationModal(false);
        setSelectedProduct(null);
        fetchProducts();
      } else {
        toast.error(data.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification failed:', error);
      toast.error('Verification failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (authStatus === 'loading' || (authStatus === 'authenticated' && !session)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (session?.user?.role !== 'ADMIN') {
    return null;
  }

  const getTabCount = (key: string): number => {
    if (!statusCounts) return 0;
    switch (key) {
      // Admin Stock tabs
      case 'content': return statusCounts.pendingContentReview;
      case 'awaiting': return statusCounts.contentApproved;
      case 'transit': return statusCounts.shippedToAdmin;
      case 'warehouse': return statusCounts.receivedByAdmin;
      case 'verified': return statusCounts.verificationPassed;
      case 'live': return statusCounts.live;
      // Seller Direct tabs
      case 'direct_content': return statusCounts.sellerDirectPending || 0;
      case 'direct_approved': return statusCounts.contentApproved || 0;
      case 'direct_live': return statusCounts.sellerDirectLive || 0;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Boutique Verification</h1>
              <p className="text-xs sm:text-base text-gray-500 mt-0.5 sm:mt-1">Review and verify products from sellers</p>
            </div>
            {/* Quick Navigation Links */}
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/boutique/repost-approvals"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium transition"
                title="Approve or reject seller repost requests"
              >
                <CheckCircle className="w-4 h-4" />
                Repost Queue
              </Link>
              <Link
                href="/admin/boutique/orders"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-medium transition"
              >
                <ShoppingBag className="w-4 h-4" />
                Orders
              </Link>
              <Link
                href="/admin/boutique/returns"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-sm font-medium transition"
              >
                <RotateCcw className="w-4 h-4" />
                Returns
              </Link>
              <Link
                href="/admin/boutique/rejected"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium transition"
              >
                <XCircle className="w-4 h-4" />
                Rejected
              </Link>
              <Link
                href="/admin/boutique/shipments"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium transition"
              >
                <Truck className="w-4 h-4" />
                Shipments
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Fulfillment Type Filter */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-[10px] sm:text-sm font-medium text-gray-700 hidden xs:inline">View:</span>
            <div className="flex bg-white rounded-lg p-0.5 sm:p-1 shadow-sm overflow-x-auto">
              <button
                onClick={() => { setFulfillmentFilter('ALL'); setActiveTab('content'); setPage(1); }}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap ${
                  fulfillmentFilter === 'ALL'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => { setFulfillmentFilter('ADMIN_STOCK'); setActiveTab('content'); setPage(1); }}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-[10px] sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-2 whitespace-nowrap ${
                  fulfillmentFilter === 'ADMIN_STOCK'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Warehouse className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Admin </span>Stock
              </button>
              <button
                onClick={() => { setFulfillmentFilter('SELLER_DIRECT'); setActiveTab('direct_content'); setPage(1); }}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-[10px] sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-2 whitespace-nowrap ${
                  fulfillmentFilter === 'SELLER_DIRECT'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Rocket className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Seller </span>Direct
              </button>
            </div>
            {fulfillmentFilter !== 'ALL' && (
              <div className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium hidden sm:block ${
                fulfillmentFilter === 'SELLER_DIRECT' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {fulfillmentFilter === 'SELLER_DIRECT' 
                  ? '🚀 Seller ships to buyers directly' 
                  : '🏢 Products in your warehouse'
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="flex overflow-x-auto gap-1 py-1.5 sm:py-2 -mx-1 px-1">
            {activeTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1); }}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg whitespace-nowrap text-[10px] sm:text-sm font-medium flex items-center gap-1 sm:gap-2 transition-colors ${
                  activeTab === tab.key
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="hidden xs:inline">{tab.label}</span>
                <span className="xs:hidden">{tab.label.split(' ')[0]}</span>
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs ${
                  activeTab === tab.key ? 'bg-purple-200' : 'bg-gray-200'
                }`}>
                  {getTabCount(tab.key)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Search */}
        <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchProducts()}
              placeholder="Search..."
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          <button
            onClick={fetchProducts}
            className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs sm:text-sm"
          >
            Search
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12 sm:py-20">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-xl p-8 sm:p-12 text-center">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">No Products</h3>
            <p className="text-xs sm:text-base text-gray-500 mt-1">No products in this queue</p>
          </div>
        ) : (
          <>
            {/* Product Grid */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {products.map(product => {
                const status = STATUS_CONFIG[product.status] || STATUS_CONFIG.PENDING_CONTENT_REVIEW;
                const StatusIcon = status.icon;
                const isSellerDirect = product.fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT;
                const sellerTier = product.seller?.designerTier as SellerTier | undefined;
                
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedProduct(product)}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-[4/3] bg-gray-100 relative">
                      {product.thumbnailUrl || (product.media && product.media[0]?.url) ? (
                        <Image
                          src={product.thumbnailUrl || product.media[0]?.url || ''}
                          alt={product.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300" />
                        </div>
                      )}
                      {/* Status Badge */}
                      <div className={`absolute top-2 sm:top-3 left-2 sm:left-3 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-medium flex items-center gap-0.5 sm:gap-1 ${status.bgColor} ${status.color}`}>
                        <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span className="hidden xs:inline">{status.label}</span>
                      </div>
                      {/* Fulfillment Badge */}
                      <div className={`absolute top-2 sm:top-3 right-2 sm:right-3 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-medium flex items-center gap-0.5 sm:gap-1 ${
                        isSellerDirect 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isSellerDirect ? (
                          <>
                            <Rocket className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span className="hidden xs:inline">Direct</span>
                          </>
                        ) : (
                          <>
                            <Warehouse className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span className="hidden xs:inline">Stock</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-2 sm:p-4">
                      <h3 className="font-semibold text-gray-900 line-clamp-1 text-xs sm:text-base">{product.title}</h3>
                      <p className="text-[10px] sm:text-sm text-gray-500">{product.category.name}</p>
                      
                      {/* Seller Tier Badge */}
                      {sellerTier && SELLER_TIER_CONFIG[sellerTier] && (
                        <div className={`inline-flex items-center gap-0.5 sm:gap-1 mt-1.5 sm:mt-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs ${SELLER_TIER_CONFIG[sellerTier].bgColor} ${SELLER_TIER_CONFIG[sellerTier].color}`}>
                          <span>{SELLER_TIER_CONFIG[sellerTier].badge}</span>
                          <span className="hidden xs:inline">{SELLER_TIER_CONFIG[sellerTier].label}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2 sm:mt-3">
                        <span className="text-purple-600 font-semibold text-xs sm:text-base">
                          ₦{product.basePrice.toLocaleString()}
                        </span>
                        <span className="text-[9px] sm:text-xs text-gray-500">
                          {new Date(product.submittedAt || product.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                        </div>
                        <span className="text-[10px] sm:text-sm text-gray-600 truncate">{product.seller.name}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 sm:p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <span className="text-xs sm:text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 sm:p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <h2 className="text-base sm:text-xl font-bold text-gray-900">Review Product</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close modal"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="p-3 sm:p-6">
              {/* Media Gallery */}
              <div className="mb-4 sm:mb-6">
                <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                  <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  Media ({selectedProduct.media.length})
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                  {selectedProduct.media.map((m, i) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMedia(m)}
                      className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      {m.type === 'IMAGE' ? (
                        <Image
                          src={m.url}
                          alt={`Media ${i + 1}`}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900 group-hover:bg-gray-800 transition-colors">
                          <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                      )}
                      {m.isPrimary && (
                        <div className="absolute top-0.5 sm:top-1 left-0.5 sm:left-1 bg-purple-600 text-white text-[8px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded">
                          1st
                        </div>
                      )}
                      <div className="absolute bottom-0.5 sm:bottom-1 right-0.5 sm:right-1 bg-black/70 text-white text-[8px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded">
                        {m.type}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Product Details</h3>
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-black">
                    <p><strong>Title:</strong> {selectedProduct.title}</p>
                    <p><strong>Category:</strong> {selectedProduct.category.name}</p>
                    <p><strong>Price:</strong> ₦{selectedProduct.basePrice.toLocaleString()}</p>
                    <p><strong>Brand:</strong> {selectedProduct.brand || 'N/A'}</p>
                    <p><strong>Material:</strong> {selectedProduct.material || 'N/A'}</p>
                    <p><strong>Condition:</strong> {selectedProduct.condition}</p>
                  </div>
                  
                  <div className="mt-3 sm:mt-4">
                    <strong className="text-xs sm:text-sm text-black">Description:</strong>
                    <p className="text-xs sm:text-sm text-black mt-1 whitespace-pre-wrap break-words leading-relaxed">{selectedProduct.description}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Seller Info</h3>
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-black">
                    <p><strong>Name:</strong> {selectedProduct.seller.name}</p>
                    <p><strong>Email:</strong> {selectedProduct.seller.email}</p>
                  </div>

                  {/* Variants */}
                  <h3 className="font-semibold text-gray-900 mt-3 sm:mt-4 mb-2 sm:mb-3 text-sm sm:text-base">Variants</h3>
                  <div className="space-y-1.5 sm:space-y-2">
                    {selectedProduct.variants.map((v, _i) => (
                      <div key={v.id} className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm p-1.5 sm:p-2 bg-gray-50 rounded text-black">
                        {v.colorHex && (
                          <div
                            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border"
                            style={{ backgroundColor: v.colorHex }}
                          />
                        )}
                        <span>{v.color || 'No color'}</span>
                        <span>•</span>
                        <span>{v.size || 'No size'}</span>
                        <span>•</span>
                        <span>Qty: {v.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Shipment Info */}
                  {selectedProduct.shipment && (
                    <>
                      <h3 className="font-semibold text-gray-900 mt-3 sm:mt-4 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                        <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Shipment Details
                      </h3>
                      <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm p-2 sm:p-3 bg-blue-50 rounded-lg text-black">
                        <p><strong>Courier:</strong> {selectedProduct.shipment.carrier || 'N/A'}</p>
                        <p><strong>Tracking Number:</strong> {selectedProduct.shipment.trackingNumber || 'N/A'}</p>
                        <p><strong>Status:</strong> {selectedProduct.shipment.status || 'N/A'}</p>
                        {selectedProduct.shipment.estimatedArrival && (
                          <p><strong>Estimated Arrival:</strong> {new Date(selectedProduct.shipment.estimatedArrival).toLocaleDateString()}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t pt-4 sm:pt-6">
                {selectedProduct.status === 'PENDING_CONTENT_REVIEW' && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => handleAction(selectedProduct.id, 'approve_content')}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 sm:py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                    >
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => openRejectModal('content')}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 sm:py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                    >
                      <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      Reject
                    </button>
                  </div>
                )}

                {selectedProduct.status === 'SHIPPED_TO_ADMIN' && (
                  <button
                    type="button"
                    onClick={() => handleAction(selectedProduct.id, 'mark_received')}
                    disabled={actionLoading}
                    className="w-full py-2.5 sm:py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                  >
                    <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden xs:inline">Mark as </span>Received
                  </button>
                )}

                {selectedProduct.status === 'RECEIVED_BY_ADMIN' && (
                  <button
                    type="button"
                    onClick={openVerificationModal}
                    disabled={actionLoading}
                    className="w-full py-2.5 sm:py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                  >
                    <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                    Verify Items Received
                  </button>
                )}

                {selectedProduct.status === 'VERIFICATION_PASSED' && (
                  <button
                    type="button"
                    onClick={() => handleAction(selectedProduct.id, 'go_live')}
                    disabled={actionLoading}
                    className="w-full py-2.5 sm:py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                  >
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    Go Live
                  </button>
                )}

                {selectedProduct.status === 'LIVE' && (
                  <div className="text-center text-green-600">
                    <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2" />
                    <p className="font-semibold text-sm sm:text-base">Product is live</p>
                  </div>
                )}

                {selectedProduct.status === 'CONTENT_APPROVED' && (
                  <div className="text-center text-blue-600">
                    <Clock className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2" />
                    <p className="font-semibold text-sm sm:text-base">Awaiting seller shipment</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-2 sm:p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="relative bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                {selectedMedia.type === 'IMAGE' ? (
                  <>
                    <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    Image Viewer
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                    Video Player
                  </>
                )}
              </h3>
              <button
                onClick={() => setSelectedMedia(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close media viewer"
                aria-label="Close media viewer"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50">
              {selectedMedia.type === 'IMAGE' ? (
                <div className="relative w-full h-full min-h-[300px] sm:min-h-[500px]">
                  <Image
                    src={selectedMedia.url}
                    alt="Full size"
                    fill
                    className="object-contain p-2 sm:p-4"
                  />
                </div>
              ) : (
                <video
                  src={selectedMedia.url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Footer with info */}
            <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs sm:text-sm text-gray-600">
                {selectedMedia.type === 'IMAGE' ? 'Click the X button or outside to close' : 'Use player controls to play/pause and adjust volume'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
              Reject {actionType === 'content' ? 'Content' : 'Product'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
              Provide a reason for rejection. This will be sent to the seller.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Enter rejection reason..."
              className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 resize-none text-sm"
            />
            <div className="flex items-center gap-2 sm:gap-4 mt-3 sm:mt-4">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                className="flex-1 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitRejection}
                disabled={actionLoading}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {showVerificationModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-4 sm:p-6 my-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
              Verify Items Received
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Update the quantity received for each variant. Items that didn&apos;t pass will be recorded as discrepancies.
            </p>

            {/* Variant Verification Table */}
            <div className="space-y-3 mb-4 max-h-[50vh] overflow-y-auto">
              {variantVerifications.map((v, index) => {
                const hasIssue = v.received < v.expected || v.damaged > 0 || v.passed < v.expected;
                return (
                  <div 
                    key={v.variantId} 
                    className={`p-3 rounded-lg border ${hasIssue ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}
                  >
                    {/* Variant Info */}
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300" 
                        style={{ backgroundColor: selectedProduct.variants[index]?.colorHex || '#888' }}
                      />
                      <span className="font-medium text-gray-900 text-sm">
                        {v.color} • {v.size}
                      </span>
                      <span className="text-gray-500 text-xs">
                        Expected: {v.expected}
                      </span>
                    </div>

                    {/* Input Fields */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <label htmlFor={`received-${v.variantId}`} className="block text-gray-600 mb-1">Received</label>
                        <input
                          id={`received-${v.variantId}`}
                          type="number"
                          min="0"
                          max={v.expected}
                          value={v.received}
                          onChange={(e) => updateVariantVerification(v.variantId, 'received', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center text-gray-900"
                        />
                      </div>
                      <div>
                        <label htmlFor={`damaged-${v.variantId}`} className="block text-gray-600 mb-1">Damaged</label>
                        <input
                          id={`damaged-${v.variantId}`}
                          type="number"
                          min="0"
                          max={v.received}
                          value={v.damaged}
                          onChange={(e) => updateVariantVerification(v.variantId, 'damaged', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center text-gray-900"
                        />
                      </div>
                      <div>
                        <label htmlFor={`passed-${v.variantId}`} className="block text-gray-600 mb-1">Passed</label>
                        <input
                          id={`passed-${v.variantId}`}
                          type="number"
                          min="0"
                          max={v.received - v.damaged}
                          value={v.passed}
                          onChange={(e) => updateVariantVerification(v.variantId, 'passed', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-green-300 bg-green-50 rounded text-sm text-center font-medium text-green-700"
                        />
                      </div>
                    </div>

                    {/* Discrepancy Warning */}
                    {hasIssue && (
                      <div className="mt-2 text-xs text-orange-700 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {v.expected - v.received > 0 && <span>{v.expected - v.received} missing. </span>}
                        {v.damaged > 0 && <span>{v.damaged} damaged. </span>}
                        {v.passed < v.received - v.damaged && <span>{v.received - v.damaged - v.passed} failed verification.</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="bg-gray-100 rounded-lg p-3 mb-4 text-sm">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-gray-500 text-xs">Expected</p>
                  <p className="font-bold text-gray-900">{variantVerifications.reduce((s, v) => s + v.expected, 0)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Received</p>
                  <p className="font-bold text-blue-600">{variantVerifications.reduce((s, v) => s + v.received, 0)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Damaged</p>
                  <p className="font-bold text-red-600">{variantVerifications.reduce((s, v) => s + v.damaged, 0)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Passed</p>
                  <p className="font-bold text-green-600">{variantVerifications.reduce((s, v) => s + v.passed, 0)}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                rows={2}
                placeholder="Add notes about discrepancies, condition, etc..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none text-sm text-gray-900"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowVerificationModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              {variantVerifications.reduce((s, v) => s + v.passed, 0) < variantVerifications.reduce((s, v) => s + v.expected, 0) ? (
                <button
                  onClick={() => submitVerification(false)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  {actionLoading ? 'Saving...' : 'Record Discrepancy'}
                </button>
              ) : (
                <button
                  onClick={() => submitVerification(true)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  {actionLoading ? 'Saving...' : 'Pass Verification'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
