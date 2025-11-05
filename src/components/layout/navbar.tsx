"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, User, Search, Menu, Upload, Shield, Heart } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import SafeImage from '@/components/ui/safe-image'
import { toast } from 'react-hot-toast'

export function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false)
  const [wishlistItems, setWishlistItems] = useState<Array<{ id: string; title: string; imageUrl: string; price: number }>>([])

  // Lock body scroll when mobile menu is open to avoid layout shift and blank space
  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  useEffect(() => {
    if (session) {
      fetchCartCount();
      
      // Retry cart count fetch after a delay if it initially fails
      const retryTimer = setTimeout(() => {
        fetchCartCount();
      }, 2000);
      
      return () => clearTimeout(retryTimer);
    }
    
    // Listen for cart updates
    const handleCartUpdate = () => {
      if (session) {
        fetchCartCount();
      }
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [session]);

  useEffect(() => {
    // load wishlist for flyout
    const load = async () => {
      try {
        if (session?.user?.id) {
          const res = await fetch('/api/favorites')
          if (res.ok) {
            const data = await res.json()
            setWishlistItems((data.items || []).slice(0,5))
          }
        } else {
          const raw = typeof window !== 'undefined' ? localStorage.getItem('wishlist') : null
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) setWishlistItems(parsed.slice(0,5))
          }
        }
      } catch {
          // ignore
        }
    }
    load()

    const onUpdate = () => load()
    window.addEventListener('wishlistUpdated', onUpdate)
    return () => window.removeEventListener('wishlistUpdated', onUpdate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  const fetchCartCount = async () => {
    // In non-browser/test environments, skip attempting to fetch
    if (typeof fetch === 'undefined') {
      setCartCount(0);
      return;
    }
    try {
      const response = await fetch('/api/cart');
      if (response.ok) {
        const data = await response.json();
        setCartCount(data.count || 0);
      } else {
        // Silently fail on initial load - cart count will remain 0
        if (process.env.NODE_ENV === 'development') {
          console.log('Cart API not ready yet, skipping cart count fetch');
        }
      }
    } catch (error) {
      // Silently handle network errors during development
      if (process.env.NODE_ENV === 'development') {
        console.log('Cart fetch failed (normal during development):', error instanceof Error ? error.message : 'Unknown error');
      }
      setCartCount(0);
    }
  };

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const searchParams = new URLSearchParams({ q: searchQuery.trim() });
    router.push(`/search?${searchParams.toString()}`);
    setIsSearching(false);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      setIsSearching(true);
      const searchParams = new URLSearchParams({ q: searchQuery.trim() });
      router.push(`/search?${searchParams.toString()}`);
      setIsSearching(false);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FM</span>
            </div>
            <span className="font-bold text-xl text-gray-900">Fashion Marketplace</span>
          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                placeholder="Search designs..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                disabled={isSearching}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </form>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/designs" className="text-gray-800 hover:text-indigo-700 font-medium">
              Browse
            </Link>
            <Link href="/contact" className="text-gray-800 hover:text-indigo-700 font-medium">
              Contact
            </Link>
            {session && (
              <Link href="/upload" className="text-gray-800 hover:text-indigo-700 flex items-center gap-1 font-medium">
                <Upload className="w-4 h-4" />
                Upload
              </Link>
            )}
            <Link href="/cart" className="text-gray-800 hover:text-indigo-700 relative">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-indigo-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            {/* Wishlist flyout trigger */}
            <div className="relative">
              <button
                onClick={() => setWishlistOpen(v => !v)}
                className="ml-4 text-gray-800 hover:text-indigo-700 relative"
                aria-expanded={wishlistOpen ? 'true' : 'false'}
                aria-label="Open wishlist"
              >
                <Heart className="w-5 h-5" />
              </button>

              {wishlistOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded shadow-lg z-50">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Your wishlist</h4>
                      <Link href="/wishlist" className="text-sm text-indigo-600">View all</Link>
                    </div>
                    {wishlistItems.length === 0 ? (
                      <div className="text-sm text-gray-500">No favorites yet.</div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-auto">
                        {wishlistItems.map((w) => (
                          <div key={w.id} className="flex items-center justify-between gap-3">
                            <Link href={`/designs/${w.id}`} className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded overflow-hidden border border-gray-200 bg-gray-100">
                                <SafeImage src={w.imageUrl} alt={w.title} className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{w.title}</div>
                              </div>
                            </Link>
                            <div className="flex items-center gap-2">
                              <div className="text-sm text-gray-700">${w.price?.toFixed(2)}</div>
                              <button
                                onClick={async (e) => {
                                  e.preventDefault()
                                  try {
                                    const res = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ designId: w.id, quantity: 1, purchaseType: 'REGULAR' }) })
                                    if (res.ok) {
                                      window.dispatchEvent(new Event('cartUpdated'))
                                      // remove from favorites
                                      if (session?.user?.id) await fetch(`/api/favorites?designId=${w.id}`, { method: 'DELETE' })
                                      else {
                                        const raw = localStorage.getItem('wishlist')
                                        if (raw) {
                                          const parsed = JSON.parse(raw)
                                          const updated = parsed.filter((p: { id: string }) => p.id !== w.id)
                                          localStorage.setItem('wishlist', JSON.stringify(updated))
                                          window.dispatchEvent(new Event('wishlistUpdated'))
                                        }
                                      }
                                      toast.success('Added to cart')
                                    } else {
                                      toast.error('Failed to add to cart')
                                    }
                                  } catch {
                                    toast.error('Failed to add to cart')
                                  }
                                }}
                                className="px-2 py-1 bg-indigo-600 text-white text-xs rounded"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {session ? (
              <div className="flex items-center space-x-4">
                {session.user?.role === 'ADMIN' && (
                  <Link href="/admin" className="text-gray-800 hover:text-indigo-700 flex items-center gap-1" title="Admin Dashboard">
                    <Shield className="w-4 h-4" />
                  </Link>
                )}
                <Link href="/profile" className="text-gray-800 hover:text-indigo-700">
                  <User className="w-5 h-5" />
                </Link>
                <button 
                  onClick={() => signOut()}
                  className="text-gray-800 hover:text-indigo-700 text-sm font-medium"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button 
                onClick={() => signIn()}
                className="bg-indigo-700 text-white px-4 py-2 rounded-lg hover:bg-indigo-800 font-medium"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 rounded hover:bg-gray-100"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileOpen && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="fixed inset-0 bg-black/10 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div
            id="mobile-menu"
            // Make the mobile panel fixed so it doesn't push page content and cause layout shift
            className="md:hidden z-50 fixed inset-x-0 top-16 bg-white border-t border-gray-200 shadow-sm"
          >
            <div className="px-4 py-4 space-y-4">
              {/* Search (mobile) */}
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search designs..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                  disabled={isSearching}
                />
              </form>

              <div className="grid grid-cols-1 gap-2">
                <Link href="/designs" onClick={() => setMobileOpen(false)} className="w-full text-left px-4 py-2 rounded-lg border hover:bg-gray-50 text-gray-800 font-medium">
                  Browse
                </Link>
                <Link href="/contact" onClick={() => setMobileOpen(false)} className="w-full text-left px-4 py-2 rounded-lg border hover:bg-gray-50 text-gray-800 font-medium">
                  Contact
                </Link>
                {session && (
                  <Link href="/upload" onClick={() => setMobileOpen(false)} className="w-full text-left px-4 py-2 rounded-lg border hover:bg-gray-50 text-gray-800 font-medium inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Upload
                  </Link>
                )}
                <Link href="/cart" onClick={() => setMobileOpen(false)} className="w-full text-left px-4 py-2 rounded-lg border hover:bg-gray-50 text-gray-800 font-medium inline-flex items-center gap-2 relative">
                  <ShoppingBag className="w-4 h-4" />
                  Cart
                  {cartCount > 0 && (
                    <span className="ml-auto bg-indigo-700 text-white text-xs rounded-full px-2 py-0.5">
                      {cartCount}
                    </span>
                  )}
                </Link>
                {session ? (
                  <>
                    {session.user?.role === 'ADMIN' && (
                      <Link href="/admin" onClick={() => setMobileOpen(false)} className="w-full text-left px-4 py-2 rounded-lg border hover:bg-gray-50 text-gray-800 font-medium inline-flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Admin
                      </Link>
                    )}
                    <Link href="/profile" onClick={() => setMobileOpen(false)} className="w-full text-left px-4 py-2 rounded-lg border hover:bg-gray-50 text-gray-800 font-medium">
                      Profile
                    </Link>
                    <button
                      onClick={() => { setMobileOpen(false); signOut(); }}
                      className="w-full text-left px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black font-medium"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setMobileOpen(false); signIn(); }}
                    className="w-full text-left px-4 py-2 rounded-lg bg-indigo-700 text-white hover:bg-indigo-800 font-medium"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}

// (scroll lock handled in the component)