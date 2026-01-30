'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  CheckCircle,
  Info,
  ExternalLink,
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  basePrice: number;
  status: string;
  thumbnailUrl: string;
  category: {
    name: string;
  };
  variants: {
    id: string;
    size: string;
    color: string;
    quantity: number;
  }[];
}

interface Shipment {
  id: string;
  trackingNumber: string;
  courier: string;
  status: string;
  estimatedArrival: string;
  createdAt: string;
}

interface WarehouseAddress {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string[];
  notes: string;
}

const COURIERS = [
  { id: 'gig', name: 'GIG Logistics', website: 'https://giglogistics.com' },
  { id: 'dhl', name: 'DHL Express', website: 'https://www.dhl.com/ng' },
  { id: 'fedex', name: 'FedEx', website: 'https://www.fedex.com/ng' },
  { id: 'abc', name: 'ABC Cargo', website: '' },
  { id: 'peace_mass', name: 'Peace Mass Transit', website: '' },
  { id: 'young_shall_grow', name: 'Young Shall Grow Motors', website: '' },
  { id: 'other', name: 'Other', website: '' },
];

// Warehouse locations
const WAREHOUSE_LOCATIONS: WarehouseAddress[] = [
  {
    id: 'lagos',
    name: 'Fashion Boutique Warehouse - Lagos',
    address: '15 Victoria Island Plaza',
    city: 'Lagos',
    state: 'Lagos State',
    phone: ['+234 810 4912270', '0911 275 2160'],
    notes: 'Please include your Product ID on the package label',
  },
  {
    id: 'benin',
    name: 'Fashion Boutique Warehouse - Benin City',
    address: 'Sapele Road, Amagba, Limit Road',
    city: 'Benin City',
    state: 'Edo State',
    phone: ['+234 810 4912270', '0911 275 2160'],
    notes: 'Please include your Product ID on the package label',
  },
];

// Default warehouse
const DEFAULT_WAREHOUSE = WAREHOUSE_LOCATIONS[0];

