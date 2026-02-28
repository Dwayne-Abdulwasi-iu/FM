/**
 * Socket.IO Client Hook for Real-time Chat
 * Manages connection lifecycle and provides message handlers
 */

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface ChatUser {
  id: string
  email: string
  role: 'USER' | 'ADMIN'
  name: string | null
}

interface ChatMessage {
  id?: string
  message: string
  senderId: string
  senderName: string
  senderRole: 'USER' | 'ADMIN'
  timestamp: string
}

interface UseSocketChatProps {
  sessionId: string | null
  user: ChatUser | null
  onNewMessage?: (message: ChatMessage) => void
  onUserJoined?: (data: { userId: string; userName: string; role: string }) => void
  onUserLeft?: (data: { userId: string }) => void
}

export function useSocketChat({
  sessionId,
  user,
  onNewMessage,
  onUserJoined,
  onUserLeft
}: UseSocketChatProps) {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!sessionId || !user) return

    // Create socket connection
    const socketUrl = process.env.NODE_ENV === 'production'
      ? window.location.origin
      : 'http://localhost:3000'

    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    const socket = socketRef.current

    // Connection event handlers
    socket.on('connect', () => {
      console.log('[Socket.IO Client] Connected:', socket.id)
      setIsConnected(true)
      setConnectionError(null)

      // Join the chat session room
      socket.emit('join-session', { sessionId, user })
    })

    socket.on('disconnect', () => {
      console.log('[Socket.IO Client] Disconnected')
      setIsConnected(false)
    })

    socket.on('connect_error', (error: Error) => {
      console.error('[Socket.IO Client] Connection error:', error)
      setConnectionError(error.message)
      setIsConnected(false)
    })

    // Chat event handlers
    socket.on('new-message', (message: ChatMessage) => {
      console.log('[Socket.IO Client] New message received:', message)
      onNewMessage?.(message)
    })

    socket.on('user-joined', (data: { userId: string; userName: string; role: string }) => {
      console.log('[Socket.IO Client] User joined:', data)
      onUserJoined?.(data)
    })

    socket.on('user-left', (data: { userId: string }) => {
      console.log('[Socket.IO Client] User left:', data)
      onUserLeft?.(data)
    })

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.emit('leave-session', { sessionId, userId: user.id })
        socket.disconnect()
        socketRef.current = null
      }
    }
  }, [sessionId, user, onNewMessage, onUserJoined, onUserLeft])

  // Send message function
  const sendMessage = (message: string) => {
    if (!socketRef.current || !sessionId || !user || !message.trim()) {
      return false
    }

    const messageData = {
      sessionId,
      message: message.trim(),
      senderId: user.id,
      senderName: user.name || user.email,
      senderRole: user.role,
      timestamp: new Date().toISOString(),
    }

    socketRef.current.emit('send-message', messageData)
    return true
  }

  return {
    isConnected,
    connectionError,
    sendMessage,
    socket: socketRef.current
  }
}