"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, User, Search, Menu, Upload, Shield } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

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

  const fetchCartCount = async () => {
    try {
      const response = await fetch('/api/cart');
      if (response.ok) {
        const data = await response.json();
        setCartCount(data.count || 0);
      } else {
        // Silently fail on initial load - cart count will remain 0
        // Use debug-level logging and avoid noise during test runs.
        if (process.env.NODE_ENV !== 'test') {
          console.debug('Cart API not ready yet, skipping cart count fetch')
        }
      }
    } catch (error) {
      // Silently handle network errors during development. Use debug logging
      // and avoid emitting during test runs.
      void error;
      if (process.env.NODE_ENV !== 'test') {
        console.debug('Cart fetch failed (normal during development):', error instanceof Error ? error.message : 'Unknown error')
      }
      setCartCount(0)
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const searchParams = new URLSearchParams({ q: searchQuery.trim() });
    router.push(`/search?${searchParams.toString()}`);
    setIsSearching(false);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!searchQuery.trim()) return
      setIsSearching(true)
      const searchParams = new URLSearchParams({ q: searchQuery.trim() })
      router.push(`/search?${searchParams.toString()}`)
      setIsSearching(false)
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

          {/* Mobile Menu */}
          <button className="md:hidden" aria-label="Open menu">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </nav>
  );
}