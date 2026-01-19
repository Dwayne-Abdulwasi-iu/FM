'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Bell, 
  MessageSquare, 
  CreditCard, 
  AlertCircle, 
  Package, 
  Trash2, 
  Check, 
  CheckCheck,
  ArrowLeft,
  Filter
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: {
    commissionId?: string;
    orderId?: string;
    [key: string]: unknown;
  };
  isRead: boolean;
  createdAt: string;
}

const NOTIFICATION_ICONS: Record<string, typeof MessageSquare> = {
  COMMISSION_MESSAGE: MessageSquare,
  ORDER_UPDATE: Package,
  PAYMENT: CreditCard,
  SYSTEM: AlertCircle,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  COMMISSION_MESSAGE: 'bg-blue-100 text-blue-600',
  ORDER_UPDATE: 'bg-purple-100 text-purple-600',
  PAYMENT: 'bg-green-100 text-green-600',
  SYSTEM: 'bg-yellow-100 text-yellow-600',
};

const TYPE_LABELS: Record<string, string> = {
  COMMISSION_MESSAGE: 'Messages',
  ORDER_UPDATE: 'Orders',
  PAYMENT: 'Payments',
  SYSTEM: 'System',
};

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const fetchNotifications = async () => {
    try {
      const params = new URLSearchParams();
      if (filter === 'unread') params.append('unread', 'true');
      params.append('limit', '50');
      
      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, filter]);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      fetchNotifications();
      window.dispatchEvent(new CustomEvent('notificationUpdate'));
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
      fetchNotifications();
      window.dispatchEvent(new CustomEvent('notificationUpdate'));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications?id=${notificationId}`, { method: 'DELETE' });
      fetchNotifications();
      window.dispatchEvent(new CustomEvent('notificationUpdate'));
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
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getNotificationLink = (notification: Notification): string | null => {
    if (notification.data?.commissionId) {
      return '/my-commissions';
    }
    if (notification.data?.orderId) {
      return '/profile?tab=orders';
    }
    return null;
  };

  const filteredNotifications = typeFilter 
    ? notifications.filter(n => n.type === typeFilter)
    : notifications;

  // Get unique notification types for filter
  const notificationTypes = [...new Set(notifications.map(n => n.type))];

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-6 h-6" />
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Read/Unread Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
                className="text-sm text-gray-900 border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="Filter by read status"
              >
                <option value="all">All notifications</option>
                <option value="unread">Unread only</option>
              </select>
            </div>

            {/* Type Filter */}
            {notificationTypes.length > 1 && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-sm text-gray-900 border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="Filter by notification type"
              >
                <option value="">All types</option>
                {notificationTypes.map(type => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type] || type}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
              <p className="text-gray-500">
                {filter === 'unread' ? "You're all caught up!" : "You don't have any notifications yet."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => {
                const IconComponent = NOTIFICATION_ICONS[notification.type] || AlertCircle;
                const colorClass = NOTIFICATION_COLORS[notification.type] || 'bg-gray-100 text-gray-600';
                const link = getNotificationLink(notification);
                
                const content = (
                  <div className={`flex items-start gap-4 p-4 hover:bg-gray-50 transition ${
                    !notification.isRead ? 'bg-indigo-50/30' : ''
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-xs text-gray-400">
                          {formatTime(notification.createdAt)}
                        </p>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-400">
                          {TYPE_LABELS[notification.type] || notification.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg transition"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                );
                
                return link ? (
                  <Link 
                    key={notification.id} 
                    href={link}
                    onClick={() => {
                      if (!notification.isRead) markAsRead(notification.id);
                    }}
                    className="block"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/my-commissions"
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            View My Commissions →
          </Link>
          <Link
            href="/seller/commission-requests"
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            View Commission Requests →
          </Link>
        </div>
      </div>
    </div>
  );
}
