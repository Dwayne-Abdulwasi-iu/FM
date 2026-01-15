'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'

interface Message {
  id: string
  content: string
  senderId: string
  createdAt: string
  sender: {
    id: string
    name: string | null
    image: string | null
  }
}

interface Conversation {
  user: {
    id: string
    name: string | null
    image: string | null
  }
  lastMessage: {
    content: string
    createdAt: string
    isFromMe: boolean
  }
  unreadCount: number
}

export function MessagingPanel() {
  const { data: session } = useSession()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch conversations
  useEffect(() => {
    if (!session?.user?.id) return
    
    fetchConversations()
    
    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchConversations, 10000)
    return () => clearInterval(interval)
  }, [session?.user?.id])

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation)
    }
  }, [activeConversation])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/messages')
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (userId: string) => {
    try {
      const response = await fetch(`/api/messages?with=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || sending) return

    setSending(true)
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: activeConversation,
          content: newMessage
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, data.message])
        setNewMessage('')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString()
  }

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Please sign in to view messages
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="flex h-[500px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Messages</h3>
        </div>
        
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No conversations yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {conversations.map((conv) => (
              <button
                key={conv.user.id}
                onClick={() => setActiveConversation(conv.user.id)}
                className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  activeConversation === conv.user.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {conv.user.image ? (
                      <Image
                        src={conv.user.image}
                        alt={conv.user.name || ''}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium">
                          {conv.user.name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {conv.user.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {conv.lastMessage.isFromMe ? 'You: ' : ''}
                      {conv.lastMessage.content}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatTime(conv.lastMessage.createdAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <p className="font-medium text-gray-900 dark:text-white">
                {conversations.find(c => c.user.id === activeConversation)?.user.name || 'Chat'}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === session.user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.senderId === session.user?.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${
                      msg.senderId === session.user?.id ? 'text-indigo-200' : 'text-gray-400'
                    }`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? '...' : 'Send'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  )
}
