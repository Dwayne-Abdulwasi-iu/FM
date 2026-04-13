"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'CLIENT' | 'DESIGNER';
  message: string;
  attachments?: string[];
  timestamp: string;
  readAt?: string;
}

interface ProgressUpdate {
  id?: string;
  message: string;
  photos: string[];
  timestamp: string;
}

interface CommissionMessagesProps {
  commissionId: string;
  commissionStatus: string;
  isDesigner?: boolean;
}

export function CommissionMessages({ 
  commissionId, 
  commissionStatus,
  isDesigner: _isDesigner = false 
}: CommissionMessagesProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Statuses where messaging is allowed
  const canMessage = [
    'FORWARDED', 'QUOTED', 'PAID', 'IN_PROGRESS', 
    'DELIVERED', 'REVISION', 'DISPUTED'
  ].includes(commissionStatus);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/commission-requests/${commissionId}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
          
          // Dispatch event to update unread counts (GET marks messages as read)
          window.dispatchEvent(new CustomEvent('messagesRead'));
        }
      } catch {
        console.error('Failed to fetch messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    
    // Poll for new messages every 30 seconds
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [commissionId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    setError('');
    setWarning('');

    try {
      const res = await fetch(`/api/commission-requests/${commissionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        
        // Show warning if content was filtered
        if (data.warning) {
          setWarning(data.warning);
          // Auto-dismiss warning after 8 seconds
          setTimeout(() => setWarning(''), 8000);
        }
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to send message');
      }
    } catch {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-gray-50">
      <div className="p-2 sm:p-3 border-b bg-white rounded-t-lg">
        <h4 className="font-medium text-gray-900 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Messages
        </h4>
      </div>

      {/* Messages List */}
      <div className="h-48 sm:h-64 overflow-y-auto p-2 sm:p-3 space-y-2 sm:space-y-3">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-[10px] sm:text-sm text-center py-3 sm:py-4">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg) => {
            const isMyMessage = msg.senderId === session?.user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 ${
                    isMyMessage
                      ? 'bg-pink-500 text-white'
                      : 'bg-white border text-gray-900'
                  }`}
                >
                  {!isMyMessage && (
                    <p className={`text-[9px] sm:text-xs font-medium mb-0.5 sm:mb-1 ${isMyMessage ? 'text-pink-100' : 'text-gray-500'}`}>
                      {msg.senderName} ({msg.senderRole === 'CLIENT' ? 'Client' : 'Designer'})
                    </p>
                  )}
                  <p className="text-[11px] sm:text-sm whitespace-pre-wrap">{msg.message}</p>
                  <p className={`text-[9px] sm:text-xs mt-0.5 sm:mt-1 ${isMyMessage ? 'text-pink-200' : 'text-gray-400'}`}>
                    {formatTime(msg.timestamp)}
                    {isMyMessage && msg.readAt && ' ✓'}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {canMessage ? (
        <div className="p-2 sm:p-3 border-t bg-white rounded-b-lg">
          {error && (
            <p className="text-red-500 text-[10px] sm:text-xs mb-1.5 sm:mb-2">{error}</p>
          )}
          {warning && (
            <div className="flex items-start gap-1.5 sm:gap-2 p-1.5 sm:p-2 mb-1.5 sm:mb-2 bg-amber-50 border border-amber-200 rounded-lg">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-amber-700 text-[10px] sm:text-xs">{warning}</p>
            </div>
          )}
          <div className="flex gap-1.5 sm:gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-900 resize-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2 sm:p-3 border-t bg-gray-100 rounded-b-lg">
          <p className="text-gray-500 text-[10px] sm:text-sm text-center">
            Messaging is not available for this commission status.
          </p>
        </div>
      )}
    </div>
  );
}

interface ProgressTimelineProps {
  progressUpdates: ProgressUpdate[];
}

export function ProgressTimeline({ progressUpdates }: ProgressTimelineProps) {
  if (!progressUpdates || progressUpdates.length === 0) {
    return null;
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="border rounded-lg bg-white">
      <div className="p-3 border-b">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Progress Updates
        </h4>
      </div>

      <div className="p-3">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-4">
            {progressUpdates.map((update, index) => (
              <div key={update.id || index} className="relative pl-8">
                {/* Timeline dot */}
                <div className="absolute left-1.5 top-1.5 w-3 h-3 bg-pink-500 rounded-full border-2 border-white" />

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{update.message}</p>
                  
                  {/* Progress photos */}
                  {update.photos && update.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {update.photos.map((photo, photoIdx) => (
                        <a
                          key={photoIdx}
                          href={photo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Image
                            src={photo}
                            alt={`Progress ${index + 1} - Photo ${photoIdx + 1}`}
                            width={64}
                            height={64}
                            className="object-cover rounded-lg border hover:opacity-75 transition"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-400 mt-2">
                    {formatDate(update.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
