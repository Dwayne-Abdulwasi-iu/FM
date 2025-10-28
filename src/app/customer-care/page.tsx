'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Send, Phone, Video, MoreHorizontal, ArrowLeft, Shield, User } from 'lucide-react'

interface ChatMessage {
  id: string
  message: string
  senderId: string
  senderName: string
  senderRole: 'USER' | 'ADMIN'
  timestamp: string
  isRead: boolean
}

interface ChatSession {
  id: string
  status: 'ACTIVE' | 'CLOSED'
  createdAt: string
  lastMessage?: ChatMessage
}

export default function CustomerCarePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [chatSession, setChatSession] = useState<ChatSession | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting')

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin')
      return
    }
    initializeChat()
  }, [session, router])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const initializeChat = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/customer-care/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const session = await response.json()
        setChatSession(session)
        await loadMessages(session.id)
        setConnectionStatus('connected')
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error)
      setConnectionStatus('disconnected')
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/customer-care/messages?sessionId=${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !chatSession || sending) return

    setSending(true)
    const messageText = newMessage.trim()
    setNewMessage('')

    try {
      const response = await fetch('/api/customer-care/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: chatSession.id,
          message: messageText,
        }),
      })

      if (response.ok) {
        const newMsg = await response.json()
        setMessages(prev => [...prev, newMsg])
        
        // Simulate admin response after a short delay (for demo purposes)
        setTimeout(() => {
          simulateAdminResponse(messageText)
        }, 1500)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setNewMessage(messageText) // Restore message on error
    } finally {
      setSending(false)
    }
  }

  const simulateAdminResponse = (userMessage: string) => {
    setIsTyping(true)
    
    setTimeout(() => {
      const responses = [
        "Thank you for contacting our customer care team. How can I assist you today?",
        "I understand your concern. Let me help you with that.",
        "That's a great question! Let me provide you with the information you need.",
        "I'll look into this for you right away. Please give me a moment.",
        "Thanks for reaching out. I'm here to help resolve any issues you might have."
      ]
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      
      const adminMessage: ChatMessage = {
        id: Date.now().toString(),
        message: randomResponse,
        senderId: 'admin-demo',
        senderName: 'Customer Care Agent',
        senderRole: 'ADMIN',
        timestamp: new Date().toISOString(),
        isRead: false
      }
      
      setMessages(prev => [...prev, adminMessage])
      setIsTyping(false)
    }, 2000)
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h1>
          <p className="text-gray-600 mb-6">Please sign in to access customer care</p>
          <button 
            onClick={() => router.push('/auth/signin')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Connecting to customer care...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Customer Care</h1>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-green-500' :
                      connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-sm text-gray-500">
                      {connectionStatus === 'connected' ? 'Online' :
                       connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Voice call">
                <Phone className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Video call">
                <Video className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="More options">
                <MoreHorizontal className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-4 space-y-4">
          {/* Welcome Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-900">Welcome to Customer Care!</p>
                <p className="text-sm text-blue-700">We're here to help. Ask us anything about your account, orders, or our platform.</p>
              </div>
            </div>
          </div>

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderRole === 'USER' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.senderRole === 'USER'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}>
                <div className="flex items-center space-x-2 mb-1">
                  {message.senderRole === 'ADMIN' && (
                    <Shield className="h-3 w-3 text-indigo-600" />
                  )}
                  {message.senderRole === 'USER' && (
                    <User className="h-3 w-3 text-white" />
                  )}
                  <span className={`text-xs font-medium ${
                    message.senderRole === 'USER' ? 'text-indigo-100' : 'text-gray-600'
                  }`}>
                    {message.senderName}
                  </span>
                </div>
                <p className="text-sm">{message.message}</p>
                <p className={`text-xs mt-1 ${
                  message.senderRole === 'USER' ? 'text-indigo-200' : 'text-gray-500'
                }`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-900 border border-gray-200 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="h-3 w-3 text-indigo-600" />
                  <span className="text-xs font-medium text-gray-600">Customer Care Agent</span>
                </div>
                <div className="flex items-center space-x-1 mt-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <form onSubmit={sendMessage} className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-black placeholder-gray-500"
                disabled={sending || connectionStatus !== 'connected'}
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending || connectionStatus !== 'connected'}
              className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
          
          <div className="mt-2 text-xs text-gray-500 text-center">
            {connectionStatus === 'connected' ? (
              'Connected to customer care • Typically replies in a few minutes'
            ) : (
              'Reconnecting to customer care...'
            )}
          </div>
        </div>
      </div>
    </div>
  )
}