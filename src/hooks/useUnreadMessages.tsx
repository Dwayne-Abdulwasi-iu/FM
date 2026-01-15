'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { notificationManager } from '@/lib/notification-manager';

interface UnreadCommission {
  commissionId: string;
  commissionTitle: string;
  unreadCount: number;
  role: 'CLIENT' | 'DESIGNER';
}

interface UnreadData {
  totalUnread: number;
  commissions: UnreadCommission[];
}

interface UseUnreadMessagesReturn {
  totalUnread: number;
  commissionsUnread: Map<string, number>;
  loading: boolean;
  refresh: () => void;
}

export function useUnreadMessages(): UseUnreadMessagesReturn {
  const { data: session } = useSession();
  const [totalUnread, setTotalUnread] = useState(0);
  const [commissionsUnread, setCommissionsUnread] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchUnreadCounts = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    
    try {
      // Use shared manager to avoid duplicate requests
      const data = await notificationManager.fetchMessages() as UnreadData | null;
      if (data) {
        setTotalUnread(data.totalUnread || 0);
        
        // Create a map of commissionId -> unreadCount
        const unreadMap = new Map<string, number>();
        for (const commission of (data.commissions || [])) {
          unreadMap.set(commission.commissionId, commission.unreadCount);
        }
        setCommissionsUnread(unreadMap);
      }
    } catch (error) {
      console.error('Failed to fetch unread counts:', error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchUnreadCounts();
    
    // Subscribe to shared polling manager
    const unsubscribe = notificationManager.subscribe(fetchUnreadCounts);
    
    // Also listen for legacy events (backwards compatibility)
    const handleMessageRead = () => fetchUnreadCounts();
    window.addEventListener('messagesRead', handleMessageRead);
    
    return () => {
      unsubscribe();
      window.removeEventListener('messagesRead', handleMessageRead);
    };
  }, [fetchUnreadCounts]);

  return {
    totalUnread,
    commissionsUnread,
    loading,
    refresh: fetchUnreadCounts
  };
}

// Badge component for showing unread count on commission cards
export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  
  return (
    <span className="inline-flex items-center gap-1 bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full animate-pulse">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      {count} new
    </span>
  );
}
