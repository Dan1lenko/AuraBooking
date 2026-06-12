'use client';

import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { Send, ArrowLeft, CheckCheck, Loader2 } from 'lucide-react';
import NextLink from 'next/link';
import { io, Socket } from 'socket.io-client';

export default function ChatWindowPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = parseInt(params.id as string, 10);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [partner, setPartner] = useState<any>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch user session and initial message history
  useEffect(() => {
    if (!chatId) return;

    setLoading(true);

    api.get('/auth/me')
      .then((res) => {
        setCurrentUser(res.data.user);
      })
      .catch(() => {});

    // Fetch messages & partner details
    api.get(`/chats/${chatId}/messages`)
      .then((res) => {
        setMessages(res.data);
      })
      .catch(() => {
        router.push('/dashboard/chat');
      })
      .finally(() => setLoading(false));

    // Fetch chat info separately to find partner details
    api.get('/chats')
      .then((res) => {
        const currentChat = res.data.find((c: any) => c.id === chatId);
        if (currentChat) {
          const isClient = currentChat.clientId === currentChat.client?.id;
          // Determine if logged-in user is Client or Specialist
          api.get('/auth/me').then((meRes) => {
            const myId = meRes.data.user.id;
            if (currentChat.clientId === myId) {
              setPartner(currentChat.specialistProfile?.user);
            } else {
              setPartner(currentChat.client);
            }
          });
        }
      })
      .catch(() => {});
  }, [chatId, router]);

  // 2. Setup Socket.io client bindings for this chat room
  useEffect(() => {
    if (!currentUser || !chatId) return;

    let socket: Socket;

    api.get('/auth/token')
      .then((res) => {
        const token = res.data.token;
        if (!token) return;

        socket = io(process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001', {
          query: { token },
          transports: ['websocket'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          // Join the specific room for this conversation
          socket.emit('join_chat', { chatId });
        });

        // Listen for new messages in this chat room
        socket.on('new_message', (msg: any) => {
          if (msg.chatId === chatId) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });

            // If we received a message from the other person while looking at the chat, mark it as read
            if (msg.senderId !== currentUser.id) {
              api.patch(`/chats/${chatId}/read`)
                .catch(() => {});
            }
          }
        });

        // Listen for online status updates of the specific partner
        socket.on('user_online', (data: { userId: number }) => {
          if (partner && data.userId === partner.id) {
            setPartnerOnline(true);
          }
        });

        socket.on('user_offline', (data: { userId: number }) => {
          if (partner && data.userId === partner.id) {
            setPartnerOnline(false);
          }
        });
      })
      .catch(() => {});

    return () => {
      if (socket) {
        socket.emit('leave_chat', { chatId });
        socket.disconnect();
      }
    };
  }, [currentUser, chatId, partner]);

  // 3. Auto-scroll to the bottom of the list on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socketRef.current) return;

    const messageText = inputText.trim();
    setInputText('');

    // Emit send_message event
    socketRef.current.emit('send_message', {
      chatId,
      text: messageText,
    });
  };

  const MessageSkeleton = () => (
    <div className="space-y-6 py-4 px-6 flex-1 overflow-y-auto">
      {/* Received message skeleton */}
      <div className="flex justify-start gap-3 animate-pulse">
        <div className="w-9 h-9 rounded-full bg-slate-200" />
        <div className="space-y-2 max-w-[70%]">
          <div className="h-3 bg-slate-200 rounded w-16" />
          <div className="h-10 bg-slate-200 rounded-2xl w-48" />
        </div>
      </div>
      {/* Sent message skeleton */}
      <div className="flex justify-end gap-3 animate-pulse">
        <div className="space-y-2 max-w-[70%]">
          <div className="h-10 bg-slate-200 rounded-2xl w-64" />
        </div>
      </div>
      {/* Received message skeleton */}
      <div className="flex justify-start gap-3 animate-pulse">
        <div className="w-9 h-9 rounded-full bg-slate-200" />
        <div className="space-y-2 max-w-[70%]">
          <div className="h-3 bg-slate-200 rounded w-20" />
          <div className="h-12 bg-slate-200 rounded-2xl w-56" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header Bar */}
      <header className="p-4 border-b border-slate-100 bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <NextLink
            href="/dashboard/chat"
            className="lg:hidden p-1.5 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </NextLink>
          
          <div className="relative">
            {partner?.avatarUrl ? (
              <img
                src={partner.avatarUrl}
                alt={partner.name}
                className="w-10 h-10 rounded-full object-cover border border-slate-100"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                {partner?.name?.slice(0, 2).toUpperCase() || '??'}
              </div>
            )}
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                partnerOnline ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
          </div>

          <div>
            <h3 className="font-bold text-slate-800 text-sm">{partner?.name || 'Loading...'}</h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase">
              {partnerOnline ? 'Active now' : 'Offline'}
            </p>
          </div>
        </div>
      </header>

      {/* Message List area */}
      {loading ? (
        <MessageSkeleton />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-1">
              <span className="text-xs">No messages yet.</span>
              <span className="text-[10px]">Send a greeting to start the conversation!</span>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = currentUser && msg.senderId === currentUser.id;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm relative group flex flex-col ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                    }`}
                  >
                    {/* Message Text */}
                    <p className="leading-relaxed break-words">{msg.text}</p>
                    
                    {/* Timestamp & Read Checkmarks footer */}
                    <div className="flex items-center gap-1 justify-end mt-1 text-[9px] self-end opacity-70">
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isMe && (
                        <CheckCheck
                          className={`w-3.5 h-3.5 ${
                            msg.isRead ? 'text-sky-300' : 'text-slate-300'
                          }`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input Submit form */}
      <footer className="p-4 border-t border-slate-100 bg-white">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all disabled:opacity-50 disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm hover:shadow transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
}
