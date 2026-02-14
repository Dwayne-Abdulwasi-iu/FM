'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VerificationBadge } from '@/components/VerificationBadges';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  parentId?: string | null;
  replyToAuthor?: string | null;
  replyToContent?: string | null;
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
    allBadges?: string[];
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
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [longPressedCommentId, setLongPressedCommentId] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [expandedCommentIds, setExpandedCommentIds] = useState<Set<string>>(new Set());
  const [replyingToReply, setReplyingToReply] = useState<string | null>(null);
  const [replyToReplyText, setReplyToReplyText] = useState('');

  useEffect(() => {
    async function fetchPost() {
      try {
        const response = await fetch(`/api/forum/posts/${slug}`);
        if (response.ok) {
          const data = await response.json();
          let postData = data.post;
          
          // Organize comments with their replies
          if (postData.comments && postData.comments.length > 0) {
            const topLevelComments: Comment[] = [];
            const repliesMap = new Map<string, Comment[]>();
            
            // Separate top-level comments and replies
            postData.comments.forEach((comment: Comment) => {
              if (!comment.parentId) {
                topLevelComments.push({ ...comment, replies: [] });
              } else {
                if (!repliesMap.has(comment.parentId)) {
                  repliesMap.set(comment.parentId, []);
                }
                repliesMap.get(comment.parentId)!.push(comment);
              }
            });
            
            // Assign replies to their parent comments
            const organizedComments = topLevelComments.map((comment) => ({
              ...comment,
              replies: repliesMap.get(comment.id) || [],
            }));
            
            postData = { ...postData, comments: organizedComments };
          }
          
          setPost(postData);
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
        const data = await response.json();
        const newReply = data.comment;
        
        // Update the post state to include the new reply
        setPost((prev) =>
          prev
            ? {
                ...prev,
                comments: prev.comments.map((comment) =>
                  comment.id === parentId
                    ? {
                        ...comment,
                        replies: [...(comment.replies || []), newReply],
                      }
                    : comment
                ),
              }
            : prev
        );
        setReplyText('');
        setReplyingTo(null);
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

  const handleSubmitReplyToReply = async (parentCommentId: string, replyId: string, replyAuthorName: string, replyContent: string) => {
    if (!session || !post) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/forum/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: replyToReplyText, 
          parentId: parentCommentId,
          replyToAuthor: replyAuthorName,
          replyToContent: replyContent
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newReply = {
          ...data.comment,
          replyToAuthor: replyAuthorName,
          replyToContent: replyContent
        };
        
        // Add reply as a sibling child under the parent comment
        setPost((prev) =>
          prev
            ? {
                ...prev,
                comments: prev.comments.map((comment) =>
                  comment.id === parentCommentId
                    ? {
                        ...comment,
                        replies: [...(comment.replies || []), newReply],
                      }
                    : comment
                ),
              }
            : prev
        );
        setReplyToReplyText('');
        setReplyingToReply(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to post reply');
      }
    } catch (error) {
      console.error('Reply error:', error);
      alert('Failed to post reply');
    } finally {
      setSubmitting(false);
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

  const handleDeleteComment = async (commentId: string) => {
    if (!post || !confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(`/api/forum/posts/${post.id}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPost((prev) => {
          if (!prev) return prev;
          
          // Try to find and remove from top-level comments
          const updatedComments = prev.comments.filter((c) => c.id !== commentId);
          
          // If it wasn't found at top level, it might be a nested reply
          if (updatedComments.length === prev.comments.length) {
            // Search and remove from nested replies
            const withNestedRemoved = prev.comments.map((comment) => ({
              ...comment,
              replies: (comment.replies || []).filter((reply) => reply.id !== commentId),
            }));
            return { ...prev, comments: withNestedRemoved };
          }
          
          return { ...prev, comments: updatedComments };
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Delete comment error:', error);
      alert('Failed to delete comment');
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!post || !editText.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/forum/posts/${post.id}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editText }),
      });

      if (response.ok) {
        setPost((prev) => {
          if (!prev) return prev;
          
          // Try to update top-level comments first
          const updatedComments = prev.comments.map((c) =>
            c.id === commentId ? { ...c, content: editText } : c
          );
          
          // Check if the comment was found and updated
          const wasUpdated = updatedComments.some((c) => c.id === commentId && c.content === editText);
          
          if (!wasUpdated) {
            // If not found at top level, search and update in nested replies
            return {
              ...prev,
              comments: prev.comments.map((comment) => ({
                ...comment,
                replies: (comment.replies || []).map((reply) =>
                  reply.id === commentId ? { ...reply, content: editText } : reply
                ),
              })),
            };
          }
          
          return { ...prev, comments: updatedComments };
        });
        setEditingCommentId(null);
        setEditText('');
        setLongPressedCommentId(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to edit comment');
      }
    } catch (error) {
      console.error('Edit comment error:', error);
      alert('Failed to edit comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentMouseDown = (commentId: string) => {
    const timer = setTimeout(() => {
      setLongPressedCommentId(commentId);
    }, 3000);
    setLongPressTimer(timer);
  };

  const handleCommentMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleCommentMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const toggleCommentExpanded = (commentId: string) => {
    setExpandedCommentIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-4">
          <nav className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs md:text-sm">
            <Link href="/forum" className="text-gray-600 hover:text-gray-800 truncate">
              Forum
            </Link>
            <span className="text-gray-400 flex-shrink-0">/</span>
            <Link
              href={`/forum?category=${post.category.slug}`}
              className="text-gray-600 hover:text-gray-800 truncate"
              style={{ color: post.category.color || undefined }}
            >
              {post.category.name}
            </Link>
            <span className="text-gray-400 flex-shrink-0">/</span>
            <span className="text-gray-900 truncate line-clamp-1">{post.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Main Post */}
        <article className="bg-white rounded-xl shadow-sm overflow-hidden mb-4 sm:mb-6 lg:mb-8">
          {/* Post Header */}
          <div className="p-3 sm:p-4 md:p-6 border-b">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 md:mb-4">
              {post.isPinned && (
                <span className="text-lg sm:text-xl" title="Pinned">
                  📌
                </span>
              )}
              {post.isLocked && (
                <span className="text-lg sm:text-xl" title="Locked">
                  🔒
                </span>
              )}
              {/* Category badge - inline style needed for DB-driven dynamic colors */}
              <span
                className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-xs font-medium flex-shrink-0"
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
            <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">{post.title}</h1>
          </div>

          {/* Post Content */}
          <div className="flex flex-col md:flex-row">
            {/* Author Sidebar */}
            <div className="hidden md:block md:w-40 lg:w-48 bg-gray-50 p-3 md:p-4 border-b md:border-b-0 md:border-r">
              <div className="text-center">
                {post.author.image ? (
                  <Image
                    src={post.author.image}
                    alt={post.author.displayName || post.author.name}
                    width={56}
                    height={56}
                    className="rounded-full mx-auto mb-2 w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16"
                  />
                ) : (
                  <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-purple-600 font-bold text-sm md:text-base lg:text-xl">
                      {(post.author.displayName || post.author.name)?.charAt(0)}
                    </span>
                  </div>
                )}
                <Link
                  href={`/designers/${post.author.id}`}
                  className="font-medium text-xs md:text-sm text-gray-900 hover:text-purple-600"
                >
                  {post.author.displayName || post.author.name}
                  {post.author.isVerified && (
                    <span className="ml-0.5 text-blue-500 text-xs">✓</span>
                  )}
                </Link>
                {(post.author.allBadges && post.author.allBadges.length > 0) && (
                  <div className="mt-1 md:mt-2">
                    <VerificationBadge badges={post.author.allBadges} size="sm" />
                  </div>
                )}
                <div className="text-[9px] md:text-xs text-gray-600 mt-1 md:mt-2">
                  Member since {formatMemberSince(post.author.createdAt)}
                </div>
              </div>
            </div>

            {/* Post Body */}
            <div className="flex-1 p-3 sm:p-4 md:p-6">
              <div className="prose prose-sm md:prose max-w-none">
                <p className="whitespace-pre-wrap text-xs sm:text-sm md:text-base text-gray-900">{post.content}</p>
              </div>

              {/* Post Meta */}
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 xs:gap-4 text-[11px] sm:text-xs md:text-sm text-gray-600">
                <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 xs:gap-3 md:gap-4">
                  <span className="whitespace-nowrap">Posted {formatDate(post.createdAt)}</span>
                  <span className="hidden xs:inline">{post.viewCount} views</span>
                </div>
                {canModify && (
                  <button
                    onClick={handleDeletePost}
                    className="text-red-600 hover:text-red-700 whitespace-nowrap"
                  >
                    Delete post
                  </button>
                )}
              </div>
            </div>
          </div>
        </article>

        {/* Comments Section */}
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6">
            Comments ({post.comments.length})
          </h2>

          {/* Comment Form */}
          {session && !post.isLocked && (
            <form onSubmit={handleSubmitComment} className="mb-6 sm:mb-8">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none placeholder:text-gray-500"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {submitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>
          )}

          {post.isLocked && (
            <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-gray-100 rounded-lg text-center text-xs sm:text-sm text-gray-700">
              🔒 This post is locked and cannot receive new comments
            </div>
          )}

          {/* Comments List */}
          {post.comments.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-600">
              No comments yet. Be the first to share your thoughts!
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {post.comments
                .filter((c) => !c.parentId)
                .map((comment) => (
                  <div key={comment.id} className="group">
                    <div className="flex gap-2 sm:gap-3 md:gap-4">
                      {/* Comment Author Avatar */}
                      <div className="flex-shrink-0">
                        {comment.author.image ? (
                          <Image
                            src={comment.author.image}
                            alt={comment.author.displayName || comment.author.name}
                            width={40}
                            height={40}
                            className="rounded-full w-8 h-8 sm:w-10 sm:h-10"
                          />
                        ) : (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 font-medium text-xs sm:text-sm">
                              {(comment.author.displayName || comment.author.name)?.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Comment Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                          <Link
                            href={`/designers/${comment.author.id}`}
                            className="font-medium text-xs sm:text-sm md:text-base text-gray-900 hover:text-purple-600 truncate"
                          >
                            {comment.author.displayName || comment.author.name}
                          </Link>
                          {comment.author.isVerified && (
                            <span className="text-blue-500 text-xs flex-shrink-0">✓</span>
                          )}
                          <span className="text-[10px] sm:text-xs text-gray-600 flex-shrink-0">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <div
                          onMouseDown={() => handleCommentMouseDown(comment.id)}
                          onMouseUp={handleCommentMouseUp}
                          onMouseLeave={handleCommentMouseLeave}
                          onTouchStart={() => handleCommentMouseDown(comment.id)}
                          onTouchEnd={handleCommentMouseUp}
                          className="relative"
                        >
                          <p className="text-gray-700 text-xs sm:text-sm whitespace-pre-wrap select-none">{comment.content}</p>

                          {/* Long-press Menu Popup */}
                          {longPressedCommentId === comment.id && session && (session.user?.id === comment.author.id || session.user?.role === 'ADMIN') && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-max">
                              <button
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditText(comment.content);
                                  setLongPressedCommentId(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-blue-600 hover:bg-blue-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteComment(comment.id);
                                  setLongPressedCommentId(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 border-t border-gray-200"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Reply Button & Reply Count */}
                        <div className="flex items-center gap-2 mt-1.5 sm:mt-2 flex-wrap">
                          {session && !post.isLocked && (
                            <button
                              onClick={() =>
                                setReplyingTo(replyingTo === comment.id ? null : comment.id)
                              }
                              className="text-xs sm:text-sm text-purple-600 hover:text-purple-700"
                            >
                              Reply
                            </button>
                          )}
                          
                          {/* Show replies count if there are replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <button
                              onClick={() => toggleCommentExpanded(comment.id)}
                              className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 hover:text-gray-700"
                            >
                              <span>{expandedCommentIds.has(comment.id) ? '▼' : '▶'}</span>
                              <span>{comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</span>
                            </button>
                          )}
                        </div>

                        {/* Edit Form */}
                        {editingCommentId === comment.id && (
                          <div className="mt-2 sm:mt-3">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs sm:text-sm text-gray-900 resize-none placeholder:text-gray-500"
                              rows={2}
                            />
                            <div className="mt-1.5 sm:mt-2 flex gap-1.5 sm:gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditText('');
                                }}
                                className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-gray-600 hover:text-gray-800"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleEditComment(comment.id)}
                                disabled={submitting || !editText.trim()}
                                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Reply Form */}
                        {replyingTo === comment.id && (
                          <div className="mt-2 sm:mt-3 bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3">
                            {/* Quoted Comment */}
                            <div className="mb-2 sm:mb-3 pb-2 sm:pb-3 border-b border-green-200">
                              <div className="text-xs sm:text-sm font-medium text-green-700 mb-1">
                                Replying to {comment.author.displayName || comment.author.name}
                              </div>
                              <div className="text-xs sm:text-sm text-green-800 bg-green-100 rounded p-1.5 sm:p-2">
                                {comment.content}
                              </div>
                            </div>
                            
                            {/* Reply Input */}
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a reply..."
                              rows={2}
                              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs sm:text-sm text-gray-900 resize-none placeholder:text-gray-500"
                            />
                            <div className="mt-1.5 sm:mt-2 flex gap-1.5 sm:gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText('');
                                }}
                                className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-gray-600 hover:text-gray-800"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSubmitReply(comment.id)}
                                disabled={submitting || !replyText.trim()}
                                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Nested Replies - Collapsible */}
                        {comment.replies && comment.replies.length > 0 && expandedCommentIds.has(comment.id) && (
                          <div className="mt-3 sm:mt-4 pl-2 sm:pl-3 md:pl-4 border-l-2 border-gray-100 space-y-3 sm:space-y-4">
                            {comment.replies.map((reply) => (
                              <div key={reply.id}>
                                <div className="flex gap-2 sm:gap-3">
                                  <div className="flex-shrink-0">
                                    {reply.author.image ? (
                                      <Image
                                        src={reply.author.image}
                                        alt={reply.author.displayName || reply.author.name}
                                        width={32}
                                        height={32}
                                        className="rounded-full w-6 h-6 sm:w-8 sm:h-8"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                        <span className="text-gray-600 text-[10px] sm:text-xs font-medium">
                                          {(reply.author.displayName || reply.author.name)?.charAt(0)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                                      <Link
                                        href={`/designers/${reply.author.id}`}
                                        className="font-medium text-[11px] sm:text-xs md:text-sm text-gray-900 hover:text-purple-600 truncate"
                                      >
                                        {reply.author.displayName || reply.author.name}
                                      </Link>
                                      {reply.author.isVerified && (
                                        <span className="text-blue-500 text-[10px] flex-shrink-0">✓</span>
                                      )}
                                      <span className="text-[9px] sm:text-[10px] text-gray-600 flex-shrink-0">
                                        {formatDate(reply.createdAt)}
                                      </span>
                                    </div>
                                    
                                    {/* Show quoted reply if this is a reply to another reply */}
                                    {reply.replyToAuthor && reply.replyToContent && (
                                      <div className="mb-1 sm:mb-2 bg-green-50 border-l-2 border-green-400 pl-2 py-1 rounded-r">
                                        <span className="text-[9px] sm:text-[10px] text-green-700 font-medium">
                                          @{reply.replyToAuthor}
                                        </span>
                                        <p className="text-[9px] sm:text-[10px] text-green-600 line-clamp-2">
                                          {reply.replyToContent}
                                        </p>
                                      </div>
                                    )}
                                    
                                    <div
                                      onMouseDown={() => handleCommentMouseDown(reply.id)}
                                      onMouseUp={handleCommentMouseUp}
                                      onMouseLeave={handleCommentMouseLeave}
                                      onTouchStart={() => handleCommentMouseDown(reply.id)}
                                      onTouchEnd={handleCommentMouseUp}
                                      className="relative"
                                    >
                                      <p className="text-gray-700 text-[11px] sm:text-xs md:text-sm select-none">{reply.content}</p>

                                      {/* Long-press Menu Popup */}
                                      {longPressedCommentId === reply.id && session && (session.user?.id === reply.author.id || session.user?.role === 'ADMIN') && (
                                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-max">
                                          <button
                                            onClick={() => {
                                              setEditingCommentId(reply.id);
                                              setEditText(reply.content);
                                              setLongPressedCommentId(null);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-blue-600 hover:bg-blue-50"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => {
                                              handleDeleteComment(reply.id);
                                              setLongPressedCommentId(null);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 border-t border-gray-200"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Reply to Reply Button */}
                                    {session && !post.isLocked && (
                                      <button
                                        onClick={() => setReplyingToReply(replyingToReply === reply.id ? null : reply.id)}
                                        className="mt-1 text-[10px] sm:text-xs text-purple-600 hover:text-purple-700"
                                      >
                                        Reply
                                      </button>
                                    )}
                                    
                                    {/* Reply to Reply Form */}
                                    {replyingToReply === reply.id && (
                                      <div className="mt-2 sm:mt-3 bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3">
                                        {/* Quoted Reply */}
                                        <div className="mb-2 sm:mb-3 pb-2 sm:pb-3 border-b border-green-200">
                                          <div className="text-[10px] sm:text-xs font-medium text-green-700 mb-1">
                                            Replying to {reply.author.displayName || reply.author.name}
                                          </div>
                                          <div className="text-[10px] sm:text-xs text-green-800 bg-green-100 rounded p-1.5 sm:p-2">
                                            {reply.content}
                                          </div>
                                        </div>
                                        
                                        {/* Reply Input */}
                                        <textarea
                                          value={replyToReplyText}
                                          onChange={(e) => setReplyToReplyText(e.target.value)}
                                          placeholder="Write a reply..."
                                          rows={2}
                                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[10px] sm:text-xs text-gray-900 resize-none placeholder:text-gray-500"
                                        />
                                        <div className="mt-1.5 sm:mt-2 flex gap-1.5 sm:gap-2 justify-end">
                                          <button
                                            onClick={() => {
                                              setReplyingToReply(null);
                                              setReplyToReplyText('');
                                            }}
                                            className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-gray-600 hover:text-gray-800"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={() => handleSubmitReplyToReply(comment.id, reply.id, reply.author.displayName || reply.author.name, reply.content)}
                                            disabled={submitting || !replyToReplyText.trim()}
                                            className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                                          >
                                            Reply
                                          </button>
                                        </div>
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
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
