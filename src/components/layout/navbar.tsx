"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Search, Menu, Upload, Shield, Trophy, MessageSquare, Palette, ChevronDown, LayoutDashboard, Download, Package, Heart, Settings, Receipt, ShoppingBag } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { NotificationBell } from "./NotificationBell";
import { useLanguage } from "@/contexts/LanguageContext";
import Image from 'next/image';
import logo from '/public/logo.png';

export function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  const [cartCount, setCartCount] = useState(0);
  const [boutiqueCartCount, setBoutiqueCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <div className="w-full max-w-full mx-auto px-1 sm:px-2 lg:px-6">
        <div className="flex justify-between items-center h-12 sm:h-14 lg:h-16 gap-0.5 lg:gap-1">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            <div className="w-7 h-7 sm:w-8 lg:w-8 bg-indigo-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs sm:text-sm lg:text-sm">FM</span>
            </div>
            <span className="font-bold text-xs sm:text-sm lg:text-base text-gray-900 hidden lg:inline">FM</span>
          </Link>

          {/* Search Bar */}
          <div className="hidden sm:flex md:flex flex-1 min-w-[120px] mx-1 lg:mx-2">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 lg:w-3.5 lg:h-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                placeholder={t('common.search') + '...'}
                className="w-full pl-8 lg:pl-9 pr-2 lg:pr-3 py-1 lg:py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 placeholder-gray-500 text-xs lg:text-sm"
                disabled={isSearching}
              />
              {isSearching && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin h-3 w-3 lg:h-3.5 lg:w-3.5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </form>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-0 lg:gap-1 flex-nowrap justify-end flex-1">
            {/* Direct Designs Link */}
            <Link
              href="/designs"
              className="text-xs lg:text-sm text-gray-800 hover:text-indigo-700 font-medium flex items-center gap-0.5 lg:gap-1 whitespace-nowrap px-0.5 py-1"
            >
              <Download className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span className="hidden lg:inline">{t('nav.designs')}</span>
            </Link>
            
            {/* Direct Boutique Link - Prominent */}
            <Link
              href="/boutique"
              className="text-xs lg:text-sm text-gray-800 hover:text-purple-700 font-medium flex items-center gap-0.5 lg:gap-1 whitespace-nowrap px-0.5 py-1"
            >
              <Package className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span className="hidden lg:inline">{t('nav.boutique') || 'Boutique'}</span>
            </Link>
            <Link href="/contact" className="text-xs lg:text-sm text-gray-800 hover:text-indigo-700 font-medium whitespace-nowrap hidden lg:inline px-0.5 py-1">
              {t('nav.contact')}
            </Link>
            
            {/* Community & Help Dropdown */}
            <div 
              className="relative group"
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
            >
              <button className="text-xs lg:text-sm text-gray-800 hover:text-indigo-700 font-medium flex items-center gap-0.5 lg:gap-1 whitespace-nowrap px-0.5 py-1">
                <MessageSquare className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <span className="hidden lg:inline">Help</span>
                <ChevronDown className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </button>
              <div className="absolute left-0 mt-2 w-48 bg-black rounded-lg shadow-lg border border-gray-800 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <Link
                  href="/contests"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-gray-800 hover:text-indigo-300"
                >
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  Contests
                </Link>
                <Link
                  href="/forum"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-gray-800 hover:text-blue-300"
                >
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  Forum
                </Link>
                <Link
                  href="/commissions"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-gray-800 hover:text-purple-300"
                >
                  <Palette className="w-4 h-4 text-purple-400" />
                  Commissions
                </Link>
                <Link
                  href="/designers"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-gray-800 hover:text-green-300"
                >
                  <User className="w-4 h-4 text-green-400" />
                  Designers
                </Link>
                <div className="border-t border-gray-700 my-2"></div>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-gray-800 hover:text-pink-300"
                >
                  <MessageSquare className="w-4 h-4 text-pink-400" />
                  Contact
                </Link>
              </div>
            </div>
            
            {session && (
              <>
                <Link href="/upload" className="text-xs lg:text-sm text-gray-800 hover:text-indigo-700 flex items-center gap-0.5 lg:gap-1 font-medium whitespace-nowrap px-0.5 py-1">
                  <Upload className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  <span className="hidden lg:inline">{t('nav.upload') || 'Upload'}</span>
                </Link>
              </>
            )}
            
            {/* Dashboard Dropdown for Sellers/Admins */}
            {session && (
              <div 
                className="relative group"
                onMouseEnter={() => {}}
                onMouseLeave={() => {}}
              >
                <button className="text-xs lg:text-sm text-gray-800 hover:text-indigo-700 font-medium flex items-center gap-0.5 lg:gap-1 whitespace-nowrap px-0.5 py-1">
                  <LayoutDashboard className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  <span className="hidden lg:inline">Dashboard</span>
                  <ChevronDown className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                </button>
                <div className="absolute left-0 mt-2 w-48 bg-black rounded-lg shadow-lg border border-gray-800 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <Link
                    href="/seller/dashboard"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-gray-800 hover:text-indigo-300"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Seller Dashboard
                  </Link>
                  {session.user?.role === 'ADMIN' && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-gray-800 hover:text-purple-300"
                    >
                      <Shield className="w-4 h-4" />
                      Admin Dashboard
                    </Link>
                  )}
                </div>
              </div>
            )}
            {session && <NotificationBell />}
            {/* User Links Dropdown */}
            {session && (
              <div 
                className="relative group"
                onMouseEnter={() => {}}
                onMouseLeave={() => {}}
              >
                <button className="text-xs lg:text-sm text-gray-800 hover:text-indigo-700 font-medium flex items-center gap-0.5 lg:gap-1 whitespace-nowrap px-0.5 py-1">
                  <Heart className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  <span className="hidden lg:inline">Saved</span>
                  <ChevronDown className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                </button>
                <div className="absolute right-0 mt-2 w-40 bg-black rounded-lg shadow-lg border border-gray-800 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <Link 
                    href="/wishlist"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-gray-800 hover:text-red-300"
                  >
                    <Heart className="w-4 h-4 text-red-500" />
                    Design Wishlist
                  </Link>
                  <Link 
                    href="/boutique/favorites"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-gray-800 hover:text-pink-300"
                  >
                    <Heart className="w-4 h-4 text-pink-500" />
                    Favorites
                  </Link>
                  <Link 
                    href="/orders"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-gray-800 hover:text-indigo-300"
                  >
                    <Receipt className="w-4 h-4" />
                    My Orders
                  </Link>
                </div>
              </div>
            )}
            
            {/* Carts Dropdown */}
            <div 
              className="relative group"
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
            >
              <button className="text-gray-800 hover:text-indigo-700 font-medium flex items-center gap-0.5 lg:gap-1 text-xs lg:text-sm relative px-0.5 py-1">
                <ShoppingBag className="w-4 h-4 lg:w-5 lg:h-5" />
                {(cartCount > 0 || boutiqueCartCount > 0) && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] lg:text-xs rounded-full w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center font-bold">
                    {cartCount + boutiqueCartCount}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </button>
              <div className="absolute right-0 mt-2 w-56 bg-black rounded-lg shadow-lg border border-gray-800 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <Link
                  href="/cart"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-gray-800 hover:text-indigo-300"
                >
                  <Download className="w-4 h-4 text-indigo-400" />
                  <div className="flex-1">
                    <p className="font-medium">Design Downloads</p>
                    <p className="text-xs text-gray-400">{cartCount} item{cartCount !== 1 ? 's' : ''}</p>
                  </div>
                </Link>
                <Link
                  href="/boutique/cart"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-gray-800 hover:text-purple-300"
                >
                  <Package className="w-4 h-4 text-purple-400" />
                  <div className="flex-1">
                    <p className="font-medium">Physical Items</p>
                    <p className="text-xs text-gray-400">{boutiqueCartCount} item{boutiqueCartCount !== 1 ? 's' : ''}</p>
                  </div>
                </Link>
              </div>
            </div>
            {session ? (
              <div className="flex items-center gap-1 lg:gap-2">
                <Link href="/profile" className="text-gray-800 hover:text-indigo-700">
                  <User className="w-4 h-4 lg:w-5 lg:h-5" />
                </Link>
                <button 
                  onClick={() => signOut()}
                  className="text-xs lg:text-sm text-gray-800 hover:text-red-700 font-medium px-0.5 py-1"
                >
                  {t('nav.signOut')}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => signIn()}
                className="bg-indigo-700 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-800 font-medium text-xs lg:text-sm"
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
            <Menu className="w-6 h-6 text-black" />
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
                    href="/wishlist" 
                    className="block px-3 py-1.5 text-xs text-gray-800 hover:bg-red-50 rounded-lg flex items-center gap-1.5"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Heart className="w-3 h-3 text-red-600" />
                    Design Wishlist
                  </Link>
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