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
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
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

// This would come from admin settings in production
const WAREHOUSE_ADDRESS: WarehouseAddress = {
  name: 'Fashion Boutique Warehouse',
  address: '15 Victoria Island Plaza',
  city: 'Lagos',
  state: 'Lagos State',
  phone: '+234 800 FASHION',
  notes: 'Please include your Product ID on the package label',
};

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
  }, [productId]);

  const fetchProductAndShipment = async () => {
    try {
      setLoading(true);
      
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
    const fullAddress = `${WAREHOUSE_ADDRESS.name}\n${WAREHOUSE_ADDRESS.address}\n${WAREHOUSE_ADDRESS.city}, ${WAREHOUSE_ADDRESS.state}\nPhone: ${WAREHOUSE_ADDRESS.phone}\nRef: Product #${productId}`;
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
          courier,
          trackingNumber,
          estimatedArrival: estimatedArrival || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Shipment recorded successfully! Your product is on its way to our warehouse.');
        setTimeout(() => {
          router.push('/seller/boutique');
        }, 2000);
      } else {
        setError(data.message || 'Failed to record shipment');
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

  if (!canShip) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">Cannot Ship Product</h2>
            <p className="text-gray-600 mt-2">
              This product must be approved for content before shipping.
              Current status: <span className="font-medium">{product.status}</span>
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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/seller/boutique')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ship Your Product</h1>
            <p className="text-sm text-gray-500">Send your product to our warehouse</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Product Summary */}
        <div className="bg-white rounded-xl p-4 mb-6 flex gap-4">
          <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
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
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{product.title}</h3>
            <p className="text-sm text-gray-500">{product.category.name}</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-purple-600 font-medium">
                ₦{product.basePrice.toLocaleString()}
              </span>
              <span className="text-gray-500">
                {totalQuantity} item{totalQuantity !== 1 ? 's' : ''} to ship
              </span>
            </div>
          </div>
        </div>

        {/* Deadline Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-800">Ship within 7 days</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Your product was approved for shipping. Please ship within 7 days to avoid
              delays in getting your listing live.
            </p>
          </div>
        </div>

        {/* Existing Shipment */}
        {existingShipment && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-green-800">Shipment Recorded</h4>
                <div className="mt-2 text-sm text-green-700 space-y-1">
                  <p><strong>Courier:</strong> {existingShipment.courier}</p>
                  <p><strong>Tracking #:</strong> {existingShipment.trackingNumber}</p>
                  <p><strong>Status:</strong> {existingShipment.status}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warehouse Address */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold text-gray-900">Warehouse Address</h2>
            </div>
            <button
              onClick={copyAddress}
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
            >
              {copiedAddress ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Address
                </>
              )}
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-semibold text-gray-900">{WAREHOUSE_ADDRESS.name}</p>
            <p className="text-gray-700">{WAREHOUSE_ADDRESS.address}</p>
            <p className="text-gray-700">{WAREHOUSE_ADDRESS.city}, {WAREHOUSE_ADDRESS.state}</p>
            <p className="text-gray-700">Phone: {WAREHOUSE_ADDRESS.phone}</p>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-purple-700 flex items-center gap-2">
                <Info className="w-4 h-4" />
                <strong>Product Reference:</strong> #{productId.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mt-3">
            📦 Please write the Product Reference on your package clearly
          </p>
        </div>

        {/* Shipping Form */}
        {!existingShipment && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-purple-600" />
              Shipping Details
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {success}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Courier / Shipping Company <span className="text-red-500">*</span>
                </label>
                <select
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select courier</option>
                  {COURIERS.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {courier && COURIERS.find(c => c.id === courier)?.website && (
                  <a
                    href={COURIERS.find(c => c.id === courier)?.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-purple-600 mt-1 hover:underline"
                  >
                    Visit courier website <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tracking Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g., GIG123456789"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get this from your courier after booking the shipment
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Arrival Date (optional)
                </label>
                <input
                  type="date"
                  value={estimatedArrival}
                  onChange={(e) => setEstimatedArrival(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-4 border-t">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shippingPaid}
                    onChange={(e) => setShippingPaid(e.target.checked)}
                    className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">
                      I confirm I have arranged and paid for shipping
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      Shipping costs are your responsibility. The item will be verified upon arrival.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Recording Shipment...
                </>
              ) : (
                <>
                  <Truck className="w-5 h-5" />
                  Record Shipment
                </>
              )}
            </button>
          </form>
        )}

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-800 mb-2">📦 Packaging Tips</h3>
          <ul className="text-sm text-blue-700 space-y-2">
            <li>• Use sturdy packaging to protect your item during transit</li>
            <li>• Include the Product Reference ID inside and outside the package</li>
            <li>• Take photos of the packaged item before shipping</li>
            <li>• Keep your courier receipt as proof of shipping</li>
            <li>• Consider insurance for high-value items</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
