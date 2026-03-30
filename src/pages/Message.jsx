import { useEffect, useMemo, useRef, useState } from 'react'
import { Send, Edit, Search, Hash, Info, X, MoreVertical } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../database/supabase'

const formatTimestamp = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getInitials = (name) =>
  name
    ? name
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : 'AD'

function Message() {
  const queryClient = useQueryClient()
  const location = useLocation()
  
  // UI States
  const [messageInput, setMessageInput] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [adminQuery, setAdminQuery] = useState('')
  const [selectedAdmin, setSelectedAdmin] = useState(null)
  
  const bottomRef = useRef(null)
  const didPrefillRef = useRef(false)

  // 1. QUERY: Current User
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser()
      return data?.user ?? null
    },
    staleTime: Infinity, // Hindi magbabago ang user habang naka-login
  })

  // 2. QUERY: Admin Members
  const { data: members = [], error: memberErrorObj } = useQuery({
    queryKey: ['adminMembers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_accounts')
        .select('id, display_name, email, role')
        .order('display_name', { ascending: true })
      if (error) throw error
      return data || []
    }
  })
  const memberError = memberErrorObj?.message || ''

  // 3. QUERY: Messages & Conversation ID
  const { data: messageData, isLoading: loadingMessages, error: msgErrorObj } = useQuery({
    queryKey: ['adminMessages'],
    queryFn: async () => {
      let convId = null
      const { data: convs } = await supabase.from('admin_conversations').select('id').limit(1)
      if (convs && convs.length > 0) {
        convId = convs[0].id
      }

      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      
      return { messages: data || [], conversationId: convId }
    }
  })

  const messages = messageData?.messages || []
  const conversationId = messageData?.conversationId || null
  const messageError = msgErrorObj?.message || ''

  // 4. Prefill Logic
  useEffect(() => {
    if (didPrefillRef.current) return
    const statePrefill = location?.state?.prefill
    const queryPrefill = new URLSearchParams(location?.search || '').get('prefill')
    const prefill = typeof statePrefill === 'string' ? statePrefill : typeof queryPrefill === 'string' ? decodeURIComponent(queryPrefill) : ''
    if (!prefill) return
    setMessageInput((prev) => (prev.trim().length ? prev : prefill))
    didPrefillRef.current = true
  }, [location])

  // 5. REALTIME SUBSCRIPTION (Optimistic Update)
  useEffect(() => {
    const channel = supabase
      .channel('admin-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_messages' },
        (payload) => {
          // Instant na ipapasok sa cache yung bagong message para lumabas agad sa screen!
          queryClient.setQueryData(['adminMessages'], (oldData) => {
            if (!oldData) return oldData
            // Check kung nandun na para hindi ma-doble
            const exists = oldData.messages.some((msg) => msg.id === payload.new.id)
            if (exists) return oldData
            return {
              ...oldData,
              messages: [...oldData.messages, payload.new]
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  // 6. AUTO-SCROLL FIX
  useEffect(() => {
    if (bottomRef.current) {
      // Lagyan ng slight delay para siguradong tapos na mag-render ang React
      const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [messages.length]) // Mag-trigger lang kapag nagbago ang bilang ng messages

  const filteredMembers = useMemo(() => {
    if (!adminQuery.trim()) return members
    const query = adminQuery.toLowerCase()
    return members.filter((member) =>
      `${member.display_name ?? ''} ${member.email ?? ''}`.toLowerCase().includes(query)
    )
  }, [members, adminQuery])

  const handleSend = async () => {
    if (!messageInput.trim() || !currentUser?.id) return
    const content = messageInput.trim()
    setMessageInput('') // Clear input agad para instant feel

    try {
      let currentConvId = conversationId
      
      // Kung walang conversation, gumawa ng bago
      if (!currentConvId) {
        const { data: convs } = await supabase.from('admin_conversations').select('id').limit(1)
        if (convs && convs.length > 0) {
          currentConvId = convs[0].id
        } else {
          const { data: newConv, error: convError } = await supabase
            .from('admin_conversations')
            .insert({ created_by: currentUser.id })
            .select()
            .single()

          if (convError) throw convError
          currentConvId = newConv.id

          await supabase.from('admin_conversation_members').insert({
            conversation_id: currentConvId,
            admin_id: currentUser.id
          })
        }
        
        // Update natin yung cache para sa bagong conversation ID
        queryClient.setQueryData(['adminMessages'], (oldData) => ({
          ...oldData,
          conversationId: currentConvId
        }))
      }

      const senderName =
        currentUser?.user_metadata?.display_name ||
        currentUser?.user_metadata?.full_name ||
        currentUser?.email ||
        'Admin'

      const { data, error } = await supabase
        .from('admin_messages')
        .insert({
          conversation_id: currentConvId,
          sender_id: currentUser.id,
          sender_name: senderName,
          content,
        })
        .select()
        .single()

      if (error) throw error

      // Optimistic insert manually sa cache
      if (data) {
        queryClient.setQueryData(['adminMessages'], (oldData) => {
          if (!oldData) return oldData
          const exists = oldData.messages.some((msg) => msg.id === data.id)
          if (exists) return oldData
          return {
            ...oldData,
            messages: [...oldData.messages, data]
          }
        })
      }
    } catch (err) {
      setMessageInput(content) // Ibalik ang message kung nag-error
      console.error("Message send error:", err.message || String(err))
    }
  }

  const handleModalStart = () => {
    if (!selectedAdmin) return
    setMessageInput((prev) => {
      if (prev.trim().length) return prev
      const display = selectedAdmin.display_name || selectedAdmin.email || 'Admin'
      return `@${display} `
    })
    setIsModalOpen(false)
    setAdminQuery('')
    setSelectedAdmin(null)
  }

  return (
    <div className="w-full flex gap-4 md:gap-6 h-[calc(100vh-130px)] min-h-[500px]">
      
      {/* LEFT PANEL: SIDEBAR TABLE/CARD */}
      <div className="hidden md:flex flex-col w-[320px] lg:w-[340px] bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex-shrink-0 overflow-hidden relative">
        {/* Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-gray-100/80 bg-white z-10">
          <h2 className="text-[1.15rem] font-black text-gray-800 tracking-tight">Direct Messages</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 hover:scale-105 transition-all shadow-sm"
          >
            <Edit className="w-[18px] h-[18px]" strokeWidth={2.5} />
          </button>
        </div>
        
        {/* Search */}
        <div className="p-4 bg-white border-b border-gray-100/80 z-10">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-[1rem] text-[13px] text-gray-800 focus:bg-white focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium"
            />
          </div>
        </div>

        {/* Scrollable Members List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-[#fcfcfc]" style={{ scrollbarWidth: 'none' }}>
          
          <div className="px-3 py-2 mt-1 flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Channels</span>
          </div>
          
          <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-emerald-500 text-white cursor-pointer shadow-md shadow-emerald-500/20 transform transition-all active:scale-[0.98]">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Hash className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-bold truncate">Envirocab</h3>
              <p className="text-[11px] text-emerald-50 truncate opacity-90">Company live chat</p>
            </div>
          </div>

          <div className="px-3 pt-6 pb-2 flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
              Admin Members
            </span>
            <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{members.length}</span>
          </div>
          
          {memberError && <div className="text-xs text-red-500 px-3">{memberError}</div>}
          
          <div className="space-y-0.5">
            {members.map((member) => {
              const isMe = member.id === currentUser?.id
              const displayName = member.display_name || member.email || 'Admin'
              return (
                <div key={member.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-gray-100 cursor-pointer transition-colors group">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold shadow-inner group-hover:scale-105 transition-transform">
                      {getInitials(displayName)}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isMe ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-gray-800 truncate">
                      {displayName} 
                      {isMe && <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded ml-1.5 uppercase tracking-wider">You</span>}
                    </p>
                    <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">{member.role || 'System Admin'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: CHAT AREA TABLE/CARD */}
      <div className="flex-1 bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col overflow-hidden relative">
        
        {/* Chat Header */}
        <div className="h-20 px-6 border-b border-gray-100 bg-white/95 backdrop-blur-md flex items-center justify-between z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
              <Hash className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-[1.1rem] font-black text-gray-800">Envirocab</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-emerald-600 font-extrabold tracking-widest uppercase">Live Chat</span>
              </div>
            </div>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Background Subtle Pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #059669 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

        {/* Scrollable Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 z-10 bg-gray-50/30" style={{ scrollbarWidth: 'thin' }}>
          {loadingMessages && (
            <div className="h-full flex items-center justify-center">
              <span className="text-sm font-semibold text-emerald-500 flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full">
                <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                Syncing messages...
              </span>
            </div>
          )}
          {!loadingMessages && messageError && <div className="text-sm text-center text-red-500 font-medium">{messageError}</div>}
          {!loadingMessages && !messageError && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center shadow-inner">
                <Hash className="w-10 h-10 text-emerald-300" />
              </div>
              <p className="text-[13px] font-bold text-gray-500">No messages yet. Break the ice!</p>
            </div>
          )}

          {!loadingMessages && !messageError && messages.map((message) => {
            const isMe = message.sender_id === currentUser?.id
            const senderName = message.sender_name || 'Admin'

            return (
              <div key={message.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex w-full max-w-[85%] md:max-w-[70%] gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar Bubbles */}
                  <div className="flex-shrink-0 mt-auto mb-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${
                      isMe ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
                    }`}>
                      {getInitials(senderName)}
                    </div>
                  </div>
                  
                  {/* Message Body */}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-gray-400 font-bold mb-1.5 px-1 uppercase tracking-wider">
                      {isMe ? 'You' : senderName} <span className="mx-1 text-gray-300">•</span> {formatTimestamp(message.created_at)}
                    </span>
                    <div className={`px-5 py-3 shadow-sm text-[14px] leading-relaxed whitespace-pre-wrap font-medium ${
                      isMe 
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-[24px] rounded-br-[4px] shadow-[0_4px_15px_rgba(16,185,129,0.25)] border border-emerald-400/30' 
                      : 'bg-white border border-gray-100 text-gray-800 rounded-[24px] rounded-bl-[4px] shadow-sm'
                    }`}>
                      {message.content}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Fixed Input Area */}
        <div className="p-4 md:p-5 bg-white border-t border-gray-100 z-20">
          <div className="relative flex items-end gap-2 bg-gray-50 border border-gray-200 p-1.5 rounded-[2rem] shadow-sm max-w-5xl mx-auto focus-within:ring-4 focus-within:ring-emerald-500/10 focus-within:border-emerald-400 focus-within:bg-white transition-all duration-300">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Type your message here..."
              rows={1}
              className="flex-1 bg-transparent border-none text-[14px] font-medium text-gray-800 px-5 py-3.5 resize-none focus:ring-0 focus:outline-none max-h-32 min-h-[52px]"
              style={{ scrollbarWidth: 'none' }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!messageInput.trim()}
              className="h-[46px] w-[46px] mb-0.5 mr-0.5 flex-shrink-0 flex items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-[0_4px_15px_rgba(16,185,129,0.4)] disabled:bg-gray-200 disabled:text-gray-400 transition-all active:scale-90"
            >
              <Send className="w-[18px] h-[18px] ml-0.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

      </div>

      {/* NEW CONVERSATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/20 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-[24px] bg-white shadow-2xl overflow-hidden border border-gray-100 transform scale-100 transition-all">
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-between">
              <p className="text-base font-black text-white tracking-wide">New Conversation</p>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
            <div className="p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  value={adminQuery}
                  onChange={(e) => setAdminQuery(e.target.value)}
                  placeholder="Search admins by name..."
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-[14px] text-sm text-gray-900 font-medium focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                />
              </div>
              
              <div className="mt-5 max-h-60 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: 'thin' }}>
                {filteredMembers.map((member) => {
                  const displayName = member.display_name || member.email || 'Admin'
                  const isSelected = selectedAdmin?.id === member.id
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedAdmin(member)}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl border text-left transition-all ${
                        isSelected 
                        ? 'border-emerald-500 bg-emerald-50 shadow-[0_4px_15px_rgba(16,185,129,0.1)]' 
                        : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${isSelected ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {getInitials(displayName)}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${isSelected ? 'text-emerald-900' : 'text-gray-800'}`}>{displayName}</p>
                        <p className={`text-[11px] font-medium ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`}>{member.email}</p>
                      </div>
                    </button>
                  )
                })}
                {filteredMembers.length === 0 && (
                  <div className="text-sm font-medium text-gray-400 text-center py-8">No admins found.</div>
                )}
              </div>
              <button
                type="button"
                onClick={handleModalStart}
                disabled={!selectedAdmin}
                className="mt-6 w-full rounded-2xl bg-gray-900 hover:bg-gray-800 text-white py-3.5 text-[14px] font-bold disabled:bg-gray-100 disabled:text-gray-400 transition-all shadow-md active:scale-[0.98]"
              >
                Start Conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Message