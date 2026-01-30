'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  _count: {
    posts: number;
  };
}

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  viewCount: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    displayName: string | null;
    image: string | null;
    isVerified: boolean;
    verificationBadge: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
  };
  _count: {
    comments: number;
  };
}

export default function ForumPage() {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categoryId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchForum() {
      try {
        const url = selectedCategory 
          ? `/api/forum?category=${selectedCategory}`
          : '/api/forum';
        const response = await fetch(url);
        const data = await response.json();
        setCategories(data.categories || []);
        setPosts(data.posts || []);
      } catch (error) {
        console.error('Failed to fetch forum:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchForum();
  }, [selectedCategory]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setPosts((prev) => [data.post, ...prev]);
        setShowNewPostForm(false);
        setFormData({ title: '', content: '', categoryId: '' });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Create post error:', error);
      alert('Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Community Forum</h1>
              <p className="text-xs sm:text-sm text-gray-700 mt-1 sm:mt-2">
                Connect with designers, share ideas, and learn from the community
              </p>
            </div>
            {session && (
              <button
                onClick={() => setShowNewPostForm(true)}
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1 sm:gap-2 flex-shrink-0"
              >
                <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">New Post</span>
                <span className="sm:hidden">Post</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
              <h2 className="font-bold text-sm sm:text-base text-gray-900 mb-3 sm:mb-4">Categories</h2>
              <div className="space-y-1.5 sm:space-y-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                    !selectedCategory
                      ? 'bg-purple-100 text-purple-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  All Posts
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.slug)}
                    className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors flex justify-between items-center gap-1 sm:gap-2 ${
                      selectedCategory === category.slug
                        ? 'bg-purple-100 text-purple-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className="flex items-center gap-1 sm:gap-2 truncate">
                      {category.icon && <span className="text-sm sm:text-base">{category.icon}</span>}
                      <span className="truncate">{category.name}</span>
                    </span>
                    <span className="text-[10px] sm:text-xs bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0">
                      {category._count.posts}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Posts */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
                    <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-6 sm:p-12 text-center">
                <div className="text-4xl sm:text-6xl mb-2 sm:mb-4">💬</div>
                <h2 className="text-base sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">No posts yet</h2>
                <p className="text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4">
                  Be the first to start a conversation!
                </p>
                {session && (
                  <button
                    onClick={() => setShowNewPostForm(true)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Create a Post
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/forum/${post.slug}`}
                    className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-3 sm:p-4 md:p-6">
                      <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                        {/* Author Avatar */}
                        <div className="flex-shrink-0">
                          {post.author.image ? (
                            <Image
                              src={post.author.image}
                              alt={post.author.displayName || post.author.name}
                              width={32}
                              height={32}
                              className="rounded-full w-8 h-8 sm:w-10 sm:h-10"
                            />
                          ) : (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center text-xs sm:text-sm">
                              <span className="text-purple-600 font-bold">
                                {(post.author.displayName || post.author.name)?.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Post Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap mb-0.5 sm:mb-1">
                            {post.isPinned && (
                              <span className="text-lg sm:text-xl" title="Pinned">📌</span>
                            )}
                            {post.isLocked && (
                              <span className="text-lg sm:text-xl" title="Locked">🔒</span>
                            )}
                            <h3 className="text-xs sm:text-sm md:text-base font-semibold text-gray-900 truncate">
                              {post.title}
                            </h3>
                          </div>

                          <p className="text-gray-700 text-[11px] sm:text-xs md:text-sm line-clamp-2 mb-2 sm:mb-3">
                            {post.content}
                          </p>

                          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 text-[10px] sm:text-xs md:text-sm text-gray-600 flex-wrap">
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="font-medium text-gray-800">
                                {post.author.displayName || post.author.name}
                              </span>
                              {post.author.isVerified && (
                                <span className="text-blue-500 text-xs">✓</span>
                              )}
                            </span>
                            {/* Category badge with dynamic color - inline style needed for DB-driven colors */}
                            <span
                              className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px]"
                              style={{
                                backgroundColor: post.category.color
                                  ? `${post.category.color}20`
                                  : '#f3f4f6',
                                color: post.category.color || '#6b7280',
                              }}
                            >
                              {post.category.name}
                            </span>
                            <span className="hidden xs:inline">{formatDate(post.createdAt)}</span>
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span className="hidden sm:inline">{post.viewCount || 0}</span>
                            </span>
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              {post._count?.comments || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Post Modal */}
      {showNewPostForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Create New Post</h2>
            <form onSubmit={handleCreatePost} className="space-y-3 sm:space-y-4">
              <div>
                <label htmlFor="post-category" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Category *
                </label>
                <select
                  id="post-category"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
                  required
                >
                  <option value="" className="text-gray-500">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="text-gray-900">
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="What's on your mind?"
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Content *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  placeholder="Share your thoughts, ask questions, or start a discussion..."
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                  required
                />
              </div>
              <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewPostForm(false)}
                  className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.title || !formData.content || !formData.categoryId}
                  className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {submitting ? 'Posting...' : 'Create Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
