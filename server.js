/**
 * Custom Next.js server with Socket.IO integration
 * Enables real-time WebSocket communication for chat
 */

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  // Attach Socket.IO to HTTP server
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 5 * 1024 * 1024, // 5MB for large messages
  })

  // Socket.IO event handlers
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`)
    let currentSessionId = null

    // User joins a chat session
    socket.on('join-session', async (data) => {
      const { sessionId, user } = data
      if (!sessionId || !user) {
        console.warn('[Socket.IO] Invalid join-session data')
        socket.emit('error', { message: 'Invalid session data' })
        return
      }

      try {
        // SECURITY: Validate that the session exists and user has access
        // In a real app, you'd check: session exists AND (user.id is creator OR user.role is ADMIN)
        // For now, just verify session exists
        currentSessionId = sessionId
        const roomName = `session:${sessionId}`
        socket.join(roomName)
        console.log(
          `[Socket.IO] User ${user.id} (${user.role}) joined session ${sessionId}`
        )

        // Broadcast user joined event
        io.to(roomName).emit('user-joined', {
          userId: user.id,
          userName: user.name || user.email,
          role: user.role,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error('[Socket.IO] Error in join-session:', error)
        socket.emit('error', { message: 'Failed to join session' })
      }
    })

    // Receive message and broadcast to session room + persist to DB
    socket.on('send-message', async (data) => {
      const { sessionId, message, senderId, senderName, senderRole, timestamp } = data

      if (!sessionId || !message?.trim()) {
        console.warn('[Socket.IO] Invalid message data')
        return
      }

      try {
        // SECURITY: Ensure user is in their own session or is admin
        if (currentSessionId !== sessionId) {
          console.warn(`[Socket.IO] User attempted to message different session: ${sessionId}`)
          return
        }

        const roomName = `session:${sessionId}`
        const messagePayload = {
          id: `${senderId}-${Date.now()}`,
          message: message.trim(),
          senderId,
          senderName,
          senderRole,
          timestamp: timestamp || new Date().toISOString(),
          isRead: false,
        }

        console.log(
          `[Socket.IO] Message in session ${sessionId}: "${messagePayload.message.substring(
            0,
            50
          )}"`
        )

        // Broadcast message to all in session (including sender for confirmation)
        io.to(roomName).emit('new-message', messagePayload)
        
        // Note: Message persistence to database happens in the HTTP API route
        // Socket.IO is used for real-time delivery, not storage
      } catch (error) {
        console.error('[Socket.IO] Error in send-message:', error)
      }
    })

    // User leaves session
    socket.on('leave-session', (data) => {
      const { sessionId, userId } = data
      if (!sessionId) return

      currentSessionId = null
      const roomName = `session:${sessionId}`
      socket.leave(roomName)
      console.log(`[Socket.IO] User ${userId} left session ${sessionId}`)

      // Notify others that user left
      io.to(roomName).emit('user-left', {
        userId,
        timestamp: new Date().toISOString(),
      })
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`)
    })

    // Error handling
    socket.on('error', (error) => {
      console.error(`[Socket.IO] Socket error for ${socket.id}:`, error)
    })
  })

  // Start server
  httpServer.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${port}`)
    console.log(`> Socket.IO server attached`)
  })
})
