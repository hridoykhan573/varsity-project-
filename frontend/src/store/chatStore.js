import { create } from 'zustand'
import api from '../api/axiosInstance'

let wsInstance = null

const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoading: false,
  unreadTotal: 0,

  fetchConversations: async () => {
    try {
      const { data } = await api.get('/api/chat/conversations/')
      set({ conversations: data.results || data })
      const total = (data.results || data).reduce((acc, c) => acc + c.unread_count, 0)
      set({ unreadTotal: total })
    } catch (err) {
      console.error('Fetch conversations error', err)
    }
  },

  setActiveConversation: (conv) => {
    set({ activeConversation: conv, messages: [] })
    if (conv) {
      get().fetchMessages(conv.id)
      get().initChatWS(conv.id)
    } else {
      get().closeChatWS()
    }
  },

  fetchMessages: async (convId) => {
    set({ isLoading: true })
    try {
      const { data } = await api.get(`/api/chat/messages/?conversation_id=${convId}`)
      set({ messages: data.results || data, isLoading: false })
      // Mark as read
      await api.post('/api/chat/messages/mark_as_read/', { conversation_id: convId })
      get().fetchConversations() // update unread counts
    } catch (err) {
      set({ isLoading: false })
    }
  },

  sendMessage: (content) => {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      wsInstance.send(JSON.stringify({ message: content }))
    }
  },

  uploadImage: async (file, convId) => {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('conversation_id', convId)
    
    try {
      await api.post('/api/chat/messages/upload_image/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      // The WebSocket will handle the message update for us
    } catch (err) {
      console.error('Image upload error', err)
    }
  },

  initChatWS: (convId) => {
    get().closeChatWS()
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? '127.0.0.1:8000' 
      : (window.location.port === '5174' ? `${window.location.hostname}:8000` : window.location.host)
    
    const token = sessionStorage.getItem('access_token')
    const wsUrl = `${protocol}//${host}/ws/chat/${convId}/?token=${token}`
    
    wsInstance = new WebSocket(wsUrl)
    
    wsInstance.onopen = () => console.log('[ChatWS] Connected ✅')
    wsInstance.onerror = (err) => console.error('[ChatWS] Error ❌', err)
    
    wsInstance.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'CHAT_MESSAGE') {
        set(state => ({
          messages: [...state.messages, data.data]
        }))
        // Automatically mark as read if this is the active chat
        if (get().activeConversation?.id === convId) {
           api.post('/api/chat/messages/mark_as_read/', { conversation_id: convId })
        }
      }
    }

    wsInstance.onclose = () => {
      wsInstance = null
    }
  },

  closeChatWS: () => {
    if (wsInstance) {
      wsInstance.close()
      wsInstance = null
    }
  },

  clearChat: () => {
    get().closeChatWS()
    set({ conversations: [], activeConversation: null, messages: [], unreadTotal: 0 })
  }
}))

export default useChatStore
