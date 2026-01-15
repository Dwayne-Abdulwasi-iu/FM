'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DesignerBadge from '@/components/DesignerBadge';

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
        console.log('Designers API response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Designers data received:', data);
          setDesigners(data.users || []);
        } else {
          console.error('API returned non-OK status:', response.status);
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
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">Discover Designers</h1>
          <p className="text-xl text-indigo-100 max-w-2xl">
            Connect with talented fashion designers from around the world. Follow your favorites and commission custom designs.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search designers..."
            className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Designers Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4" />
                <div className="h-5 bg-gray-200 rounded w-2/3 mx-auto mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : filteredDesigners.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎨</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No designers found</h2>
            <p className="text-gray-600">
              {searchQuery ? 'Try a different search term' : 'Check back soon for new designers!'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDesigners.map((designer) => (
              <Link
                key={designer.id}
                href={`/designers/${designer.id}`}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-6 text-center group"
              >
                {/* Avatar */}
                <div className="relative w-20 h-20 mx-auto mb-4">
                  {designer.image ? (
                    <Image
                      src={designer.image}
                      alt={designer.displayName || designer.name}
                      fill
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">
                        {(designer.displayName || designer.name)?.charAt(0)}
                      </span>
                    </div>
                  )}
                  {designer.isVerified && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
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
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {designer.displayName || designer.name}
                </h3>
                
                {/* Designer Tier Badge */}
                {designer.designerTier && (
                  <div className="mt-2">
                    <DesignerBadge tier={designer.designerTier} size="sm" />
                  </div>
                )}
                
                {designer.verificationBadge && (
                  <div className="text-xs text-purple-600 font-medium mt-1">
                    {designer.verificationBadge}
                  </div>
                )}

                {/* Bio */}
                {designer.bio && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                    {designer.bio}
                  </p>
                )}

                {/* Stats */}
                <div className="flex justify-center gap-6 mt-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-900">
                      {designer._count?.designs || 0}
                    </span>
                    <span className="text-gray-500 ml-1">designs</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">
                      {designer._count?.followers || 0}
                    </span>
                    <span className="text-gray-500 ml-1">followers</span>
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
