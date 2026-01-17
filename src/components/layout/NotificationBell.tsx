'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, MessageSquare, CreditCard, AlertCircle, CheckCircle, Package, X, Check, Megaphone } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { notificationManager } from '@/lib/notification-manager';

interface UnreadCommission {
  commissionId: string;
  commissionTitle: string;
  unreadCount: number;
  role: 'CLIENT' | 'DESIGNER';
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: {
    commissionId?: string;
    orderId?: string;
    senderId?: string;
    senderRole?: 'CLIENT' | 'DESIGNER';
    [key: string]: unknown;
  };
  isRead: boolean;
  createdAt: string;
}

interface AdminUpdate {
  id: string;
  subject: string;
  content: string;
  isRead: boolean;
  sentAt: string;
}

type TabType = 'all' | 'messages' | 'notifications' | 'announcements';

const NOTIFICATION_ICONS: Record<string, typeof MessageSquare> = {
  COMMISSION_MESSAGE: MessageSquare,
  ORDER_UPDATE: Package,
  PAYMENT: CreditCard,
  SYSTEM: AlertCircle,
  ADMIN_BROADCAST: Megaphone,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  COMMISSION_MESSAGE: 'bg-blue-100 text-blue-600',
  ORDER_UPDATE: 'bg-purple-100 text-purple-600',
  PAYMENT: 'bg-green-100 text-green-600',
  SYSTEM: 'bg-yellow-100 text-yellow-600',
  ADMIN_BROADCAST: 'bg-indigo-100 text-indigo-600',
};

