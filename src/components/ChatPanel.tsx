import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  MessageCircle, Send, X, ChevronDown, ChevronLeft,
  Plus, Users, User, Search, Hash,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import {
  fetchConversations,
  fetchConversationMessages,
  sendConversationMessage,
  createConversation,
  findDirectConversation,
} from '../lib/db';
import { useAuth } from '../lib/auth';
import { useAppContext } from '../lib/AppContext';
import type { Conversation, ConversationMessage } from '../types';

// ── Helpers ──────────────────────────────────────────────────

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

const formatDateSep = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
};

const showDateSep = (msgs: ConversationMessage[], i: number) => {
  if (i === 0) return true;
  return new Date(msgs[i - 1].createdAt).toDateString() !== new Date(msgs[i].createdAt).toDateString();
};

const formatLastTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return formatTime(iso);
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
};

type View = 'list' | 'chat' | 'new';
type NewMode = 'direct' | 'group';

// ── Component ────────────────────────────────────────────────

export const ChatPanel: React.FC = () => {
  const { session } = useAuth();
  const { profiles } = useAppContext();
  const userId = session?.user?.id;

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<View>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // New conversation state
  const [newMode, setNewMode] = useState<NewMode>('direct');
  const [newSearch, setNewSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<string[]>([]);

  // Track which conversations have been "seen" by the user
  const seenRef = useRef<Set<string>>(new Set());
  // Track last known message id per conversation for unread tracking
  const lastSeenMsgRef = useRef<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getProfile = useCallback((id: string) => profiles.find(p => p.id === id), [profiles]);
  const activeProfiles = useMemo(() => profiles.filter(p => p.isActive && p.id !== userId), [profiles, userId]);

  // ── Conversation display name ──
  const convName = useCallback((conv: Conversation) => {
    if (conv.type === 'group') return conv.name || 'Grupo';
    const otherId = conv.memberIds.find(id => id !== userId);
    return otherId ? getProfile(otherId)?.fullName || 'Usuario' : 'Chat';
  }, [userId, getProfile]);

  const convInitials = useCallback((conv: Conversation) => {
    if (conv.type === 'group') return conv.name?.[0]?.toUpperCase() || 'G';
    const otherId = conv.memberIds.find(id => id !== userId);
    return otherId ? getProfile(otherId)?.initials || '??' : '??';
  }, [userId, getProfile]);

  // ── Load conversations ──
  const loadConversations = useCallback(async () => {
    if (!userId) return;
    setLoadingConvs(true);
    try {
      const convs = await fetchConversations();
      setConversations(convs);

      // Calculate unread
      let total = 0;
      for (const c of convs) {
        if (c.lastMessage && !seenRef.current.has(c.id)) {
          const lastSeen = lastSeenMsgRef.current[c.id];
          if (!lastSeen || lastSeen !== c.lastMessage.id) {
            total++;
          }
        }
      }
      setUnreadTotal(total);
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoadingConvs(false);
    }
  }, [userId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── Load messages for active conversation ──
  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const msgs = await fetchConversationMessages(convId, 100);
      setMessages(msgs);
      // Mark as seen
      seenRef.current.add(convId);
      if (msgs.length > 0) {
        lastSeenMsgRef.current[convId] = msgs[msgs.length - 1].id;
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  // ── Open a conversation ──
  const openConversation = useCallback((convId: string) => {
    setActiveConvId(convId);
    setView('chat');
    setMessages([]);
    loadMessages(convId);

    // Recalculate unread
    seenRef.current.add(convId);
    setConversations(prev => {
      let total = 0;
      for (const c of prev) {
        if (c.lastMessage && c.id !== convId && !seenRef.current.has(c.id)) {
          const lastSeen = lastSeenMsgRef.current[c.id];
          if (!lastSeen || lastSeen !== c.lastMessage.id) total++;
        }
      }
      setUnreadTotal(total);
      return prev;
    });
  }, [loadMessages]);

  // ── Realtime subscription ──
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-messages-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversation_messages' },
        (payload) => {
          const msg: ConversationMessage = {
            id: payload.new.id,
            conversationId: payload.new.conversation_id,
            senderId: payload.new.sender_id,
            content: payload.new.content,
            createdAt: payload.new.created_at,
          };

          // If this is the active conversation, add to messages
          if (msg.conversationId === activeConvId) {
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            lastSeenMsgRef.current[msg.conversationId] = msg.id;
          } else {
            // Increment unread
            if (msg.senderId !== userId) {
              setUnreadTotal(prev => prev + 1);
            }
          }

          // Update last message in conversation list
          setConversations(prev =>
            prev.map(c =>
              c.id === msg.conversationId
                ? { ...c, lastMessage: msg }
                : c
            ).sort((a, b) => {
              const aTime = a.lastMessage?.createdAt || a.createdAt;
              const bTime = b.lastMessage?.createdAt || b.createdAt;
              return new Date(bTime).getTime() - new Date(aTime).getTime();
            })
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, activeConvId]);

  // ── Auto-scroll ──
  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAtBottom]);

  // ── Focus input ──
  useEffect(() => {
    if (isOpen && view === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isOpen, view, activeConvId]);

  // ── Scroll tracking ──
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 40);
  };

  // ── Send message ──
  const handleSend = async () => {
    if (!input.trim() || !userId || !activeConvId || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      await sendConversationMessage(activeConvId, userId, text);
    } catch (err) {
      console.error('Error sending message:', err);
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Start direct conversation ──
  const startDirect = async (otherId: string) => {
    if (!userId) return;
    try {
      // Check if DM already exists
      let conv = await findDirectConversation(userId, otherId);
      if (!conv) {
        conv = await createConversation('direct', [userId, otherId], userId);
        setConversations(prev => [conv!, ...prev]);
      }
      openConversation(conv.id);
    } catch (err) {
      console.error('Error creating DM:', err);
    }
  };

  // ── Create group ──
  const createGroup = async () => {
    if (!userId || !groupName.trim() || groupMembers.length === 0) return;
    try {
      const allMembers = [userId, ...groupMembers];
      const conv = await createConversation('group', allMembers, userId, groupName.trim());
      setConversations(prev => [conv, ...prev]);
      setGroupName('');
      setGroupMembers([]);
      setNewSearch('');
      openConversation(conv.id);
    } catch (err) {
      console.error('Error creating group:', err);
    }
  };

  // ── Back to list ──
  const backToList = () => {
    setView('list');
    setActiveConvId(null);
    setMessages([]);
    loadConversations();
  };

  // ── Sorted conversations ──
  const sortedConvs = useMemo(() =>
    [...conversations].sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.createdAt;
      const bTime = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    }),
    [conversations]
  );

  const activeConv = conversations.find(c => c.id === activeConvId);

  // ── Filtered profiles for new conversation ──
  const filteredProfiles = useMemo(() => {
    if (!newSearch.trim()) return activeProfiles;
    const q = newSearch.toLowerCase();
    return activeProfiles.filter(p =>
      p.fullName.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    );
  }, [activeProfiles, newSearch]);

  if (!userId) return null;

  return (
    <>
      {/* ── Panel ── */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 md:right-6 w-[380px] md:w-[400px] h-[560px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">

          {/* ═══ LIST VIEW ═══ */}
          {view === 'list' && (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <MessageCircle size={18} className="text-primary" />
                  <span className="font-bold text-sm">Mensajes</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setView('new'); setNewMode('direct'); setNewSearch(''); setGroupName(''); setGroupMembers([]); }}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    title="Nueva conversacion"
                  >
                    <Plus size={18} />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingConvs && conversations.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : sortedConvs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2 px-6 text-center">
                    <MessageCircle size={32} className="opacity-30" />
                    <p>No hay conversaciones</p>
                    <button
                      onClick={() => { setView('new'); setNewMode('direct'); }}
                      className="text-primary text-xs font-semibold hover:underline"
                    >
                      Iniciar una conversacion
                    </button>
                  </div>
                ) : (
                  sortedConvs.map(conv => {
                    const name = convName(conv);
                    const initials = convInitials(conv);
                    const lastMsg = conv.lastMessage;
                    const senderName = lastMsg ? (lastMsg.senderId === userId ? 'Vos' : getProfile(lastMsg.senderId)?.fullName?.split(' ')[0] || '') : '';
                    const preview = lastMsg ? `${senderName}: ${lastMsg.content}` : 'Sin mensajes';
                    const isUnseen = lastMsg && !seenRef.current.has(conv.id) && lastSeenMsgRef.current[conv.id] !== lastMsg.id && lastMsg.senderId !== userId;

                    return (
                      <button
                        key={conv.id}
                        onClick={() => openConversation(conv.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shrink-0',
                          conv.type === 'group'
                            ? 'bg-violet-500/15 text-violet-600'
                            : 'bg-primary/10 text-primary'
                        )}>
                          {conv.type === 'group' ? <Users size={16} /> : initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn('text-sm truncate', isUnseen ? 'font-bold text-foreground' : 'font-medium text-foreground')}>
                              {name}
                            </span>
                            {lastMsg && (
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {formatLastTime(lastMsg.createdAt)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn('text-xs truncate', isUnseen ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                              {preview}
                            </span>
                            {isUnseen && (
                              <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* ═══ CHAT VIEW ═══ */}
          {view === 'chat' && activeConv && (
            <>
              {/* Header */}
              <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
                <button
                  onClick={backToList}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0',
                  activeConv.type === 'group'
                    ? 'bg-violet-500/15 text-violet-600'
                    : 'bg-primary/10 text-primary'
                )}>
                  {activeConv.type === 'group' ? <Users size={14} /> : convInitials(activeConv)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{convName(activeConv)}</div>
                  {activeConv.type === 'group' && (
                    <div className="text-[10px] text-muted-foreground truncate">
                      {activeConv.memberIds.map(id => getProfile(id)?.fullName?.split(' ')[0]).filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
              >
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No hay mensajes aun
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isOwn = msg.senderId === userId;
                    const sender = getProfile(msg.senderId);
                    const showAvatar = !isOwn && (i === 0 || messages[i - 1].senderId !== msg.senderId);
                    const showName = showAvatar && activeConv.type === 'group';
                    const showDate = showDateSep(messages, i);

                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && (
                          <div className="flex items-center gap-2 py-2">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              {formatDateSep(msg.createdAt)}
                            </span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                        )}
                        <div className={cn('flex gap-2', isOwn ? 'justify-end' : 'justify-start')}>
                          {!isOwn && (
                            <div className="w-7 shrink-0">
                              {showAvatar && (
                                <div
                                  className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black"
                                  title={sender?.fullName}
                                >
                                  {sender?.initials || '??'}
                                </div>
                              )}
                            </div>
                          )}
                          <div className={cn('max-w-[75%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
                            {showName && (
                              <span className="text-[10px] font-bold text-muted-foreground mb-0.5 px-1">
                                {sender?.fullName || 'Usuario'}
                              </span>
                            )}
                            <div className={cn(
                              'px-3 py-1.5 rounded-2xl text-sm break-words',
                              isOwn
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-muted text-foreground rounded-bl-md'
                            )}>
                              {msg.content}
                            </div>
                            <span className="text-[9px] text-muted-foreground mt-0.5 px-1">
                              {formatTime(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
              </div>

              {/* Scroll-to-bottom */}
              {!isAtBottom && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
                  <button
                    onClick={() => {
                      if (scrollRef.current) {
                        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                        setIsAtBottom(true);
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-card border border-border rounded-full shadow-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown size={14} /> Ir abajo
                  </button>
                </div>
              )}

              {/* Input */}
              <div className="px-3 py-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 px-3 py-2 bg-muted/50 border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all outline-none"
                    maxLength={2000}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className={cn(
                      'p-2 rounded-xl transition-all',
                      input.trim()
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md'
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                    )}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ═══ NEW CONVERSATION VIEW ═══ */}
          {view === 'new' && (
            <>
              {/* Header */}
              <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
                <button
                  onClick={backToList}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="font-bold text-sm">Nueva conversacion</span>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border">
                <button
                  onClick={() => setNewMode('direct')}
                  className={cn(
                    'flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5',
                    newMode === 'direct'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <User size={14} /> Directo
                </button>
                <button
                  onClick={() => setNewMode('group')}
                  className={cn(
                    'flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5',
                    newMode === 'group'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Users size={14} /> Grupo
                </button>
              </div>

              {/* Search */}
              <div className="px-3 pt-3 pb-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={newSearch}
                    onChange={e => setNewSearch(e.target.value)}
                    placeholder={newMode === 'direct' ? 'Buscar persona...' : 'Buscar miembros...'}
                    className="w-full pl-9 pr-3 py-2 bg-muted/50 border border-border/50 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Group name + selected members */}
              {newMode === 'group' && (
                <div className="px-3 pb-2 space-y-2">
                  <input
                    type="text"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    placeholder="Nombre del grupo"
                    className="w-full px-3 py-2 bg-muted/50 border border-border/50 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  {groupMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {groupMembers.map(id => {
                        const p = getProfile(id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-[11px] font-medium"
                          >
                            {p?.fullName?.split(' ')[0]}
                            <button
                              onClick={() => setGroupMembers(prev => prev.filter(m => m !== id))}
                              className="hover:text-primary/70"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Profile list */}
              <div className="flex-1 overflow-y-auto">
                {filteredProfiles.map(p => {
                  const isSelected = groupMembers.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (newMode === 'direct') {
                          startDirect(p.id);
                        } else {
                          if (isSelected) {
                            setGroupMembers(prev => prev.filter(m => m !== p.id));
                          } else {
                            setGroupMembers(prev => [...prev, p.id]);
                          }
                        }
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left',
                        isSelected && 'bg-primary/5'
                      )}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-black shrink-0">
                        {p.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{p.fullName}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{p.role}</div>
                      </div>
                      {newMode === 'group' && (
                        <div className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                          isSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-border'
                        )}>
                          {isSelected && <span className="text-[10px] font-bold">✓</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Create group button */}
              {newMode === 'group' && groupMembers.length > 0 && groupName.trim() && (
                <div className="px-3 py-2 border-t border-border">
                  <button
                    onClick={createGroup}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"
                  >
                    <Hash size={15} />
                    Crear grupo ({groupMembers.length + 1} miembros)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Floating Button ── */}
      <button
        onClick={() => {
          setIsOpen(prev => {
            if (!prev) {
              // Opening: reset to list view
              setView('list');
              setUnreadTotal(0);
              loadConversations();
            }
            return !prev;
          });
        }}
        className={cn(
          'fixed bottom-4 right-4 md:right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95',
          isOpen
            ? 'bg-muted text-foreground hover:bg-muted/80'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30'
        )}
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
        {!isOpen && unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadTotal > 99 ? '99+' : unreadTotal}
          </span>
        )}
      </button>
    </>
  );
};
