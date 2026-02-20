'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import ClickableAvatar from '@/components/ClickableAvatar';

interface ContestEntry {
  id: string;
  title: string;
  description: string | null;
  images: string[];
  votes: number;
  rank: number | null;
  createdAt: string;
  participant: {
    id: string;
    name: string;
    displayName: string | null;
    image: string | null;
    isVerified: boolean;
  };
}

interface Contest {
  id: string;
  title: string;
  description: string;
  theme: string;
  rules: string | null;
  bannerImage: string | null;
  prize: string | null;
  prizeAmount: number | null;
  startDate: string;
  endDate: string;
  votingEndDate: string | null;
  status: string;
  maxEntriesPerUser: number;
  entries: ContestEntry[];
  creator: {
    id: string;
    name: string;
    displayName: string | null;
    image: string | null;
  };
}

export default function ContestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    images: [] as string[],
  });

  useEffect(() => {
    async function fetchContest() {
      try {
        const response = await fetch(`/api/contests/${id}`);
        const data = await response.json();
        setContest(data.contest);
      } catch (error) {
        console.error('Failed to fetch contest:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchContest();
  }, [id]);

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/contests/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setContest((prev) =>
          prev ? { ...prev, entries: [...prev.entries, data.entry] } : prev
        );
        setShowSubmitForm(false);
        setFormData({ title: '', description: '', images: [] });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit entry');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to submit entry');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} days, ${hours} hours remaining`;
    return `${hours} hours remaining`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Contest not found</h2>
        <Link href="/contests" className="text-purple-600 hover:underline">
          Browse all contests
        </Link>
      </div>
    );
  }

  const canSubmit = contest.status === 'ACTIVE' && session;
  const userHasSubmitted = contest.entries.some(
    (e) => e.participant.id === session?.user?.id
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="relative h-64 md:h-80 bg-gradient-to-br from-purple-600 to-indigo-700">
        {contest.bannerImage && (
          <Image
            src={contest.bannerImage}
            alt={contest.title}
            fill
            className="object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                contest.status === 'ACTIVE'
                  ? 'bg-green-500 text-white'
                  : contest.status === 'VOTING'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-500 text-white'
              }`}
            >
              {contest.status}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {contest.title}
            </h1>
            <p className="text-white/80">{contest.theme}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About this Contest</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{contest.description}</p>

              {contest.rules && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Rules</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{contest.rules}</p>
                </>
              )}
            </div>

            {/* Entries */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Entries ({contest.entries.length})
                </h2>
                {canSubmit && !userHasSubmitted && (
                  <button
                    onClick={() => setShowSubmitForm(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Submit Entry
                  </button>
                )}
              </div>

              {contest.entries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🎨</div>
                  <p className="text-gray-600">No entries yet. Be the first to submit!</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {contest.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {entry.images[0] && (
                        <div className="relative h-48 bg-gray-100">
                          <Image
                            src={entry.images[0]}
                            alt={entry.title}
                            fill
                            className="object-cover"
                          />
                          {entry.rank && entry.rank <= 3 && (
                            <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-yellow-900">
                              {entry.rank}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900">{entry.title}</h3>
                        {entry.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {entry.description}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {entry.participant.image ? (
                              <Image
                                src={entry.participant.image}
                                alt={entry.participant.displayName || entry.participant.name}
                                width={24}
                                height={24}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 bg-gray-200 rounded-full" />
                            )}
                            <span className="text-sm text-gray-600">
                              {entry.participant.displayName || entry.participant.name}
                              {entry.participant.isVerified && (
                                <span className="ml-1 text-blue-500">✓</span>
                              )}
                            </span>
                          </div>
                          {(contest.status === 'VOTING' || contest.status === 'COMPLETED') && (
                            <span className="text-sm font-medium text-purple-600">
                              {entry.votes} votes
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Prize Info */}
            {(contest.prize || contest.prizeAmount) && (
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl p-6 text-white">
                <h3 className="text-lg font-bold mb-2">🏆 Prize</h3>
                {contest.prizeAmount && (
                  <div className="text-3xl font-bold mb-2">
                    ${contest.prizeAmount.toLocaleString()}
                  </div>
                )}
                {contest.prize && <p className="text-yellow-100">{contest.prize}</p>}
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Timeline</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Start Date</div>
                  <div className="font-medium">{formatDate(contest.startDate)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Submission Deadline</div>
                  <div className="font-medium">{formatDate(contest.endDate)}</div>
                  {contest.status === 'ACTIVE' && (
                    <div className="text-sm text-purple-600 mt-1">
                      {getTimeRemaining(contest.endDate)}
                    </div>
                  )}
                </div>
                {contest.votingEndDate && (
                  <div>
                    <div className="text-sm text-gray-500">Voting Ends</div>
                    <div className="font-medium">{formatDate(contest.votingEndDate)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Host */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Hosted By</h3>
              <div className="flex items-center gap-3">
                <ClickableAvatar
                  imageUrl={contest.creator.image}
                  name={contest.creator.displayName || contest.creator.name}
                  sizeClass="w-12 h-12"
                  textClass="text-lg"
                />
                <div>
                  <div className="font-medium text-gray-900">
                    {contest.creator.displayName || contest.creator.name}
                  </div>
                  <Link
                    href={`/designers/${contest.creator.id}`}
                    className="text-sm text-purple-600 hover:underline"
                  >
                    View profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Entry Modal */}
      {showSubmitForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Submit Your Entry</h2>
            <form onSubmit={handleSubmitEntry} className="space-y-4">
              <div>
                <label htmlFor="entry-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Entry Title *
                </label>
                <input
                  id="entry-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="entry-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="entry-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URLs (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      images: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter URLs of your design images
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSubmitForm(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.title}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