export function NotificationBell() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [messageUnread, setMessageUnread] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [announcementUnread, setAnnouncementUnread] = useState(0);
  const [commissions, setCommissions] = useState<UnreadCommission[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<AdminUpdate[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  const totalUnread = messageUnread + notificationUnread + announcementUnread;

  // Fetch all data - wrapped in useCallback to avoid stale closures
  const fetchData = useCallback(async () => {
    if (!session) return;
    
    // Only set loading if component is still mounted
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }
    
    try {
      // Use shared manager to deduplicate requests across components
      const [messagesData, notificationsData, updatesRes] = await Promise.all([
        notificationManager.fetchMessages(),
        notificationManager.fetchNotifications(10),
        fetch('/api/updates?limit=5').then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      
      // Guard against state updates after unmount
      if (!isMountedRef.current) return;
      
      if (messagesData) {
        const data = messagesData as { totalUnread?: number; commissions?: UnreadCommission[] };
        setMessageUnread(data.totalUnread || 0);
        setCommissions(data.commissions || []);
      }
      
      if (notificationsData) {
        const data = notificationsData as { unreadCount?: number; notifications?: Notification[] };
        setNotificationUnread(data.unreadCount || 0);
        setNotifications(data.notifications || []);
      }
      
      if (updatesRes) {
        setAnnouncementUnread(updatesRes.unreadCount || 0);
        setAnnouncements(updatesRes.updates || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      if (isMountedRef.current) {
        setError('Failed to load notifications');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [session]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();
    
    // Subscribe to shared polling manager (deduplicates with other components)
    const unsubscribe = notificationManager.subscribe(fetchData);
    
    // Listen for legacy events (backwards compatibility)
    const handleUpdate = () => fetchData();
    window.addEventListener('messagesRead', handleUpdate);
    window.addEventListener('notificationUpdate', handleUpdate);
    
    return () => {
      isMountedRef.current = false;
      unsubscribe();
      window.removeEventListener('messagesRead', handleUpdate);
      window.removeEventListener('notificationUpdate', handleUpdate);
    };
  }, [fetchData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await fetch(`/api/notifications?id=${notificationId}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationLink = (notification: Notification): string => {
    if (notification.data?.commissionId) {
      // Check if the notification was sent TO a designer (meaning sender was CLIENT)
      // If senderRole is CLIENT, we're the DESIGNER and should go to seller page
      // If senderRole is DESIGNER, we're the CLIENT and should go to my-commissions
      if (notification.data?.senderRole === 'CLIENT') {
        return '/seller/commission-requests';
      }
      // Default for clients or if role not specified
      return '/my-commissions';
    }
    if (notification.data?.orderId) {
      return '/profile?tab=orders';
    }
    return '#';
  };

  if (!session) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-gray-800 hover:text-indigo-700 p-1"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-medium animate-pulse">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* Header */}
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {totalUnread > 0 && (
                <p className="text-xs text-gray-500">{totalUnread} unread</p>
              )}
            </div>
            {notificationUnread > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 flex-shrink-0"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 text-xs font-medium transition ${
                activeTab === 'all' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 py-2 text-xs font-medium transition relative ${
                activeTab === 'messages' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Messages
              {messageUnread > 0 && (
                <span className="ml-1 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">
                  {messageUnread}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`flex-1 py-2 text-xs font-medium transition relative ${
                activeTab === 'announcements' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Announce
              {announcementUnread > 0 && (
                <span className="ml-1 bg-indigo-100 text-indigo-600 text-xs px-1.5 py-0.5 rounded-full">
                  {announcementUnread}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 py-2 text-xs font-medium transition relative ${
                activeTab === 'notifications' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Updates
              {notificationUnread > 0 && (
                <span className="ml-1 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">
                  {notificationUnread}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-sm text-red-600 mb-2">{error}</p>
                <button
                  onClick={() => fetchData()}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                {/* Messages Section */}
                {(activeTab === 'all' || activeTab === 'messages') && commissions.length > 0 && (
                  <div>
                    {activeTab === 'all' && (
                      <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                        Unread Messages
                      </div>
                    )}
                    <div className="divide-y divide-gray-50">
                      {commissions.map((commission) => (
                        <Link
                          key={commission.commissionId}
                          href={commission.role === 'CLIENT' ? '/my-commissions' : '/seller/commission-requests'}
                          onClick={() => setIsOpen(false)}
                          className="flex items-start gap-3 p-3 hover:bg-gray-50 transition"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {commission.commissionTitle}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {commission.unreadCount} new message{commission.unreadCount !== 1 ? 's' : ''} from {commission.role === 'CLIENT' ? 'designer' : 'client'}
                            </p>
                          </div>
                          <span className="flex-shrink-0 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {commission.unreadCount}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notifications Section */}
                {(activeTab === 'all' || activeTab === 'notifications') && notifications.length > 0 && (
                  <div>
                    {activeTab === 'all' && commissions.length > 0 && (
                      <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                        Recent Updates
                      </div>
                    )}
                    <div className="divide-y divide-gray-50">
                      {notifications.map((notification) => {
                        const IconComponent = NOTIFICATION_ICONS[notification.type] || AlertCircle;
                        const colorClass = NOTIFICATION_COLORS[notification.type] || 'bg-gray-100 text-gray-600';
                        
                        return (
                          <Link
                            key={notification.id}
                            href={getNotificationLink(notification)}
                            onClick={() => {
                              if (!notification.isRead) markAsRead(notification.id);
                              setIsOpen(false);
                            }}
                            className={`flex items-start gap-3 p-3 hover:bg-gray-50 transition relative group ${
                              !notification.isRead ? 'bg-indigo-50/50' : ''
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatTime(notification.createdAt)}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2" />
                            )}
                            <button
                              onClick={(e) => deleteNotification(notification.id, e)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition"
                              title="Delete notification"
                            >
                              <X className="w-3 h-3 text-gray-400" />
                            </button>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Announcements Section */}
                {(activeTab === 'all' || activeTab === 'announcements') && announcements.length > 0 && (
                  <div>
                    {activeTab === 'all' && (commissions.length > 0 || notifications.length > 0) && (
                      <div className="px-3 py-2 bg-indigo-50 text-xs font-medium text-indigo-600 uppercase flex items-center gap-1">
                        <Megaphone className="w-3 h-3" />
                        Platform Announcements
                      </div>
                    )}
                    <div className="divide-y divide-gray-50">
                      {announcements.slice(0, 3).map((announcement) => (
                        <Link
                          key={announcement.id}
                          href="/updates"
                          onClick={() => setIsOpen(false)}
                          className={`flex items-start gap-3 p-3 hover:bg-gray-50 transition ${
                            !announcement.isRead ? 'bg-indigo-50/50' : ''
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <Megaphone className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!announcement.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                              {announcement.subject}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                              {announcement.content.replace(/<[^>]*>/g, '').substring(0, 60)}...
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatTime(announcement.sentAt)}
                            </p>
                          </div>
                          {!announcement.isRead && (
                            <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2" />
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {((activeTab === 'all' && commissions.length === 0 && notifications.length === 0 && announcements.length === 0) ||
                  (activeTab === 'messages' && commissions.length === 0) ||
                  (activeTab === 'notifications' && notifications.length === 0) ||
                  (activeTab === 'announcements' && announcements.length === 0)) && (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">
                      {activeTab === 'messages' ? 'No unread messages' : 
                       activeTab === 'notifications' ? 'No notifications' : 
                       activeTab === 'announcements' ? 'No announcements' :
                       'You\'re all caught up!'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-100 flex gap-2">
            <Link
              href="/my-commissions"
              onClick={() => setIsOpen(false)}
              className="flex-1 text-center text-xs text-indigo-600 hover:text-indigo-800 py-2 hover:bg-indigo-50 rounded transition"
            >
              Commissions
            </Link>
            <Link
              href="/updates"
              onClick={() => setIsOpen(false)}
              className="flex-1 text-center text-xs text-indigo-600 hover:text-indigo-800 py-2 hover:bg-indigo-50 rounded transition"
            >
              Updates
            </Link>
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="flex-1 text-center text-xs text-indigo-600 hover:text-indigo-800 py-2 hover:bg-indigo-50 rounded transition"
            >
              View All
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
