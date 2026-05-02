import { useState, useEffect, useRef } from 'react'
import {
  Search, Send, MessageSquare, MoreVertical, Paperclip,
  Check, CheckCheck, User, Building2, ShoppingBag, X
} from 'lucide-react'
import useChatStore from '../../store/chatStore'
import useAuthStore from '../../store/authStore'
import useStatusStore from '../../store/statusStore'
import { formatDistanceToNow } from 'date-fns'
import { capitalize } from '../../utils/helpers'

export default function ChatPage() {
  const { user } = useAuthStore()
  const {
    conversations, activeConversation, messages, isLoading,
    fetchConversations, setActiveConversation, sendMessage, uploadImage
  } = useChatStore()
  const { onlineStatuses, setInitialStatuses } = useStatusStore()
  const [msgInput, setMsgInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    fetchConversations().then(() => {
      // Collect all participants to initialize status
      const allUsers = useChatStore.getState().conversations.flatMap(c => c.participants)
      setInitialStatuses(allUsers)
    })
    return () => setActiveConversation(null)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    if (!msgInput.trim()) return
    sendMessage(msgInput)
    setMsgInput('')
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !activeConversation) return
    setIsUploading(true)
    try {
      await uploadImage(file, activeConversation.id)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const filteredConversations = conversations.filter(c => {
    const other = c.participants.find(p => p.id !== user?.id)
    return other?.username.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Get the display name and avatar for a conversation
  const getOtherUser = (conv) => {
    return conv.participants.find(p => p.id !== user?.id) || {}
  }

  // Icons for better context
  const RoleIcon = ({ role }) => {
    if (role === 'shelter_staff') return <Building2 size={12} className="text-orange-500" />
    if (role === 'seller') return <ShoppingBag size={12} className="text-orange-500" />
    return <User size={12} className="text-gray-400" />
  }

  return (
    <div className="container" style={{ 
      paddingTop: '80px', height: 'calc(100vh - 40px)', display: 'flex',
      background: 'var(--gray-950)', borderRadius: '24px', overflow: 'hidden',
      boxShadow: 'var(--shadow-lg)'
    }}>
      {/* Sidebar: Conversations */}
      <div style={{
        width: '320px', display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.05)', background: 'var(--gray-850)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px' }}>Messages</h2>
            <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '10px 10px 10px 38px',
                background: 'rgba(128,128,128,0.05)', border: '1px solid rgba(128,128,128,0.1)',
                borderRadius: '12px', color: 'var(--gray-100)', fontSize: '.85rem'
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
          {filteredConversations.map(conv => {
            const other = getOtherUser(conv)
            const isActive = activeConversation?.id === conv.id
            const lastMsg = conv.last_message
            
            return (
              <div
                key={conv.id}
                onClick={() => setActiveConversation(conv)}
                style={{
                  padding: '12px 16px', borderRadius: '16px', cursor: 'pointer',
                  marginBottom: '4px', transition: 'all 0.2s ease',
                  background: isActive ? 'rgba(249,115,22,0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(249,115,22,0.2)' : '1px solid transparent'
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    {other.avatar ? (
                      <img src={other.avatar} alt={other.username} style={{ width: 44, height: 44, borderRadius: '14px', objectFit: 'cover' }} />
                    ) : (
                      <div className="avatar" style={{ width: 44, height: 44, borderRadius: '14px', fontSize: '1rem' }}>{other.username?.slice(0,2).toUpperCase()}</div>
                    )}
                    <div style={{ position: 'absolute', bottom: -2, right: -2, padding: 3, borderRadius: '50%', background: 'var(--gray-900)' }}>
                      <RoleIcon role={other.role} />
                    </div>
                    {/* Status Dot */}
                    <div style={{
                      position: 'absolute', top: -2, right: -2, width: 12, height: 12,
                      borderRadius: '50%', border: '2px solid var(--gray-900)',
                      background: onlineStatuses[other.id]?.is_online ? '#10b981' : '#6b7280'
                    }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontSize: '.9rem', fontWeight: 600, color: isActive ? 'var(--orange-500)' : 'var(--gray-100)' }}>{other.username}</span>
                      {conv.unread_count > 0 && (
                        <span style={{ fontSize: '.65rem', fontWeight: 800, background: 'var(--orange-500)', color: '#fff', width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{conv.unread_count}</span>
                      )}
                    </div>
                    <p style={{ fontSize: '.78rem', color: 'var(--gray-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lastMsg ? lastMsg.content : 'No messages yet'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main: Chat Window */}
      <div style={{ 
        flex: 1, display: 'flex', flexDirection: 'column', 
        background: 'var(--gray-900)', 
        borderLeft: '1px solid rgba(128,128,128,0.1)'
      }}>
        {activeConversation ? (
          <>
            {/* Header */}
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid rgba(128,128,128,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-100)' }}>{getOtherUser(activeConversation).username}</span>
                    <span style={{ fontSize: '.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(249,115,22,0.1)', color: 'var(--orange-400)', fontWeight: 600 }}>
                      {capitalize(getOtherUser(activeConversation).role?.replace('_', ' ') || 'User')}
                    </span>
                  </div>
                  <span style={{ 
                    fontSize: '.75rem', 
                    marginTop: '2px',
                    color: onlineStatuses[getOtherUser(activeConversation).id]?.is_online ? '#10b981' : 'var(--gray-400)' 
                  }}>
                    {onlineStatuses[getOtherUser(activeConversation).id]?.is_online 
                      ? '🟢 Online' 
                      : `Last seen: ${onlineStatuses[getOtherUser(activeConversation).id]?.last_active ? formatDistanceToNow(new Date(onlineStatuses[getOtherUser(activeConversation).id].last_active), { addSuffix: true }) : 'offline'}`
                    }
                  </span>
                </div>
              </div>
              <button style={{ background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}><MoreVertical size={20} /></button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              {isLoading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>Loading history...</div>
              ) : messages.map((m, idx) => {
                const isMine = m.sender === user?.id
                return (
                  <div key={m.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMine ? 'flex-end' : 'flex-start',
                    maxWidth: '75%',
                    alignSelf: isMine ? 'flex-end' : 'flex-start'
                  }}>
                    <div style={{
                      padding: m.image ? '8px' : '12px 18px',
                      borderRadius: isMine ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      background: isMine ? 'var(--orange-500)' : 'var(--gray-800)',
                      color: isMine ? '#fff' : 'var(--gray-100)',
                      fontSize: '.93rem', lineHeight: 1.5,
                      border: '1px solid rgba(128,128,128,0.1)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      maxHeight: m.image ? '500px' : 'none'
                    }}>
                      {m.image ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <img 
                            src={m.image} 
                            alt="uploaded chat" 
                            style={{ 
                              maxWidth: '100%', 
                              borderRadius: '14px', 
                              display: 'block',
                              objectFit: 'cover'
                            }} 
                          />
                          {m.content && <span style={{ padding: '4px 8px' }}>{m.content}</span>}
                        </div>
                      ) : m.content}
                    </div>
                    <span style={{ fontSize: '.68rem', color: 'var(--gray-500)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                      {isMine && (m.is_read ? <CheckCheck size={13} className="text-blue-500" /> : <Check size={13} />)}
                    </span>
                  </div>
                )
              })}
            </div>

            <div style={{ padding: '20px 24px' }}>
              <input 
                type="file" 
                hidden 
                ref={fileInputRef} 
                accept="image/*" 
                onChange={handleImageUpload} 
              />
              <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px', background: 'var(--gray-850)', border: '1px solid rgba(128,128,128,0.2)', borderRadius: '18px', padding: '10px 14px' }}>
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  style={{ background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}
                >
                  <Paperclip size={20} className={isUploading ? 'spinner' : ''} />
                </button>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  style={{ flex: 1, background: 'none', border: 'none', color: 'var(--gray-100)', fontSize: '.95rem', outline: 'none' }}
                />
                <button
                  type="submit"
                  disabled={!msgInput.trim()}
                  style={{
                    width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--orange-500)', border: 'none', borderRadius: '12px', color: '#fff',
                    cursor: 'pointer', transition: 'all 0.2s', opacity: msgInput.trim() ? 1 : 0.4
                  }}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569', gap: '16px' }}>
            <div style={{ width: 80, height: 80, borderRadius: '30px', background: 'rgba(249,115,22,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orange-400)' }}>
              <MessageSquare size={40} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', fontWeight: 600, marginBottom: '8px' }}>Select a conversation</h3>
              <p style={{ fontSize: '.85rem' }}>Stay connected with shelter staff and sellers.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
