'use client'

import { useState, useEffect, useRef } from 'react'
import React from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Send, Phone, Video, MoreHorizontal, ArrowLeft, Shield, User } from 'lucide-react'
import { DesignerChatBadge } from '@/components/DesignerBadge'

interface ChatMessage {
  id: string
  message: string
  senderId: string
  senderName: string
  senderRole: 'USER' | 'ADMIN'
  senderDesignerTier?: string | null
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


  const initializeChat = React.useCallback(async () => {
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
  }, [])

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin')
      return
    }
    initializeChat()
  }, [session, router, initializeChat])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
          simulateAdminResponse()
        }, 1500)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setNewMessage(messageText) // Restore message on error
    } finally {
      setSending(false)
    }
  }

  const simulateAdminResponse = () => {
    setIsTyping(true)
    
    setTimeout(() => {
      const lastUserMessage = messages[messages.length - 1]?.message.toLowerCase() || ''
      
      let responseText = "Thank you for reaching out. How can I help?"
      
      if (lastUserMessage.includes('pay') || lastUserMessage.includes('paid') || lastUserMessage.includes('payment')) {
        responseText = "Great question! You earn money when buyers purchase your designs. Payments are processed to your bank account monthly via Paystack. Make sure your payout method is configured in your seller settings."
      } else if (lastUserMessage.includes('upload') || lastUserMessage.includes('design')) {
        responseText = "You can upload designs from the Upload page. Supported formats include JPG, PNG, SVG, PDF, and PSD files up to 50MB. Add a title, description, category, tags, and set your price. Once uploaded, it'll be available in the marketplace."
      } else if (lastUserMessage.includes('account') || lastUserMessage.includes('profile')) {
        responseText = "You can manage your account settings from the Profile page. Update your info, change password, view purchase history, and configure seller settings there. Feel free to reach out if you need specific help!"
      } else if (lastUserMessage.includes('order') || lastUserMessage.includes('purchase')) {
        responseText = "You can view all your orders in your Profile under 'My Purchases'. Downloads are available immediately after purchase and remain accessible in your account permanently."
      } else if (lastUserMessage.includes('price') || lastUserMessage.includes('cost')) {
        responseText = "Pricing is flexible - you decide! Consider design complexity, time invested, and market demand. Free designs help you build followers, while premium designs generate revenue. Research similar designs for pricing guidance."
      } else if (lastUserMessage.includes('help') || lastUserMessage.includes('support')) {
        responseText = "I'm here to help! You can also visit our Help Center for FAQs or contact our support team directly from the Contact page. What specific issue can I assist you with?"
      } else {
        const genericResponses = [
          "Thank you for your message! How can I assist you today?",
          "I'm here to help. Could you provide more details about what you need?",
          "That's a great question! Let me help you with that.",
          "Thanks for reaching out. What specific information do you need?"
        ]
        responseText = genericResponses[Math.floor(Math.random() * genericResponses.length)]
      }
      
      const adminMessage: ChatMessage = {
        id: Date.now().toString(),
        message: responseText,
        senderId: 'admin-demo',
        senderName: 'Customer Care Agent',
        senderRole: 'ADMIN',
        timestamp: new Date().toISOString(),
        isRead: false
      }
      
      setMessages(prev => [...prev, adminMessage])
      setIsTyping(false)
    }, 1000)
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Sign In Required</h1>
          <p className="text-xs sm:text-sm text-gray-600 mb-4">Please sign in to access customer care</p>
          <button 
            onClick={() => router.push('/auth/signin')}
            className="bg-indigo-600 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-indigo-700 text-xs sm:text-sm"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin h-6 w-6 sm:h-8 sm:w-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-xs sm:text-sm text-gray-600">Connecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => router.back()}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                title="Go back"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-lg font-semibold text-gray-900 truncate">Customer Care</h1>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0 ${
                      connectionStatus === 'connected' ? 'bg-green-500' :
                      connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-[10px] sm:text-xs text-gray-500 truncate">
                      {connectionStatus === 'connected' ? 'Online' :
                       connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0" title="Voice call" aria-label="Voice call">
                <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0" title="Video call" aria-label="Video call">
                <Video className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0" title="More options" aria-label="More options">
                <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-gray-50 px-2 sm:px-3 py-0 space-y-0">
          {/* Welcome Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-1 sm:p-1.5 mb-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-blue-900 text-[10px] sm:text-xs">Welcome!</p>
                <p className="text-[8px] sm:text-[9px] text-blue-700 line-clamp-1">We're here to help.</p>
              </div>
            </div>
          </div>

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderRole === 'USER' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] sm:max-w-xs lg:max-w-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm ${
                message.senderRole === 'USER'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}>
                <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                  {message.senderRole === 'ADMIN' && (
                    <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-indigo-600 flex-shrink-0" />
                  )}
                  {message.senderRole === 'USER' && (
                    <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white flex-shrink-0" />
                  )}
                  <span className={`text-[9px] sm:text-xs font-medium truncate ${
                    message.senderRole === 'USER' ? 'text-indigo-100' : 'text-gray-600'
                  }`}>
                    {message.senderName}
                  </span>
                  {message.senderDesignerTier && (
                    <DesignerChatBadge tier={message.senderDesignerTier} />
                  )}
                </div>
                <p className="break-words">{message.message}</p>
                <p className={`text-[8px] sm:text-[10px] mt-0.5 sm:mt-1 ${
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
              <div className="bg-white text-gray-900 border border-gray-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-indigo-600 flex-shrink-0" />
                  <span className="text-[9px] sm:text-xs font-medium text-gray-600">Care Agent</span>
                </div>
                <div className="flex items-center gap-0.5 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5 -mt-12 sm:-mt-16 relative z-10">
          <form onSubmit={sendMessage} className="flex items-center gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type message..."
                className="w-full px-2.5 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-black placeholder-gray-500 text-xs sm:text-sm"
                disabled={sending || connectionStatus !== 'connected'}
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending || connectionStatus !== 'connected'}
              className="bg-indigo-600 text-white p-1.5 sm:p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {sending ? (
                <div className="animate-spin h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </button>
          </form>
          
          <div className="mt-1.5 sm:mt-2 text-[8px] sm:text-xs text-gray-500 text-center">
            {connectionStatus === 'connected' ? (
              'Connected • Replies in minutes'
            ) : (
              'Reconnecting...'
            )}
          </div>
        </div>
      </div>
    </div>
  )
}