/**
 * Socket.IO Server Initialization for Real-time Chat
 * Lazily initialized on first request to avoid conflicts with Next.js build
 */

import { Server } from 'socket.io'
import { _IncomingMessage } from 'http'
import type { Socket as ServerSocket } from 'socket.io'

let io: Server | null = null

interface ChatUser {
  id: string
  email: string
  role: 'USER' | 'ADMIN'
  name: string | null
}

interface ChatMessagePayload {
  sessionId: string
  message: string
  senderId: string
  senderName: string
  senderRole: 'USER' | 'ADMIN'
  timestamp: string
}

/**
 * Initialize Socket.IO server
 * Called from the Socket.IO route handler
 */
export function initializeSocketServer(httpServer: any): Server {
  if (io) {
    return io
  }

  io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // Connection event
  io.on('connection', (socket: ServerSocket) => {
    console.log('[Socket.IO] Client connected:', socket.id)

    // User joins a chat session
    socket.on('join-session', (data: { sessionId: string; user: ChatUser }) => {
      const { sessionId, user } = data
      const roomName = `session:${sessionId}`

      socket.join(roomName)
      console.log(`[Socket.IO] User ${user.id} (${user.role}) joined session ${sessionId}`)

      // Broadcast user joined event (optional)
      io?.to(roomName).emit('user-joined', {
        userId: user.id,
        userName: user.name || user.email,
        role: user.role,
      })
    })

    // Receive message and broadcast to room
    socket.on('send-message', (data: ChatMessagePayload) => {
      const { sessionId, ...messageData } = data
      const roomName = `session:${sessionId}`

      console.log(`[Socket.IO] Message in session ${sessionId}: "${messageData.message.substring(0, 50)}"`)

      // Broadcast message to all in session (including sender for confirmation)
      io?.to(roomName).emit('new-message', messageData)
    })

    // User leaves session
    socket.on('leave-session', (data: { sessionId: string; userId: string }) => {
      const { sessionId, userId } = data
      const roomName = `session:${sessionId}`

      socket.leave(roomName)
      console.log(`[Socket.IO] User ${userId} left session ${sessionId}`)

      io?.to(roomName).emit('user-left', { userId })
    })

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('[Socket.IO] Client disconnected:', socket.id)
    })

    // Error handling
    socket.on('error', (error: any) => {
      console.error('[Socket.IO] Socket error:', error)
    })
  })

  console.log('[Socket.IO] Server initialized')
  return io
}

/**
 * Get existing Socket.IO server instance
 */
export function getSocketServer(): Server | null {
  return io
}

/**
 * Gracefully shutdown Socket.IO server
 */
export async function shutdownSocketServer(): Promise<void> {
  if (io) {
    await io.close()
    io = null
    console.log('[Socket.IO] Server shutdown')
  }
}
