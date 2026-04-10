/**
 * Socket.IO Route Handler for Next.js App Router
 * Initializes the Socket.IO server on first request
 */

import { NextRequest, NextResponse } from 'next/server'
import { Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { initializeSocketServer } from '@/lib/socket-server'

// Extend NodeJS global to store the Socket.IO server
declare global {
  // eslint-disable-next-line no-var -- declaring an ambient global variable
  var __socketio_server: SocketIOServer | undefined
}

export async function GET(req: NextRequest) {
  // For Socket.IO, we need to upgrade the HTTP connection
  // This is handled differently in production vs development
  
  if (!global.__socketio_server) {
    console.log('[Socket.IO API] Initializing Socket.IO server...')
    
    // Get the HTTP server instance from Next.js
    // Use a narrow typed cast to avoid `any` eslint rule
    const maybeReq = req as unknown as { socket?: { server?: NetServer } }
    const httpServer = maybeReq.socket?.server || new NetServer()
    
    // Initialize Socket.IO server
    global.__socketio_server = initializeSocketServer(httpServer)
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Socket.IO server is running',
    timestamp: new Date().toISOString()
  })
}

// Handle Socket.IO upgrade for WebSocket connections
export async function POST(req: NextRequest) {
  return GET(req)
}