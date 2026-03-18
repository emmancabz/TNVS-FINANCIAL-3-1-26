import { useEffect, useMemo, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { supabase } from '@/database/supabase'
import { useLocation } from 'react-router-dom'

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
  const [currentUser, setCurrentUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [messageError, setMessageError] = useState('')
  const [members, setMembers] = useState([])
  const [memberError, setMemberError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [adminQuery, setAdminQuery] = useState('')
  const [selectedAdmin, setSelectedAdmin] = useState(null)
  const [conversationId, setConversationId] = useState(null) // Added state for conversation_id
  const bottomRef = useRef(null)
  const didPrefillRef = useRef(false)
  const location = useLocation()

  useEffect(() => {
    if (didPrefillRef.current) return
    const statePrefill = location?.state?.prefill
    const queryPrefill = new URLSearchParams(location?.search || '').get('prefill')
    const prefill = typeof statePrefill === 'string' ? statePrefill : typeof queryPrefill === 'string' ? decodeURIComponent(queryPrefill) : ''
    if (!prefill) return
    setMessageInput((prev) => (prev.trim().length ? prev : prefill))
    didPrefillRef.current = true
  }, [location])

  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data } = await supabase.auth.getUser()
      setCurrentUser(data?.user ?? null)
    }
    loadCurrentUser()
  }, [])

  useEffect(() => {
    const loadMembers = async () => {
      setMemberError('')
      try {
        const { data, error } = await supabase
          .from('admin_accounts')
          .select('id, display_name, email, role')
          .order('display_name', { ascending: true })
        if (error) throw error
        setMembers(data || [])
      } catch (err) {
        const message = err?.message || err
        setMemberError(message)
      }
    }
    loadMembers()
  }, [])

  useEffect(() => {
    let channel
    const loadMessages = async () => {
      setLoadingMessages(true)
      setMessageError('')
      try {
        // Fetch existing conversation id to use for this channel on load
        const { data: convs } = await supabase.from('admin_conversations').select('id').limit(1)
        if (convs && convs.length > 0) {
          setConversationId(convs[0].id)
        }

        const { data, error } = await supabase
          .from('admin_messages')
          .select('*')
          .order('created_at', { ascending: true })
        if (error) throw error
        setMessages(data || [])
      } catch (err) {
        const message = err?.message || err
        setMessageError(message)
      } finally {
        setLoadingMessages(false)
      }
    }
    loadMessages()

    channel = supabase
      .channel('admin-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_messages' },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        }
      )
      .subscribe()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  useEffect(() => {
    if (!bottomRef.current) return
    bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    setMessageInput('')
    setMessageError('')

    try {
      // Ensure we have a conversation_id before inserting a message
      let currentConvId = conversationId
      if (!currentConvId) {
        const { data: convs } = await supabase.from('admin_conversations').select('id').limit(1)
        if (convs && convs.length > 0) {
          currentConvId = convs[0].id
        } else {
          // Gagawa ng bagong conversation kung wala pa dahil required sa DB schema
          const { data: newConv, error: convError } = await supabase
            .from('admin_conversations')
            .insert({ created_by: currentUser.id })
            .select()
            .single()

          if (convError) throw convError
          currentConvId = newConv.id

          // Optional: I-add din agad sa members ang current user para match sa schema mo
          await supabase.from('admin_conversation_members').insert({
            conversation_id: currentConvId,
            admin_id: currentUser.id
          })
        }
        setConversationId(currentConvId)
      }

      const senderName =
        currentUser?.user_metadata?.display_name ||
        currentUser?.user_metadata?.full_name ||
        currentUser?.email ||
        'Admin'

      const { data, error } = await supabase
        .from('admin_messages')
        .insert({
          conversation_id: currentConvId, // Idinagdag na natin yung required field dito
          sender_id: currentUser.id,
          sender_name: senderName,
          content,
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setMessages((prev) => (prev.some((msg) => msg.id === data.id) ? prev : [...prev, data]))
      }
    } catch (err) {
      setMessageInput(content)
      setMessageError(err.message || String(err))
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
    <div className="p-6 md:p-8 lg:p-10">
      <div className="w-full max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2 tracking-tight">
            Admin Messages
          </h1>
          <p className="text-gray-500">Facility reservation coordination</p>
        </div>
        <span className="text-[11px] uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
          Live
        </span>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-220px)] min-h-[560px]">
        <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-gray-100 bg-white p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Channels</p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-semibold text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-100 transition"
            >
              New
            </button>
          </div>
          <button
            type="button"
            className="w-full text-left px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm font-medium mb-6"
          >
            # general
          </button>

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Members</div>
          {memberError && <div className="text-xs text-red-600">{memberError}</div>}
          {!memberError && members.length === 0 && <div className="text-xs text-gray-500">No members</div>}
          <div className="space-y-2 overflow-y-auto pr-1 min-h-0">
            {members.map((member) => {
              const isMe = member.id === currentUser?.id
              const displayName = member.display_name || member.email || 'Admin'
              return (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 rounded-xl px-2.5 py-2 ${
                    isMe ? 'bg-white border border-gray-200' : 'hover:bg-white'
                  }`}
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-xs font-semibold">
                      {getInitials(displayName)}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white ${
                      isMe ? 'bg-emerald-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      {displayName}
                      {isMe ? ' (you)' : ''}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{member.role || 'Admin'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 bg-white">
            <div>
              <div className="text-sm font-semibold text-gray-900"># general</div>
              <div className="text-xs text-gray-500">All admins · Real-time updates</div>
            </div>
            <input
              type="search"
              placeholder="Search messages..."
              className="hidden md:block bg-white border border-gray-100 text-xs text-gray-600 px-3 py-2 rounded-full focus:outline-none focus:border-gray-200"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4 min-h-0">
            {loadingMessages && <div className="text-sm text-gray-500">Loading messages...</div>}
            {!loadingMessages && messageError && <div className="text-sm text-red-600">{messageError}</div>}
            {!loadingMessages && !messageError && messages.length === 0 && (
              <div className="text-sm text-gray-500">No messages yet. Start the conversation.</div>
            )}
            {!loadingMessages &&
              !messageError &&
              messages.map((message) => {
                const isMe = message.sender_id === currentUser?.id
                return (
                  <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[76%] rounded-2xl px-4 py-3 text-sm ${
                        isMe ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className={`text-[11px] mb-1 ${isMe ? 'text-emerald-100' : 'text-gray-500'}`}>
                        {message.sender_name || 'Admin'} · {formatTimestamp(message.created_at)}
                      </div>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                  </div>
                )
              })}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-gray-100 px-4 py-4 sticky bottom-0 z-10 bg-white">
            <div className="flex items-end gap-3">
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Type a message..."
                rows={2}
                className="flex-1 bg-white border border-gray-100 text-sm text-gray-900 rounded-2xl px-4 py-2.5 resize-none focus:outline-none focus:border-gray-200"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!messageInput.trim()}
                className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-emerald-600 text-white disabled:bg-gray-200 disabled:text-gray-400 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              Messages are visible to all authenticated admins via Supabase realtime.
            </p>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white text-gray-900 shadow-xl overflow-hidden">
            <div className="px-5 py-4 bg-amber-400 flex items-center justify-between">
              <p className="text-sm font-semibold">New Conversation</p>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-sm font-semibold text-gray-900"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <input
                type="search"
                value={adminQuery}
                onChange={(e) => setAdminQuery(e.target.value)}
                placeholder="Search admins..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
              />
              <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
                {filteredMembers.map((member) => {
                  const displayName = member.display_name || member.email || 'Admin'
                  const isSelected = selectedAdmin?.id === member.id
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedAdmin(member)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left ${
                        isSelected ? 'border-amber-300 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-xs font-semibold">
                        {getInitials(displayName)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{displayName}</p>
                        <p className="text-[11px] text-gray-500">{member.email}</p>
                      </div>
                    </button>
                  )
                })}
                {filteredMembers.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-6">No admins found</div>
                )}
              </div>
              <button
                type="button"
                onClick={handleModalStart}
                disabled={!selectedAdmin}
                className="mt-4 w-full rounded-xl bg-gray-900 text-white py-2 text-sm font-semibold disabled:bg-gray-200 disabled:text-gray-500"
              >
                Start Conversation
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default Message