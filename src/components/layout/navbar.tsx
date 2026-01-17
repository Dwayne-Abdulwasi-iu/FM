"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Search, Menu, Upload, Shield, Trophy, MessageSquare, Palette, ChevronDown, LayoutDashboard, Download, Package, Heart, Settings, Receipt } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { NotificationBell } from "./NotificationBell";
import { useLanguage } from "@/contexts/LanguageContext";

export function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  const [cartCount, setCartCount] = useState(0);
  const [boutiqueCartCount, setBoutiqueCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [communityDropdownOpen, setCommunityDropdownOpen] = useState(false);

  useEffect(() => {
    if (session) {
      fetchCartCount();
      fetchBoutiqueCartCount();
      
      // Retry cart count fetch after a delay if it initially fails
      const retryTimer = setTimeout(() => {
        fetchCartCount();
        fetchBoutiqueCartCount();
      }, 2000);
      
      return () => clearTimeout(retryTimer);
    }
    
    // Listen for cart updates
    const handleCartUpdate = () => {
      if (session) {
        fetchCartCount();
      }
    };
    
    const handleBoutiqueCartUpdate = () => {
      if (session) {
        fetchBoutiqueCartCount();
      }
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('boutiqueCartUpdated', handleBoutiqueCartUpdate);
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('boutiqueCartUpdated', handleBoutiqueCartUpdate);
    };
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

  const fetchBoutiqueCartCount = async () => {
    try {
      const response = await fetch('/api/boutique/cart');
      if (response.ok) {
        const data = await response.json();
        setBoutiqueCartCount(data.cart?.items?.length || 0);
      }
    } catch (error) {
      void error;
      setBoutiqueCartCount(0);
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
                placeholder={t('common.search') + '...'}
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
            {/* Direct Designs Link */}
            <Link
              href="/designs"
              className="text-gray-800 hover:text-indigo-700 font-medium flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              {t('nav.designs')}
            </Link>
            
            {/* Direct Boutique Link - Prominent */}
            <Link
              href="/boutique"
              className="text-gray-800 hover:text-purple-700 font-medium flex items-center gap-1.5"
            >
              <Package className="w-4 h-4" />
              {t('nav.boutique') || 'Boutique'}
            </Link>
            {/* Community Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setCommunityDropdownOpen(true)}
              onMouseLeave={() => setCommunityDropdownOpen(false)}
            >
              <button
                onClick={() => setCommunityDropdownOpen(!communityDropdownOpen)}
                className="text-gray-800 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                Community
                <ChevronDown className={`w-4 h-4 transition-transform ${communityDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {communityDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
                  <Link
                    href="/contests"
                    onClick={() => setCommunityDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <Trophy className="w-4 h-4" />
                    Contests
                  </Link>
                  <Link
                    href="/forum"
                    onClick={() => setCommunityDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Forum
                  </Link>
                  <Link
                    href="/commissions"
                    onClick={() => setCommunityDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <Palette className="w-4 h-4" />
                    Commissions
                  </Link>
                  <Link
                    href="/designers"
                    onClick={() => setCommunityDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <User className="w-4 h-4" />
                    Designers
                  </Link>
                </div>
              )}
            </div>
            <Link href="/contact" className="text-gray-800 hover:text-indigo-700 font-medium">
              {t('nav.contact')}
            </Link>
            {session && (
              <>
                <Link href="/seller/dashboard" className="text-gray-800 hover:text-indigo-700 flex items-center gap-1 font-medium">
                  <LayoutDashboard className="w-4 h-4" />
                  {t('nav.dashboard')}
                </Link>
                <Link href="/upload" className="text-gray-800 hover:text-indigo-700 flex items-center gap-1 font-medium">
                  <Upload className="w-4 h-4" />
                  {t('nav.upload') || 'Upload'}
                </Link>
              </>
            )}
            {session && <NotificationBell />}
            {/* Digital Cart */}
            <Link href="/cart" className="text-indigo-700 hover:text-indigo-800 relative" title="Digital Downloads Cart">
              <Download className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-indigo-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            {/* Boutique Cart */}
            <Link href="/boutique/cart" className="text-purple-700 hover:text-purple-800 relative" title="Physical Items Cart">
              <Package className="w-5 h-5" />
              {boutiqueCartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-purple-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {boutiqueCartCount}
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
                  {t('nav.signOut')}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => signIn()}
                className="bg-indigo-700 text-white px-4 py-2 rounded-lg hover:bg-indigo-800 font-medium"
              >
                {t('nav.signIn')}
              </button>
            )}
          </div>

          {/* Mobile Menu */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100" 
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu Content */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-2 border-t border-gray-200">
            <div className="space-y-1 py-2">
              {/* Shop Section */}
              <div className="border-b border-gray-100 pb-2 mb-2">
                <span className="px-3 text-[10px] font-semibold text-gray-400 uppercase">Shop</span>
                <Link 
                  href="/designs" 
                  className="block px-3 py-2 text-xs text-gray-800 hover:bg-indigo-50 rounded-lg flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="p-1 bg-indigo-100 rounded">
                    <Download className="w-3 h-3 text-indigo-700" />
                  </div>
                  <span>Digital Designs</span>
                  <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded ml-auto">INSTANT</span>
                </Link>
                <Link 
                  href="/boutique" 
                  className="block px-3 py-2 text-xs text-gray-800 hover:bg-purple-50 rounded-lg flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="p-1 bg-purple-100 rounded">
                    <Package className="w-3 h-3 text-purple-700" />
                  </div>
                  <span>Physical Boutique</span>
                  <span className="text-[9px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded ml-auto">SHIPPED</span>
                </Link>
              </div>
              <Link 
                href="/contact" 
                className="block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </Link>
              {/* Community Links */}
              <div className="border-t border-gray-100 my-2 pt-2">
                <span className="px-3 text-[10px] font-semibold text-gray-400 uppercase">Community</span>
                <Link 
                  href="/contests" 
                  className="block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Trophy className="w-3 h-3" />
                  Contests
                </Link>
                <Link 
                  href="/forum" 
                  className="block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <MessageSquare className="w-3 h-3" />
                  Forum
                </Link>
                <Link 
                  href="/commissions" 
                  className="block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Palette className="w-3 h-3" />
                  Commissions
                </Link>
                <Link 
                  href="/designers" 
                  className="block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-3 h-3" />
                  Designers
                </Link>
              </div>
              {session && (
                <>
                  <Link 
                    href="/seller/dashboard" 
                    className="block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="w-3 h-3" />
                    Seller Dashboard
                  </Link>
                  <Link 
                    href="/upload" 
                    className="block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Upload className="w-3 h-3" />
                    Upload
                  </Link>
                </>
              )}
              <Link 
                href="/cart" 
                className="block px-3 py-1.5 text-xs text-gray-800 hover:bg-indigo-50 rounded-lg flex items-center justify-between"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="flex items-center gap-2">
                  <Download className="w-3 h-3 text-indigo-700" />
                  Digital Cart
                </span>
                {cartCount > 0 && (
                  <span className="bg-indigo-700 text-white text-[10px] rounded-full px-1.5 py-0.5">
                    {cartCount}
                  </span>
                )}
              </Link>
              <Link 
                href="/boutique/cart" 
                className="block px-3 py-1.5 text-xs text-gray-800 hover:bg-purple-50 rounded-lg flex items-center justify-between"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="flex items-center gap-2">
                  <Package className="w-3 h-3 text-purple-700" />
                  Boutique Cart
                </span>
                {boutiqueCartCount > 0 && (
                  <span className="bg-purple-700 text-white text-[10px] rounded-full px-1.5 py-0.5">
                    {boutiqueCartCount}
                  </span>
                )}
              </Link>
              {session ? (
                <>
                  {session.user?.role === 'ADMIN' && (
                    <Link 
                      href="/admin" 
                      className="block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Shield className="w-3 h-3" />
                      Admin Dashboard
                    </Link>
                  )}
                  <Link 
                    href="/boutique/favorites" 
                    className="block px-3 py-1.5 text-xs text-gray-800 hover:bg-pink-50 rounded-lg flex items-center gap-1.5"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Heart className="w-3 h-3 text-pink-600" />
                    My Favorites
                  </Link>
                  <Link 
                    href="/orders" 
                    className="block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Receipt className="w-3 h-3" />
                    My Orders
                  </Link>
                  <Link 
                    href="/profile" 
                    className="block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-3 h-3" />
                    Profile
                  </Link>
                  <Link 
                    href="/profile/settings" 
                    className="block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="w-3 h-3" />
                    Settings
                  </Link>
                  <button 
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg font-medium"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => {
                    signIn();
                    setMobileMenuOpen(false);
                  }}
                  className="w-11/12 mx-auto block bg-indigo-700 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-800 font-medium text-xs text-center"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}