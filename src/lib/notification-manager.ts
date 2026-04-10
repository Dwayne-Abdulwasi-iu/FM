/**
 * Shared notification polling manager
 * Prevents duplicate API calls when multiple components poll the same endpoints
 * 
 * SSR-safe: Guards against server-side execution where window/setInterval don't exist
 */

type Listener = () => void;

interface CachedData {
  data: unknown;
  timestamp: number;
}

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

class NotificationManager {
  private listeners: Set<Listener> = new Set();
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private messageCache: CachedData | null = null;
  private notificationCache: CachedData | null = null;
  // Pending promises to prevent race conditions on concurrent calls
  private messageFetchPromise: Promise<unknown> | null = null;
  private notificationFetchPromise: Promise<unknown> | null = null;
  private readonly CACHE_TTL = 5000; // 5 seconds cache
  private readonly POLL_INTERVAL = 30000; // 30 seconds

  /**
   * Cleanup resources - used during HMR to prevent memory leaks
   */
  cleanup() {
    this.stopPolling();
    this.listeners.clear();
    this.messageCache = null;
    this.notificationCache = null;
    this.messageFetchPromise = null;
    this.notificationFetchPromise = null;
  }

  /**
   * Subscribe to notification updates
   * Returns unsubscribe function
   */
  subscribe(listener: Listener): () => void {
    // Only allow subscriptions in browser
    if (!isBrowser) {
      return () => {}; // No-op unsubscribe for SSR
    }
    
    this.listeners.add(listener);
    
    // Start polling if this is the first subscriber
    if (this.listeners.size === 1) {
      this.startPolling();
    }
    
    return () => {
      this.listeners.delete(listener);
      // Stop polling if no more subscribers
      if (this.listeners.size === 0) {
        this.stopPolling();
      }
    };
  }

  private startPolling() {
    if (!isBrowser || this.pollingInterval) return;
    
    this.pollingInterval = setInterval(() => {
      this.notifyListeners();
    }, this.POLL_INTERVAL);
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private notifyListeners() {
    // Invalidate caches
    this.messageCache = null;
    this.notificationCache = null;
    
    this.listeners.forEach(listener => listener());
  }

  /**
   * Trigger an immediate refresh (e.g., after reading a message)
   */
  triggerRefresh() {
    this.notifyListeners();
  }

  /**
   * Fetch messages with deduplication
   * Uses pending promise pattern to prevent concurrent duplicate requests
   */
  async fetchMessages(): Promise<unknown> {
    if (!isBrowser) return null;
    
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.messageCache && (now - this.messageCache.timestamp) < this.CACHE_TTL) {
      return this.messageCache.data;
    }
    
    // If there's already a pending request, wait for it instead of making a new one
    if (this.messageFetchPromise) {
      return this.messageFetchPromise;
    }
    
    // Create new fetch promise
    this.messageFetchPromise = (async () => {
      try {
        const res = await fetch('/api/messages/unread-count');
        if (res.ok) {
          const data = await res.json();
          this.messageCache = { data, timestamp: Date.now() };
          return data;
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        // Clear pending promise
        this.messageFetchPromise = null;
      }
      return null;
    })();
    
    return this.messageFetchPromise;
  }

  /**
   * Fetch notifications with deduplication
   * Uses pending promise pattern to prevent concurrent duplicate requests
   */
  async fetchNotifications(limit = 10): Promise<unknown> {
    if (!isBrowser) return null;
    
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.notificationCache && (now - this.notificationCache.timestamp) < this.CACHE_TTL) {
      return this.notificationCache.data;
    }
    
    // If there's already a pending request, wait for it
    if (this.notificationFetchPromise) {
      return this.notificationFetchPromise;
    }
    
    // Create new fetch promise
    this.notificationFetchPromise = (async () => {
      try {
        const res = await fetch(`/api/notifications?limit=${limit}`);
        if (res.ok) {
          const data = await res.json();
          this.notificationCache = { data, timestamp: Date.now() };
          return data;
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        // Clear pending promise
        this.notificationFetchPromise = null;
      }
      return null;
    })();
    
    return this.notificationFetchPromise;
  }
}

// Singleton instance
export const notificationManager = new NotificationManager();

// HMR cleanup to prevent memory leaks during development
type HMRModule = { hot?: { dispose: (callback: () => void) => void } }
// HMR cleanup when available
if (isBrowser) {
  const mod = (globalThis as unknown as { module?: HMRModule }).module
  if (mod?.hot) {
    mod.hot.dispose(() => {
      notificationManager.cleanup();
    })
  }
}

// Helper to dispatch refresh event (for backwards compatibility)
export function dispatchMessagesRead() {
  notificationManager.triggerRefresh();
  // Also dispatch legacy event for components not yet migrated
  if (isBrowser) {
    window.dispatchEvent(new CustomEvent('messagesRead'));
  }
}

export function dispatchNotificationUpdate() {
  notificationManager.triggerRefresh();
  if (isBrowser) {
    window.dispatchEvent(new CustomEvent('notificationUpdate'));
  }
}