export default function ShipProductPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [existingShipment, setExistingShipment] = useState<Shipment | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseAddress>(DEFAULT_WAREHOUSE);

  // Form state
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [shippingPaid, setShippingPaid] = useState(false);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (productId) {
      fetchProductAndShipment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const fetchProductAndShipment = async () => {
    try {
      setLoading(true);
      
      // First check if seller has return address
      const settingsRes = await fetch('/api/seller/boutique/settings');
      const settingsData = await settingsRes.json();
      
      if (!settingsData.returnAddress) {
        setError('⚠️ Please add your return address in Settings before shipping. This is required so we can return rejected products to you.');
      }
      
      // Fetch product
      const productRes = await fetch(`/api/boutique/products/${productId}`);
      const productData = await productRes.json();
      
      if (!productData.success) {
        setError('Product not found');
        return;
      }
      
      setProduct(productData.product);

      // Fetch existing shipment if any
      const shipmentRes = await fetch(`/api/boutique/products/${productId}/shipment`);
      const shipmentData = await shipmentRes.json();
      
      if (shipmentData.success && shipmentData.shipment) {
        setExistingShipment(shipmentData.shipment);
        setCourier(shipmentData.shipment.courier);
        setTrackingNumber(shipmentData.shipment.trackingNumber);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load product information');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    const fullAddress = `${selectedWarehouse.name}\n${selectedWarehouse.address}\n${selectedWarehouse.city}, ${selectedWarehouse.state}\nPhone: ${selectedWarehouse.phone.join(', ')}\nRef: Product #${productId}`;
    navigator.clipboard.writeText(fullAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!courier) {
      setError('Please select a courier');
      return;
    }
    if (!trackingNumber) {
      setError('Please enter the tracking number');
      return;
    }
    if (!shippingPaid) {
      setError('Please confirm shipping has been arranged');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/boutique/products/${productId}/shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingNumber,
          carrier: courier,
          estimatedArrival: estimatedArrival || null,
          shippingPaidMethod: 'PREPAID',
          itemsExpected: totalQuantity,
          sellerAddress: {
            street: 'Seller Address',
            city: 'Lagos',
            state: 'Lagos',
            country: 'Nigeria',
            postalCode: '',
          },
          warehouseAddress: {
            street: selectedWarehouse.address,
            city: selectedWarehouse.city,
            state: selectedWarehouse.state,
            country: 'Nigeria',
            postalCode: '',
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Shipment recorded successfully! Your product is on its way to our warehouse.');
        setTimeout(() => {
          router.push('/seller/boutique');
        }, 2000);
      } else {
        // Check if the error is about missing return address
        if (data.code === 'MISSING_RETURN_ADDRESS') {
          setError('You need to add a return address in your Settings before shipping. This is required so we can return rejected products to you.');
          // Don't navigate away - let user go to settings
        } else {
          setError(data.message || 'Failed to record shipment');
        }
      }
    } catch (err) {
      console.error('Error recording shipment:', err);
      setError('Failed to record shipment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Product Not Found</h2>
          <p className="text-gray-600 mt-2">{error}</p>
          <button
            onClick={() => router.push('/seller/boutique')}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Check if product is in valid state for shipping
  const canShip = product.status === 'CONTENT_APPROVED' || product.status === 'SHIPPED_TO_ADMIN';

  // Products that have already completed the shipping process
  const alreadyProcessed = ['RECEIVED_BY_ADMIN', 'VERIFICATION_PASSED', 'LIVE', 'SOLD'].includes(product.status);

  if (alreadyProcessed) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">Product Already at Warehouse</h2>
            <p className="text-gray-600 mt-2">
              This product has already been shipped and received at our warehouse.
              {product.status === 'LIVE' && ' It is now live and available for purchase!'}
              {product.status === 'SOLD' && ' It has been sold!'}
              {product.status === 'VERIFICATION_PASSED' && ' It passed verification and will be live soon.'}
              {product.status === 'RECEIVED_BY_ADMIN' && ' It is currently being verified.'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Current status: <span className="font-medium text-green-600">{product.status.replace(/_/g, ' ')}</span>
            </p>
            <div className="flex gap-3 justify-center mt-4">
              <button
                onClick={() => router.push('/seller/boutique')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => router.push('/seller/boutique/shipments')}
                className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50"
              >
                View Shipments
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!canShip) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">Cannot Ship Product</h2>
            <p className="text-gray-600 mt-2">
              {product.status === 'DRAFT' && 'Please submit this product for review before shipping.'}
              {product.status === 'PENDING_CONTENT_REVIEW' && 'This product is still under review. Please wait for approval.'}
              {product.status === 'REJECTED' && 'This product was rejected. Please fix the issues and resubmit.'}
              {product.status === 'CANCELLED' && 'This product has been cancelled.'}
              {!['DRAFT', 'PENDING_CONTENT_REVIEW', 'REJECTED', 'CANCELLED'].includes(product.status) && 
                'This product must be approved for content before shipping.'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Current status: <span className="font-medium">{product.status.replace(/_/g, ' ')}</span>
            </p>
            <button
              onClick={() => router.push('/seller/boutique')}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalQuantity = product.variants.reduce((sum, v) => sum + v.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-16 sm:pb-20">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => router.push('/seller/boutique')}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Go back to boutique"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-xl font-bold text-gray-900">Ship Your Product</h1>
            <p className="text-[10px] sm:text-sm text-gray-500">Send your product to our warehouse</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Product Summary */}
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 flex gap-3 sm:gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            {product.thumbnailUrl ? (
              <Image
                src={product.thumbnailUrl}
                alt={product.title}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{product.title}</h3>
            <p className="text-xs sm:text-sm text-gray-500">{product.category.name}</p>
            <div className="flex items-center gap-2 sm:gap-4 mt-1 sm:mt-2 text-xs sm:text-sm">
              <span className="text-purple-600 font-medium">
                ₦{product.basePrice.toLocaleString()}
              </span>
              <span className="text-gray-500">
                {totalQuantity} item{totalQuantity !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Deadline Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 flex items-start gap-2 sm:gap-3">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-800 text-xs sm:text-base">Ship within 7 days</h4>
            <p className="text-[10px] sm:text-sm text-yellow-700 mt-0.5 sm:mt-1">
              Please ship within 7 days to avoid delays.
            </p>
          </div>
        </div>

        {/* Existing Shipment */}
        {existingShipment && (
          <div className="bg-green-50 border border-green-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-start gap-2 sm:gap-3">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-green-800 text-xs sm:text-base">Shipment Recorded</h4>
                <div className="mt-1 sm:mt-2 text-[10px] sm:text-sm text-green-700 space-y-0.5 sm:space-y-1">
                  <p><strong>Courier:</strong> {existingShipment.courier}</p>
                  <p><strong>Tracking #:</strong> {existingShipment.trackingNumber}</p>
                  <p><strong>Status:</strong> {existingShipment.status}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warehouse Address */}
        <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              <h2 className="text-sm sm:text-lg font-bold text-gray-900">Warehouse Address</h2>
            </div>
            <button
              onClick={copyAddress}
              className="flex items-center gap-1 text-[10px] sm:text-sm text-purple-600 hover:text-purple-700"
            >
              {copiedAddress ? (
                <>
                  <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
          
          {/* Warehouse Selection */}
          {WAREHOUSE_LOCATIONS.length > 1 && (
            <div className="mb-3 sm:mb-4">
              <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-2">
                Select Warehouse Location
              </label>
              <div className="grid grid-cols-1 gap-2">
                {WAREHOUSE_LOCATIONS.map(warehouse => (
                  <button
                    key={warehouse.id}
                    onClick={() => setSelectedWarehouse(warehouse)}
                    className={`p-3 text-left rounded-lg border-2 transition-all ${
                      selectedWarehouse.id === warehouse.id
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <p className="font-medium text-xs sm:text-sm text-gray-900">{warehouse.name}</p>
                    <p className="text-[10px] sm:text-xs text-gray-600">{warehouse.address}, {warehouse.city}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedWarehouse.name}</p>
            <p className="text-gray-700 text-xs sm:text-sm">{selectedWarehouse.address}</p>
            <p className="text-gray-700 text-xs sm:text-sm">{selectedWarehouse.city}, {selectedWarehouse.state}</p>
            <p className="text-gray-700 text-xs sm:text-sm">Phone: {selectedWarehouse.phone.join(', ')}</p>
            <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
              <p className="text-[10px] sm:text-sm text-purple-700 flex items-center gap-1.5 sm:gap-2">
                <Info className="w-3 h-3 sm:w-4 sm:h-4" />
                <strong>Ref:</strong> #{productId.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          
          <p className="text-[10px] sm:text-sm text-gray-500 mt-2 sm:mt-3">
            📦 Write the Reference on your package
          </p>
        </div>

        {/* Shipping Form */}
        {!existingShipment && (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-sm sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              Shipping Details
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
                <p className="text-red-700 text-xs sm:text-sm">{error}</p>
                {error.includes('return address') && (
                  <button
                    type="button"
                    onClick={() => router.push('/seller/boutique/settings')}
                    className="mt-2 inline-block px-3 py-1 bg-red-600 text-white text-xs sm:text-sm rounded hover:bg-red-700"
                  >
                    Go to Settings →
                  </button>
                )}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4 text-green-700 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                {success}
              </div>
            )}

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">
                  Courier <span className="text-red-500">*</span>
                </label>
                <select
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm text-black"
                  aria-label="Select courier"
                >
                  <option value="">Select courier</option>
                  {COURIERS.map(c => (
                    <option key={c.id} value={c.id} className="text-black">{c.name}</option>
                  ))}
                </select>
                {courier && COURIERS.find(c => c.id === courier)?.website && (
                  <a
                    href={COURIERS.find(c => c.id === courier)?.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] sm:text-sm text-purple-600 mt-1 hover:underline"
                  >
                    Visit website <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </a>
                )}
              </div>

              <div>
                <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">
                  Tracking Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g., GIG123456789"
                  className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm text-black"
                />
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  Get this from your courier
                </p>
              </div>

              <div>
                <label htmlFor="estimatedArrival" className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">
                  Est. Arrival (optional)
                </label>
                <input
                  id="estimatedArrival"
                  type="date"
                  value={estimatedArrival}
                  onChange={(e) => setEstimatedArrival(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm text-black"
                />
              </div>

              <div className="pt-3 sm:pt-4 border-t">
                <label className="flex items-start gap-2 sm:gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shippingPaid}
                    onChange={(e) => setShippingPaid(e.target.checked)}
                    className="mt-0.5 sm:mt-1 w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900 text-xs sm:text-base">
                      I confirm shipping is arranged and paid
                    </span>
                    <p className="text-[10px] sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                      Shipping costs are your responsibility.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 sm:mt-6 py-2.5 sm:py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-300 flex items-center justify-center gap-1.5 sm:gap-2 text-sm"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                  Recording...
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
                  Record Shipment
                </>
              )}
            </button>
          </form>
        )}

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
          <h3 className="font-semibold text-blue-800 mb-1.5 sm:mb-2 text-xs sm:text-base">📦 Packaging Tips</h3>
          <ul className="text-[10px] sm:text-sm text-blue-700 space-y-1 sm:space-y-2">
            <li>• Use sturdy packaging to protect your item</li>
            <li>• Include Reference ID inside and outside</li>
            <li>• Take photos before shipping</li>
            <li>• Keep courier receipt as proof</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
