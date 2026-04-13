import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { fetchChatMessages, sendChatMessage } from '../lib/db';
import { useAuth } from '../lib/auth';
import { useAppContext } from '../lib/AppContext';
import type { ChatMessage } from '../types';

// ── Helpers ──────────────────────────────────────────────────

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const formatDateSeparator = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
};

const shouldShowDateSeparator = (messages: ChatMessage[], index: number) => {
  if (index === 0) return true;
  const prev = new Date(messages[index - 1].createdAt).toDateString();
  const curr = new Date(messages[index].createdAt).toDateString();
  return prev !== curr;
};

// ── Component ────────────────────────────────────────────────

export const GlobalChat: React.FC = () => {
  const { session } = useAuth();
  const { profiles } = useAppContext();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const userId = session?.user?.id;

  // Profile lookup helper
  const getProfile = (id: string) => profiles.find(p => p.id === id);

  // ── Load initial messages ──
  useEffect(() => {
    if (!userId) return;
    fetchChatMessages(100).then(setMessages).catch(console.error);
  }, [userId]);

  // ── Realtime subscription ──
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('global-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg: ChatMessage = {
            id: payload.new.id,
            senderId: payload.new.sender_id,
            content: payload.new.content,
            createdAt: payload.new.created_at,
          };
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          // Increment unread if chat is closed or user is scrolled up
          if (!isOpen || !isAtBottom) {
            setUnread(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, isOpen, isAtBottom]);

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAtBottom]);

  // ── Focus input when opened ──
  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [isOpen]);

  // ── Scroll tracking ──
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 40;
    setIsAtBottom(atBottom);
    if (atBottom) setUnread(0);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setIsAtBottom(true);
      setUnread(0);
    }
  };

  // ── Send message ──
  const handleSend = async () => {
    if (!input.trim() || !userId || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    try {
      await sendChatMessage(userId, text);
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      setInput(text); // restore on failure
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

  if (!userId) return null;

  return (
    <>
      {/* ── Chat Panel ── */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 md:right-6 w-[340px] md:w-[380px] h-[500px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} className="text-primary" />
              <span className="font-bold text-sm">Chat del Estudio</span>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                {profiles.filter(p => p.isActive).length} miembros
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
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
            {messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center h-full text-muted-foreground text-sm">
                No hay mensajes aun. Inicia la conversacion.
              </div>
            )}

            {messages.map((msg, i) => {
              const isOwn = msg.senderId === userId;
              const sender = getProfile(msg.senderId);
              const showAvatar = !isOwn && (i === 0 || messages[i - 1].senderId !== msg.senderId);
              const showName = showAvatar;
              const showDateSep = shouldShowDateSeparator(messages, i);

              return (
                <React.Fragment key={msg.id}>
                  {showDateSep && (
                    <div className="flex items-center gap-2 py-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {formatDateSeparator(msg.createdAt)}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}

                  <div className={cn('flex gap-2', isOwn ? 'justify-end' : 'justify-start')}>
                    {/* Avatar for others */}
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
                      <div
                        className={cn(
                          'px-3 py-1.5 rounded-2xl text-sm break-words',
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted text-foreground rounded-bl-md'
                        )}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-muted-foreground mt-0.5 px-1">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Scroll-to-bottom button */}
          {!isAtBottom && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
              <button
                onClick={scrollToBottom}
                className="flex items-center gap-1 px-3 py-1 bg-card border border-border rounded-full shadow-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown size={14} />
                {unread > 0 ? `${unread} nuevos` : 'Ir abajo'}
              </button>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2 border-t border-border bg-card">
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
        </div>
      )}

      {/* ── Floating Button ── */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          'fixed bottom-4 right-4 md:right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95',
          isOpen
            ? 'bg-muted text-foreground hover:bg-muted/80'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30'
        )}
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
        {!isOpen && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    </>
  );
};
