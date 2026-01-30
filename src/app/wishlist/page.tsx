'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Heart, Loader2, ShoppingBag, ArrowLeft, Trash2, Download } from 'lucide-react';

interface DesignItem {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  thumbnailUrl: string | null;
  category: string;
  designer: {
    id: string;
    name: string | null;
    displayName: string | null;
  };
}

export default function WishlistPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [wishlist, setWishlist] = useState<DesignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/wishlist');
    } else if (authStatus === 'authenticated') {
      fetchWishlist();
    }
  }, [authStatus, router]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wishlist');
      if (response.ok) {
        const data = await response.json();
        setWishlist(data.favorites || []);
      }
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
      toast.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (designId: string) => {
    setRemovingId(designId);
    try {
      const response = await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId }),
      });

      if (response.ok) {
        setWishlist(prev => prev.filter(item => item.id !== designId));
        toast.success('Removed from wishlist');
      }
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      toast.error('Failed to remove from wishlist');
    } finally {
      setRemovingId(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <button
            onClick={() => router.back()}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 fill-current" />
              My Wishlist
            </h1>
            <p className="text-[9px] sm:text-sm text-gray-600 mt-0.5">
              {wishlist.length} design{wishlist.length !== 1 ? 's' : ''} saved
            </p>
          </div>
        </div>

        {wishlist.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center">
            <Heart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No designs in your wishlist</h2>
            <p className="text-[9px] sm:text-sm text-gray-500 mb-4 sm:mb-6">
              Explore our designs and add your favorites to your wishlist
            </p>
            <Link
              href="/designs"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-indigo-700 transition text-[10px] sm:text-sm font-medium"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              Browse Designs
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {wishlist.map((design) => (
              <div key={design.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Image */}
                <Link href={`/designs/${design.id}`} className="block relative w-full h-40 sm:h-48 bg-gray-100 overflow-hidden group">
                  <Image
                    src={design.thumbnailUrl || design.imageUrl}
                    alt={design.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                </Link>

                {/* Content */}
                <div className="p-2.5 sm:p-3 flex flex-col">
                  <Link href={`/designs/${design.id}`} className="text-[10px] sm:text-sm font-medium text-gray-900 hover:text-indigo-600 line-clamp-2 mb-1">
                    {design.title}
                  </Link>
                  <p className="text-[8px] sm:text-xs text-gray-500 mb-2">
                    by {design.designer.displayName || design.designer.name || 'Designer'}
                  </p>
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-[10px] sm:text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">
                      {design.category}
                    </span>
                    <span className="font-semibold text-[11px] sm:text-sm text-gray-900">
                      {formatPrice(design.price)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 sm:gap-2">
                    <Link
                      href={`/designs/${design.id}`}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600 text-white rounded text-[9px] sm:text-xs font-medium hover:bg-indigo-700 transition"
                    >
                      <Download className="w-3 h-3" />
                      <span className="hidden sm:inline">View</span>
                    </Link>
                    <button
                      onClick={() => removeFromWishlist(design.id)}
                      disabled={removingId === design.id}
                      className="px-2 sm:px-3 py-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove from wishlist"
                    >
                      <Trash2 className={`w-3.5 h-3.5 ${removingId === design.id ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
