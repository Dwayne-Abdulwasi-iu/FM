'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  parentId?: string | null;
  author: {
    id: string;
    name: string;
    displayName: string | null;
    image: string | null;
    isVerified: boolean;
  };
  replies?: Comment[];
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
    bio: string | null;
    isVerified: boolean;
    verificationBadge: string | null;
    createdAt: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
  };
  comments: Comment[];
}

export default function ForumPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    async function fetchPost() {
      try {
        // The slug is used in the URL but we need to fetch by ID
        // First, we need to find the post. In a real app, you'd have a separate endpoint
        // For now, we'll assume the slug includes the post ID or use a different approach
        const response = await fetch(`/api/forum/posts/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setPost(data.post);
        }
      } catch (error) {
        console.error('Failed to fetch post:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPost();
  }, [slug]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !post) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/forum/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      });

      if (response.ok) {
        const data = await response.json();
        setPost((prev) =>
          prev ? { ...prev, comments: [...prev.comments, data.comment] } : prev
        );
        setCommentText('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Comment error:', error);
      alert('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!session || !post) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/forum/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText, parentId }),
      });

      if (response.ok) {
        // Refresh the page to get updated comments with replies
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to post reply');
      }
    } catch (error) {
      console.error('Reply error:', error);
      alert('Failed to post reply');
    } finally {
      setSubmitting(false);
      setReplyingTo(null);
      setReplyText('');
    }
  };

  const handleDeletePost = async () => {
    if (!post || !confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`/api/forum/posts/${post.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/forum');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete post');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMemberSince = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Post not found</h2>
        <Link href="/forum" className="text-purple-600 hover:underline">
          Back to forum
        </Link>
      </div>
    );
  }

  const isAuthor = session?.user?.id === post.author.id;
  const isAdmin = session?.user?.role === 'ADMIN';
  const canModify = isAuthor || isAdmin;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/forum" className="text-gray-500 hover:text-gray-700">
              Forum
            </Link>
            <span className="text-gray-400">/</span>
            <Link
              href={`/forum?category=${post.category.slug}`}
              className="text-gray-500 hover:text-gray-700"
              style={{ color: post.category.color || undefined }}
            >
              {post.category.name}
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 truncate">{post.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Post */}
        <article className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          {/* Post Header */}
          <div className="p-6 border-b">
            <div className="flex items-center gap-2 mb-4">
              {post.isPinned && (
                <span className="text-yellow-500" title="Pinned">
                  📌
                </span>
              )}
              {post.isLocked && (
                <span className="text-gray-500" title="Locked">
                  🔒
                </span>
              )}
              {/* Category badge - inline style needed for DB-driven dynamic colors */}
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: post.category.color
                    ? `${post.category.color}20`
                    : '#f3f4f6',
                  color: post.category.color || '#6b7280',
                }}
              >
                {post.category.name}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{post.title}</h1>
          </div>

          {/* Post Content */}
          <div className="flex">
            {/* Author Sidebar */}
            <div className="hidden md:block w-48 bg-gray-50 p-4 border-r">
              <div className="text-center">
                {post.author.image ? (
                  <Image
                    src={post.author.image}
                    alt={post.author.displayName || post.author.name}
                    width={64}
                    height={64}
                    className="rounded-full mx-auto mb-2"
                  />
                ) : (
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-purple-600 font-bold text-xl">
                      {(post.author.displayName || post.author.name)?.charAt(0)}
                    </span>
                  </div>
                )}
                <Link
                  href={`/designers/${post.author.id}`}
                  className="font-medium text-gray-900 hover:text-purple-600"
                >
                  {post.author.displayName || post.author.name}
                  {post.author.isVerified && (
                    <span className="ml-1 text-blue-500">✓</span>
                  )}
                </Link>
                {post.author.verificationBadge && (
                  <div className="text-xs text-purple-600 mt-1">
                    {post.author.verificationBadge}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  Member since {formatMemberSince(post.author.createdAt)}
                </div>
              </div>
            </div>

            {/* Post Body */}
            <div className="flex-1 p-6">
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap text-gray-900">{post.content}</p>
              </div>

              {/* Post Meta */}
              <div className="mt-6 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-4">
                  <span>Posted {formatDate(post.createdAt)}</span>
                  <span>{post.viewCount} views</span>
                </div>
                {canModify && (
                  <button
                    onClick={handleDeletePost}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete post
                  </button>
                )}
              </div>
            </div>
          </div>
        </article>

        {/* Comments Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Comments ({post.comments.length})
          </h2>

          {/* Comment Form */}
          {session && !post.isLocked && (
            <form onSubmit={handleSubmitComment} className="mb-8">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {submitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>
          )}

          {post.isLocked && (
            <div className="mb-8 p-4 bg-gray-100 rounded-lg text-center text-gray-600">
              🔒 This post is locked and cannot receive new comments
            </div>
          )}

          {/* Comments List */}
          {post.comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No comments yet. Be the first to share your thoughts!
            </div>
          ) : (
            <div className="space-y-6">
              {post.comments
                .filter((c) => !c.parentId)
                .map((comment) => (
                  <div key={comment.id} className="group">
                    <div className="flex gap-4">
                      {/* Comment Author Avatar */}
                      <div className="flex-shrink-0">
                        {comment.author.image ? (
                          <Image
                            src={comment.author.image}
                            alt={comment.author.displayName || comment.author.name}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 font-medium">
                              {(comment.author.displayName || comment.author.name)?.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Comment Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/designers/${comment.author.id}`}
                            className="font-medium text-gray-900 hover:text-purple-600"
                          >
                            {comment.author.displayName || comment.author.name}
                          </Link>
                          {comment.author.isVerified && (
                            <span className="text-blue-500">✓</span>
                          )}
                          <span className="text-sm text-gray-500">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>

                        {/* Reply Button */}
                        {session && !post.isLocked && (
                          <button
                            onClick={() =>
                              setReplyingTo(replyingTo === comment.id ? null : comment.id)
                            }
                            className="mt-2 text-sm text-purple-600 hover:text-purple-700"
                          >
                            Reply
                          </button>
                        )}

                        {/* Reply Form */}
                        {replyingTo === comment.id && (
                          <div className="mt-3">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a reply..."
                              rows={2}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                            />
                            <div className="mt-2 flex gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText('');
                                }}
                                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSubmitReply(comment.id)}
                                disabled={submitting || !replyText.trim()}
                                className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Nested Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-4 pl-4 border-l-2 border-gray-100 space-y-4">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex gap-3">
                                <div className="flex-shrink-0">
                                  {reply.author.image ? (
                                    <Image
                                      src={reply.author.image}
                                      alt={reply.author.displayName || reply.author.name}
                                      width={32}
                                      height={32}
                                      className="rounded-full"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                      <span className="text-gray-600 text-sm font-medium">
                                        {(reply.author.displayName || reply.author.name)?.charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Link
                                      href={`/designers/${reply.author.id}`}
                                      className="font-medium text-sm text-gray-900 hover:text-purple-600"
                                    >
                                      {reply.author.displayName || reply.author.name}
                                    </Link>
                                    {reply.author.isVerified && (
                                      <span className="text-blue-500 text-sm">✓</span>
                                    )}
                                    <span className="text-xs text-gray-500">
                                      {formatDate(reply.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700">{reply.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
