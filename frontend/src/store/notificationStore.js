import { create } from 'zustand'
import { getNotifications, markRead, markAllRead, deleteNotification } from '../api/notificationApi'
import useAuthStore from './authStore'
import { toast } from 'react-hot-toast'

let wsInstance = null;

const connectWebSocket = (set, get) => {
  if (wsInstance) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Backend always on 8000 in dev
  const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? '127.0.0.1:8000' 
      : (window.location.port === '5174' ? `${window.location.hostname}:8000` : window.location.host);
  
  const token = localStorage.getItem('access_token');
  const wsUrl = token 
    ? `${protocol}//${host}/ws/notifications/?token=${token}`
    : `${protocol}//${host}/ws/notifications/`;
  
  wsInstance = new WebSocket(wsUrl);
  console.log(`[WS] Connecting to: ${wsUrl}`);

  wsInstance.onopen = () => {
    console.log('%c[WS] Connected ✅', 'color: #10b981; font-weight: bold;');
  };

  wsInstance.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[WS] Message:', data);
      
      // 1. Handle Global Updates (Shop, Booking, Bootcamp, Generic System)
      if (['SHOP_UPDATE', 'BOOKING_UPDATE', 'BOOTCAMP_UPDATE', 'SYSTEM_UPDATE'].includes(data.type)) {
          const listeners = get().systemListeners || [];
          listeners.forEach(cb => {
            if (data.type === 'SYSTEM_UPDATE') {
              cb(data.event_type, data.data);
            } else {
              cb(data.type, data.data);
            }
          });
          
          // Optional: Add global visual feedback for system events
          if (data.type === 'BOOKING_UPDATE' && data.data?.status === 'confirmed') {
            toast.success('Your booking has been updated! 🔔', { icon: '📅' });
          }
          return;
      }

      // 2. Handle Personal Notifications (Objects without explicit 'type' prefix)
      set((state) => {
        // Prevent duplicates
        if (state.notifications.some(n => n.id === data.id)) return state;
        
        // Immediate UI alert
        toast(data.message || 'New notification arrived!', {
          icon: '🔔',
          style: {
            background: 'var(--gray-900)',
            color: '#fff',
            border: '1px solid var(--orange-500)',
            borderRadius: '12px'
          }
        });

        return {
          notifications: [data, ...state.notifications],
          unreadCount: state.unreadCount + 1
        };
      });
    } catch (e) {
      console.error('[WS] Error:', e);
    }
  };

  wsInstance.onclose = (e) => {
    wsInstance = null;
    console.log('%c[WS] Disconnected ❌', 'color: #ef4444; font-weight: bold;', e.reason);
    // Try to reconnect in 5 seconds
    setTimeout(() => {
      connectWebSocket(set, get);
    }, 5000);
  };
};

const disconnectWebSocket = () => {
  if (wsInstance) {
    wsInstance.close();
    wsInstance = null;
  }
};

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  systemListeners: [],

  addSystemListener: (cb) => set((s) => ({ systemListeners: [...s.systemListeners, cb] })),
  removeSystemListener: (cb) => set((s) => ({ systemListeners: s.systemListeners.filter(l => l !== cb) })),

  initWebSocket: () => {
    connectWebSocket(set, get);
  },

  closeWebSocket: () => {
    disconnectWebSocket();
  },

  fetchNotifications: async () => {
    try {
      const { data } = await getNotifications()
      const list = data.results || data
      set({ notifications: list, unreadCount: list.filter((n) => !n.is_read).length })
    } catch { /* ignore */ }
  },

  markOne: async (id) => {
    await markRead(id)
    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, is_read: true } : n),
      unreadCount: Math.max(0, s.unreadCount - (s.notifications.find(n => n.id === id)?.is_read ? 0 : 1)),
    }))
  },

  deleteOne: async (id) => {
    await deleteNotification(id)
    set((s) => {
      const target = s.notifications.find(n => n.id === id);
      const isUnread = target && !target.is_read;
      return {
        notifications: s.notifications.filter((n) => n.id !== id),
        unreadCount: Math.max(0, s.unreadCount - (isUnread ? 1 : 0)),
      }
    })
  },

  markAll: async () => {
    await markAllRead()
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }))
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0, systemListeners: [] })
  },
}))

export default useNotificationStore
