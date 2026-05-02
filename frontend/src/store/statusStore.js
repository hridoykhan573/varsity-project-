import { create } from 'zustand'

let wsInstance = null;

const connectStatusWS = (set, get) => {
  if (wsInstance) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? '127.0.0.1:8000' 
      : (window.location.port === '5174' ? `${window.location.hostname}:8000` : window.location.host);
  
  const token = localStorage.getItem('access_token');
  if (!token) return;

  const wsUrl = `${protocol}//${host}/ws/status/?token=${token}`;
  
  wsInstance = new WebSocket(wsUrl);
  console.log(`[Status WS] Connecting to: ${wsUrl}`);

  wsInstance.onopen = () => {
    console.log('%c[Status WS] Connected ✅', 'color: #10b981; font-weight: bold;');
  };

  wsInstance.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'USER_STATUS') {
        set((state) => ({
          onlineStatuses: {
            ...state.onlineStatuses,
            [data.user_id]: {
              is_online: data.is_online,
              last_active: data.last_active
            }
          }
        }));
      }
    } catch (e) {
      console.error('[Status WS] Error parsing message:', e);
    }
  };

  wsInstance.onclose = (e) => {
    wsInstance = null;
    console.log('%c[Status WS] Disconnected ❌', 'color: #ef4444; font-weight: bold;', e.reason);
    // Silent reconnect
    if (localStorage.getItem('access_token')) {
      setTimeout(() => {
        connectStatusWS(set, get);
      }, 5000);
    }
  };
};

const disconnectStatusWS = () => {
  if (wsInstance) {
    wsInstance.close();
    wsInstance = null;
  }
};

const useStatusStore = create((set, get) => ({
  onlineStatuses: {}, // { userId: { is_online: true, last_active: '2023-...' } }

  initStatusWS: () => {
    connectStatusWS(set, get);
  },

  closeStatusWS: () => {
    disconnectStatusWS();
  },

  // This can be used to set initial status fetched from API
  setInitialStatuses: (usersArray) => {
    const statuses = {};
    usersArray.forEach(user => {
      if (user.id !== undefined) {
         statuses[user.id] = {
           is_online: user.is_online,
           last_active: user.last_active
         };
      }
    });
    set((state) => ({
      onlineStatuses: { ...state.onlineStatuses, ...statuses }
    }));
  },

  clearStatus: () => {
    get().closeStatusWS();
    set({ onlineStatuses: {} });
  }
}));

export default useStatusStore;
