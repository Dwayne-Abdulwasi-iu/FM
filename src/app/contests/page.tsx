'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Contest {
  id: string;
  title: string;
  description: string;
  theme: string;
  bannerImage: string | null;
  prize: string | null;
  prizeAmount: number | null;
  startDate: string;
  endDate: string;
  votingEndDate: string | null;
  status: string;
  _count: {
    entries: number;
  };
  creator: {
    id: string;
    name: string;
    displayName: string | null;
    image: string | null;
  };
}

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  useEffect(() => {
    async function fetchContests() {
      try {
        const response = await fetch(`/api/contests?status=${statusFilter}`);
        const data = await response.json();
        setContests(data.contests || []);
      } catch (error) {
        console.error('Failed to fetch contests:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchContests();
  }, [statusFilter]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      UPCOMING: { bg: 'bg-blue-100', text: 'text-blue-800' },
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-800' },
      VOTING: { bg: 'bg-purple-100', text: 'text-purple-800' },
      COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-800' },
    };
    const badge = badges[status] || badges.COMPLETED;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">Design Contests</h1>
          <p className="text-xl text-purple-100 max-w-2xl">
            Showcase your talent, compete with fellow designers, and win amazing prizes. 
            Join our community contests and get discovered!
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-2 mb-8">
          {['ACTIVE', 'UPCOMING', 'VOTING', 'COMPLETED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border'
              }`}
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Contests Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-xl" />
                <div className="p-6 space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : contests.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No contests found</h2>
            <p className="text-gray-600">
              {statusFilter === 'ACTIVE' 
                ? 'Check back soon for new contests!' 
                : `No ${statusFilter.toLowerCase()} contests at the moment.`}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contests.map((contest) => (
              <Link
                key={contest.id}
                href={`/contests/${contest.id}`}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden group"
              >
                <div className="relative h-48 bg-gradient-to-br from-purple-400 to-indigo-500">
                  {contest.bannerImage && (
                    <Image
                      src={contest.bannerImage}
                      alt={contest.title}
                      fill
                      className="object-cover"
                    />
                  )}
                  <div className="absolute top-4 left-4">
                    {getStatusBadge(contest.status)}
                  </div>
                  {contest.prizeAmount && (
                    <div className="absolute bottom-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full font-bold">
                      ${contest.prizeAmount.toLocaleString()} Prize
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                    {contest.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {contest.description}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <div className="text-gray-500">
                      <span className="font-medium text-gray-700">
                        {contest._count.entries}
                      </span>{' '}
                      entries
                    </div>
                    <div className="text-gray-500">
                      {contest.status === 'UPCOMING' && (
                        <>Starts {formatDate(contest.startDate)}</>
                      )}
                      {contest.status === 'ACTIVE' && (
                        <>Ends {formatDate(contest.endDate)}</>
                      )}
                      {contest.status === 'VOTING' && (
                        <>Voting until {formatDate(contest.votingEndDate!)}</>
                      )}
                      {contest.status === 'COMPLETED' && (
                        <>Ended {formatDate(contest.endDate)}</>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center gap-2">
                    {contest.creator.image ? (
                      <Image
                        src={contest.creator.image}
                        alt={contest.creator.displayName || contest.creator.name}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 text-xs font-bold">
                          {(contest.creator.displayName || contest.creator.name)?.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-sm text-gray-600">
                      by {contest.creator.displayName || contest.creator.name}
                    </span>
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
