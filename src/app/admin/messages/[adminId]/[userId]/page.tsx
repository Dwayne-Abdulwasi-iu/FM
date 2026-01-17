'use client'

import { useState, useEffect, useCallback, useRef, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowLeft,
  Send,
  User as UserIcon,
  BadgeCheck,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  ChevronUp,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Message {
  id: string
  content: string
  createdAt: string
  readAt: string | null
  editedAt?: string | null
  sentOnBehalfBy?: string | null
  sender: {
    id: string
    name: string | null
    role: string
    image: string | null
  }
}

interface PaginationData {
  limit: number
  totalCount: number | null
  hasOlder: boolean
  hasNewer: boolean
  oldestCursor: string | null
  newestCursor: string | null
}

interface UserData {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  isVerified: boolean
  designerTier: string | null
}

interface AdminData {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface ConversationData {
  admin: AdminData
  user: UserData
  messages: Message[]
  pagination?: PaginationData
  isViewingOwnConversation: boolean
  canSendOnBehalf: boolean
  canEdit: boolean
}

interface PageProps {
  params: Promise<{ adminId: string; userId: string }>
}

const MAX_MESSAGE_LENGTH = 10000

export default function ConversationPage({ params }: PageProps) {
  const { adminId, userId } = use(params)
  const [data, setData] = useState<ConversationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasOlderMessages, setHasOlderMessages] = useState(false)
  const [oldestCursor, setOldestCursor] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [editContent, setEditContent] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingMessage, setDeletingMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const isInitialLoad = useRef(true)
  const shouldScrollToBottom = useRef(true)

  // Initial fetch only
  const fetchInitialData = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/messages/${adminId}/${userId}?limit=50`)
      const result = await response.json()

      if (response.ok) {
        setData(result)
        // Update pagination state
        if (result.pagination) {
          setHasOlderMessages(result.pagination.hasOlder || (result.messages.length === 50))
          setOldestCursor(result.pagination.oldestCursor)
        }
        isInitialLoad.current = false
        shouldScrollToBottom.current = true
      } else {
        toast.error(result.error || 'Failed to fetch conversation')
      }
    } catch (error) {
      console.error('Error fetching conversation:', error)
      toast.error('Failed to fetch conversation')
    } finally {
      setLoading(false)
    }
  }, [adminId, userId])

  const loadOlderMessages = async () => {
    if (!oldestCursor || loadingOlder) return
    
    setLoadingOlder(true)
    shouldScrollToBottom.current = false // Don't scroll when loading older
    const scrollContainer = messagesContainerRef.current
    const scrollHeightBefore = scrollContainer?.scrollHeight || 0
    
    try {
      const response = await fetch(
        `/api/admin/messages/${adminId}/${userId}?before=${encodeURIComponent(oldestCursor)}&limit=50`
      )
      const result = await response.json()

      if (response.ok && data) {
        // Prepend older messages
        setData({
          ...data,
          messages: [...result.messages, ...data.messages],
        })
        // Update pagination state
        if (result.pagination) {
          setHasOlderMessages(result.pagination.hasOlder || (result.messages.length === 50))
          setOldestCursor(result.pagination.oldestCursor)
        }
        
        // Maintain scroll position after prepending messages
        requestAnimationFrame(() => {
          if (scrollContainer) {
            const scrollHeightAfter = scrollContainer.scrollHeight
            scrollContainer.scrollTop = scrollHeightAfter - scrollHeightBefore
          }
        })
      } else {
        toast.error(result.error || 'Failed to load older messages')
      }
    } catch (error) {
      console.error('Error loading older messages:', error)
      toast.error('Failed to load older messages')
    } finally {
      setLoadingOlder(false)
    }
  }

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  useEffect(() => {
    // Only scroll to bottom on initial load or when sending new messages
    if (shouldScrollToBottom.current && data?.messages.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: isInitialLoad.current ? 'auto' : 'smooth' })
    }
    shouldScrollToBottom.current = true // Reset for next update
  }, [data?.messages])

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return

    if (newMessage.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`)
      return
    }

    setSending(true)
    try {
      const response = await fetch(`/api/admin/messages/${adminId}/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      })

      const result = await response.json()

      if (response.ok) {
        setNewMessage('')
        // Add the new message to the list
        if (data) {
          setData({
            ...data,
            messages: [...data.messages, result.message],
          })
        }
        if (result.sentOnBehalf) {
          toast.success(`Message sent on behalf of ${data?.admin.name || 'admin'}`)
        } else {
          toast.success('Message sent')
        }
      } else {
        toast.error(result.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleEditMessage = (msg: Message) => {
    setEditingMessage(msg)
    setEditContent(msg.content)
  }

  const saveEdit = async () => {
    if (!editingMessage || !editContent.trim()) return

    setSavingEdit(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/message`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: editingMessage.id,
          content: editContent,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // Update message in list
        if (data) {
          setData({
            ...data,
            messages: data.messages.map(m =>
              m.id === editingMessage.id ? { ...m, content: editContent, editedAt: new Date().toISOString() } : m
            ),
          })
        }
        setEditingMessage(null)
        toast.success('Message updated')
      } else {
        toast.error(result.error || 'Failed to update message')
      }
    } catch (error) {
      console.error('Error updating message:', error)
      toast.error('Failed to update message')
    } finally {
      setSavingEdit(false)
    }
  }

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return

    setDeletingMessage(messageId)
    try {
      const response = await fetch(`/api/admin/users/${userId}/message?messageId=${messageId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (response.ok) {
        // Remove message from list
        if (data) {
          setData({
            ...data,
            messages: data.messages.filter(m => m.id !== messageId),
          })
        }
        toast.success('Message deleted')
      } else {
        toast.error(result.error || 'Failed to delete message')
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      toast.error('Failed to delete message')
    } finally {
      setDeletingMessage(null)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
    }
  }

  // Group messages by date
  const groupedMessages = data?.messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {} as Record<string, Message[]>) || {}

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">Failed to load conversation</p>
          <Link href={`/admin/messages/${adminId}`} className="text-indigo-600 hover:underline mt-2 inline-block">
            Back to Users
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link 
          href={`/admin/messages/${adminId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3 flex-1">
          {data.user.image ? (
            <Image
              src={data.user.image}
              alt={data.user.name || 'User'}
              width={44}
              height={44}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-gray-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-gray-900">
                {data.user.name || data.user.email}
              </h1>
              {data.user.isVerified && (
                <BadgeCheck className="w-4 h-4 text-blue-500" />
              )}
            </div>
            <p className="text-sm text-gray-500">{data.user.email}</p>
          </div>
        </div>
        {data.canSendOnBehalf && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">
              Sending as {data.admin.name || data.admin.email}
            </span>
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Load Older Messages Button */}
          {hasOlderMessages && (
            <div className="flex justify-center py-2">
              <button
                onClick={loadOlderMessages}
                disabled={loadingOlder}
                className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition disabled:opacity-50"
              >
                {loadingOlder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Load older messages
                  </>
                )}
              </button>
            </div>
          )}
          
          {Object.entries(groupedMessages).map(([date, messages]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                  {formatDate(messages[0].createdAt)}
                </div>
              </div>

              {/* Messages for this date */}
              {messages.map((msg) => {
                const isAdmin = msg.sender.role === 'ADMIN'
                const canModify = data.canEdit && isAdmin
                const wasSentOnBehalf = !!msg.sentOnBehalfBy

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-3`}
                  >
                    <div className="group relative max-w-[70%]">
                      {/* Sent on behalf indicator */}
                      {wasSentOnBehalf && isAdmin && (
                        <div className="text-xs text-amber-600 text-right mb-1 flex items-center justify-end gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Sent on behalf by main admin</span>
                        </div>
                      )}
                      <div
                        className={`rounded-lg p-3 ${
                          isAdmin
                            ? wasSentOnBehalf 
                              ? 'bg-indigo-500 text-white ring-2 ring-amber-400 ring-offset-1'
                              : 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center gap-2 mt-1 ${isAdmin ? 'text-indigo-200' : 'text-gray-500'}`}>
                          <span className="text-xs">{formatTime(msg.createdAt)}</span>
                          {msg.editedAt && (
                            <span className="text-xs italic">(edited)</span>
                          )}
                        </div>
                      </div>

                      {/* Edit/Delete buttons */}
                      {canModify && (
                        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={() => handleEditMessage(msg)}
                            className="p-1 bg-white rounded-full shadow-md text-gray-600 hover:text-indigo-600"
                            title="Edit"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            disabled={deletingMessage === msg.id}
                            className="p-1 bg-white rounded-full shadow-md text-gray-600 hover:text-red-600 disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingMessage === msg.id ? (
                              <div className="w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {data.messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={data.canSendOnBehalf 
                ? `Send as ${data.admin.name || 'admin'}...` 
                : 'Type a message...'}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              maxLength={MAX_MESSAGE_LENGTH}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
          {newMessage.length > MAX_MESSAGE_LENGTH * 0.9 && (
            <p className="text-xs text-amber-600 mt-1">
              {MAX_MESSAGE_LENGTH - newMessage.length} characters remaining
            </p>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Edit Message</h3>
              <button
                onClick={() => setEditingMessage(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                placeholder="Enter message..."
                maxLength={MAX_MESSAGE_LENGTH}
              />
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setEditingMessage(null)}
                className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={savingEdit || !editContent.trim()}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingEdit ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
