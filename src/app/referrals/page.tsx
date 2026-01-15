'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ReferralCard from '@/components/ReferralCard';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReferredUser {
  id: string;
  name: string | null;
  email: string;
  status: string;
  joinedAt: string;
  firstPurchaseAt: string | null;
  earningsFromUser: number;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  referrals: number;
  earnings: number;
  tier: string;
}

export default function ReferralsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, formatCurrency, formatDate } = useLanguage();
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'leaderboard'>('overview');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/referrals');
      if (response.ok) {
        const data = await response.json();
        setReferredUsers(data.referredUsers || []);
      }

      // Fetch leaderboard
      const leaderboardRes = await fetch('/api/referrals/leaderboard');
      if (leaderboardRes.ok) {
        const lbData = await leaderboardRes.json();
        setLeaderboard(lbData.leaderboard || []);
      }
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded-xl"></div>
              <div className="h-96 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const tierColors: Record<string, string> = {
    Starter: 'bg-gray-100 text-gray-700',
    Bronze: 'bg-amber-100 text-amber-700',
    Silver: 'bg-gray-200 text-gray-700',
    Gold: 'bg-yellow-100 text-yellow-700',
    Platinum: 'bg-purple-100 text-purple-700',
    Diamond: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('referral.referralProgram')}</h1>
          <p className="text-gray-600 mt-2">{t('referral.inviteFriends')}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          {(['overview', 'referrals', 'leaderboard'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === tab
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'referrals' && `My Referrals (${referredUsers.length})`}
              {tab === 'leaderboard' && t('referral.leaderboard')}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-8">
            <ReferralCard />
            
            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h2>
              
              {referredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-500">No referrals yet</p>
                  <p className="text-sm text-gray-400 mt-1">Share your link to start earning!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {referredUsers.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{user.name || 'Anonymous'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          user.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {user.status === 'COMPLETED' ? 'Converted' : 'Pending'}
                        </span>
                        {user.earningsFromUser > 0 && (
                          <p className="text-sm text-green-600 mt-1">
                            +{formatCurrency(user.earningsFromUser)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">All Referrals</h2>
            </div>
            
            {referredUsers.length === 0 ? (
              <div className="text-center py-16">
                <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-xl text-gray-500">No referrals yet</p>
                <p className="text-gray-400 mt-2">Share your referral link to start inviting friends!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">First Purchase</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {referredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{user.name || 'Anonymous'}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(user.joinedAt)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {user.status === 'COMPLETED' ? 'Converted' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {user.firstPurchaseAt ? formatDate(user.firstPurchaseAt) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={user.earningsFromUser > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                            {user.earningsFromUser > 0 ? formatCurrency(user.earningsFromUser) : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{t('referral.leaderboard')}</h2>
              <p className="text-sm text-gray-500 mt-1">Top referrers this month</p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {leaderboard.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-500">Leaderboard coming soon!</p>
                </div>
              ) : (
                leaderboard.map((entry) => (
                  <div key={entry.userId} className="flex items-center p-4 hover:bg-gray-50">
                    {/* Rank */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                      entry.rank === 2 ? 'bg-gray-200 text-gray-700' :
                      entry.rank === 3 ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {entry.rank}
                    </div>

                    {/* User */}
                    <div className="ml-4 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{entry.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tierColors[entry.tier] || tierColors.Starter}`}>
                          {entry.tier}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{entry.referrals} referrals</p>
                    </div>

                    {/* Earnings */}
                    <div className="text-right">
                      <p className="font-medium text-green-600">{formatCurrency(entry.earnings)}</p>
                      <p className="text-xs text-gray-500">earned</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
