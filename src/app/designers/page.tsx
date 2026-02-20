'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DesignerBadge from '@/components/DesignerBadge';
import { VerificationBadge } from '@/components/VerificationBadges';
import ClickableAvatar from '@/components/ClickableAvatar';

interface Designer {
  id: string;
  name: string;
  displayName: string | null;
  image: string | null;
  bio: string | null;
  isVerified: boolean;
  verificationBadge: string | null;
  designerTier: string | null;
  role: string;
  _count: {
    designs: number;
    followers: number;
  };
}

export default function DesignersPage() {
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchDesigners() {
      try {
        // Fetch users who are sellers OR have uploaded at least one design
        const response = await fetch('/api/users?designers=true&limit=50');
        if (response.ok) {
          const data = await response.json();
          setDesigners(data.users || []);
        } else {
          console.error('Failed to fetch designers:', response.status);
        }
      } catch (error) {
        console.error('Failed to fetch designers:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDesigners();
  }, []);

  const filteredDesigners = designers.filter((designer) => {
    const name = designer.displayName || designer.name;
    return name ? name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-8 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4">Discover Designers</h1>
          <p className="text-sm sm:text-base md:text-xl text-indigo-100 max-w-2xl">
            Connect with talented fashion designers from around the world. Follow your favorites and commission custom designs.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Search */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search designers..."
            className="w-full max-w-md px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>

        {/* Designers Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6 animate-pulse">
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-200 rounded-full mx-auto mb-2 sm:mb-3 md:mb-4" />
                <div className="h-4 sm:h-5 bg-gray-200 rounded w-2/3 mx-auto mb-1 sm:mb-2" />
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : filteredDesigners.length === 0 ? (
          <div className="text-center py-8 sm:py-12 md:py-16">
            <div className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-4">🎨</div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">No designers found</h2>
            <p className="text-gray-900 text-sm sm:text-base">
              {searchQuery ? 'Try a different search term' : 'Check back soon for new designers!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
            {filteredDesigners.map((designer) => (
              <Link
                key={designer.id}
                href={`/designers/${designer.id}`}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-3 sm:p-4 md:p-6 text-center group"
              >
                {/* Avatar */}
                <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-2 sm:mb-3 md:mb-4">
                  <ClickableAvatar
                    imageUrl={designer.image}
                    name={designer.displayName || designer.name}
                    sizeClass="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20"
                    textClass="text-lg sm:text-xl md:text-2xl"
                  />
                  {designer.isVerified && (
                    <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                      <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Name */}
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors text-xs sm:text-sm md:text-base truncate">
                  {designer.displayName || designer.name}
                </h3>
                
                {/* Designer Tier Badge */}
                {designer.designerTier && (
                  <div className="mt-1 sm:mt-2">
                    <DesignerBadge tier={designer.designerTier} size="sm" />
                  </div>
                )}
                
                {designer.verificationBadge && (
                  <div className="mt-1 sm:mt-2">
                    <VerificationBadge badge={designer.verificationBadge} size="sm" />
                  </div>
                )}

                {/* Bio */}
                {designer.bio && (
                  <p className="text-[10px] sm:text-xs md:text-sm text-gray-900 mt-1 sm:mt-2 line-clamp-2">
                    {designer.bio}
                  </p>
                )}

                {/* Stats */}
                <div className="flex justify-center gap-3 sm:gap-4 md:gap-6 mt-2 sm:mt-3 md:mt-4 text-[10px] sm:text-xs md:text-sm">
                  <div>
                    <span className="font-semibold text-gray-900">
                      {designer._count?.designs || 0}
                    </span>
                    <span className="text-gray-900 ml-0.5 sm:ml-1">designs</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">
                      {designer._count?.followers || 0}
                    </span>
                    <span className="text-gray-900 ml-0.5 sm:ml-1">followers</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
