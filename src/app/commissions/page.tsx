'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';

interface Attachment {
  url: string;
  type: string;
  name: string;
  size: number;
}

interface CommissionRequest {
  id: string;
  title: string;
  description: string;
  category: string | null;
  budget: string | null;
  deadline: string | null;
  status: string;
  attachments: Attachment[];
  createdAt: string;
  designerQuote: number | null;
  designerDeadline: string | null;
  isPhysical: boolean;
  requester: {
    id: string;
    name: string;
    displayName: string | null;
    image: string | null;
  };
  designer: {
    id: string;
    name: string;
    displayName: string | null;
    image: string | null;
  };
}

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Admin Review' },
  FORWARDED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Awaiting Response' },
  QUOTED: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Quote Sent' },
  PAID: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
  IN_PROGRESS: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'In Progress' },
  DELIVERED: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'Delivered' },
  REVISION: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Revision' },
  COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Completed' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Declined' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' },
};

export default function CommissionsPage() {
  const { data: session, status } = useSession();
  const [requests, setRequests] = useState<CommissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requester' | 'designer'>('requester');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [incomingCount, setIncomingCount] = useState(0);

  useEffect(() => {
    if (status === 'loading') return;

    async function fetchRequests() {
      if (!session) {
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();
        params.set('role', activeTab);
        if (statusFilter) params.set('status', statusFilter);

        const response = await fetch(`/api/commission-requests?${params}`);
        const data = await response.json();
        setRequests(data.requests || []);
      } catch (error) {
        console.error('Failed to fetch requests:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRequests();
  }, [session, status, activeTab, statusFilter]);

  // Fetch incoming count for designers
  useEffect(() => {
    if (!session) return;
    async function fetchIncomingCount() {
      try {
        const response = await fetch('/api/commission-requests?role=designer&status=FORWARDED');
        const data = await response.json();
        setIncomingCount(data.requests?.length || 0);
      } catch (error) {
        console.error('Failed to fetch incoming count:', error);
      }
    }
    fetchIncomingCount();
  }, [session]);

  const getStatusBadge = (reqStatus: string) => {
    const badge = STATUS_BADGES[reqStatus] || { bg: 'bg-gray-100', text: 'text-gray-800', label: reqStatus };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">🔐</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in Required</h2>
        <p className="text-gray-600 mb-4">Please sign in to view your commissions</p>
        <Link href="/auth/signin" className="px-4 py-2 bg-purple-600 text-white rounded-lg">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Custom Commissions</h1>
              <p className="text-gray-600 mt-2">
                Request custom designs from talented designers or manage your incoming requests
              </p>
            </div>
            <Link
              href="/commission-request"
              className="mt-4 sm:mt-0 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Commission Request
            </Link>
          </div>

          {/* Quick Links */}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/my-commissions"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              View My Commission Requests
            </Link>
            <Link
              href="/designers"
              className="text-sm text-gray-600 hover:text-gray-700 font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Browse Designers
            </Link>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex border-b">
            <button
              onClick={() => { setActiveTab('requester'); setStatusFilter(''); }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'requester'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              My Requests
            </button>
            <button
              onClick={() => { setActiveTab('designer'); setStatusFilter(''); }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors relative ${
                activeTab === 'designer'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Incoming Requests
              {incomingCount > 0 && activeTab !== 'designer' && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {incomingCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {activeTab === 'requester' ? (
            ['', 'PENDING', 'FORWARDED', 'QUOTED', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(
              (filterStatus) => (
                <button
                  key={filterStatus || 'all'}
                  onClick={() => setStatusFilter(filterStatus)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    statusFilter === filterStatus
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                >
                  {filterStatus || 'All'}
                </button>
              )
            )
          ) : (
            ['', 'FORWARDED', 'QUOTED', 'PAID', 'IN_PROGRESS', 'REVISION', 'COMPLETED'].map(
              (filterStatus) => (
                <button
                  key={filterStatus || 'all'}
                  onClick={() => setStatusFilter(filterStatus)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    statusFilter === filterStatus
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                >
                  {filterStatus === 'FORWARDED' ? 'New' : filterStatus || 'All'}
                </button>
              )
            )
          )}
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🎨</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No commissions yet</h2>
            <p className="text-gray-600 mb-4">
              {activeTab === 'requester'
                ? 'Browse designers and request your first custom design!'
                : 'When clients request custom designs from you, they will appear here.'}
            </p>
            {activeTab === 'requester' && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/commission-request"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Commission Request
                </Link>
                <Link
                  href="/designers"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 font-medium"
                >
                  Browse Designers
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Link
                key={request.id}
                href={activeTab === 'designer' ? `/seller/commission-requests` : `/my-commissions`}
                className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Avatar of the other party */}
                    <div className="flex-shrink-0">
                      {activeTab === 'requester' ? (
                        request.designer.image ? (
                          <Image
                            src={request.designer.image}
                            alt={request.designer.displayName || request.designer.name}
                            width={48}
                            height={48}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-bold text-lg">
                              {(request.designer.displayName || request.designer.name)?.charAt(0)}
                            </span>
                          </div>
                        )
                      ) : request.requester.image ? (
                        <Image
                          src={request.requester.image}
                          alt={request.requester.displayName || request.requester.name}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-lg">
                            {(request.requester.displayName || request.requester.name)?.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Request Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {request.title}
                        </h3>
                        {getStatusBadge(request.status)}
                        {request.isPhysical && (
                          <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded-full font-medium">
                            📦 Physical
                          </span>
                        )}
                        {request.status === 'FORWARDED' && activeTab === 'designer' && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium animate-pulse">
                            ⚡ Action Required
                          </span>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                        {request.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span>
                          {activeTab === 'requester' ? 'Designer: ' : 'From: '}
                          <span className="font-medium text-gray-700">
                            {activeTab === 'requester'
                              ? request.designer.displayName || request.designer.name
                              : request.requester.displayName || request.requester.name}
                          </span>
                        </span>

                        {request.budget && (
                          <span>
                            Budget:{' '}
                            <span className="font-medium text-gray-700">
                              {request.budget}
                            </span>
                          </span>
                        )}

                        {request.designerQuote && (
                          <span className="text-green-600">
                            Quote:{' '}
                            <span className="font-medium">
                              ${request.designerQuote.toLocaleString()}
                            </span>
                          </span>
                        )}

                        {request.deadline && (
                          <span>
                            Deadline:{' '}
                            <span className="font-medium text-gray-700">
                              {request.deadline}
                            </span>
                          </span>
                        )}

                        <span>Created {formatDate(request.createdAt)}</span>
                      </div>

                      {/* Category Tag */}
                      {request.category && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            {request.category}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Attachments Preview */}
                    {request.attachments && request.attachments.length > 0 && (
                      <div className="hidden md:flex -space-x-2">
                        {request.attachments.slice(0, 3).map((att, i) => (
                          <div
                            key={i}
                            className="w-12 h-12 rounded-lg border-2 border-white overflow-hidden bg-gray-100 flex items-center justify-center"
                          >
                            {att.type?.startsWith('image/') ? (
                              <Image
                                src={att.url}
                                alt="Reference"
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <span className="text-gray-400 text-lg">📎</span>
                            )}
                          </div>
                        ))}
                        {request.attachments.length > 3 && (
                          <div className="w-12 h-12 rounded-lg border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                            +{request.attachments.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Arrow */}
                    <div className="flex-shrink-0 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
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
