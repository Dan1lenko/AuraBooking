'use client';

import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { Search, MessageSquare, Loader2, ArrowLeft, Circle } from 'lucide-react';
import NextLink from 'next/link';
import { io, Socket } from 'socket.io-client';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const isChatOpen = !!params?.id;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<Record<number, boolean>>({});
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // 1. Fetch current user
    api.get('/auth/me')
      .then((res) => {
        setCurrentUser(res.data.user);
      })
      .catch(() => {});

    // 2. Fetch chats list
    api.get('/chats')
      .then((res) => {
        setChats(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Socket connection setup
  useEffect(() => {
    if (!currentUser) return;

    let socket: Socket;

    // Fetch token from secure API proxy
    api.get('/auth/token')
      .then((res) => {
        const token = res.data.token;
        if (!token) return;

        // Connect to Socket.io backend server directly
        socket = io(process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001', {
          query: { token },
          transports: ['websocket'],
        });
        socketRef.current = socket;

        // Request initial online states of other users
        socket.on('connect', () => {
          // Socket.io connection is live
        });

        // Listen for online status updates
        socket.on('user_online', (data: { userId: number }) => {
          setOnlineUsers((prev) => ({ ...prev, [data.userId]: true }));
        });

        socket.on('user_offline', (data: { userId: number }) => {
          setOnlineUsers((prev) => ({ ...prev, [data.userId]: false }));
        });

        // Listen for new messages to update sidebar previews & unread counts
        socket.on('new_message_notification', (data: { chatId: number; message: any }) => {
          setChats((prevChats) => {
            const updated = prevChats.map((chat) => {
              if (chat.id === data.chatId) {
                // If we are currently looking at this chat, we don't increment unread count locally in sidebar
                const isCurrentActive = params?.id && parseInt(params.id as string, 10) === chat.id;
                return {
                  ...chat,
                  messages: [data.message],
                  unreadCount: isCurrentActive ? chat.unreadCount : chat.unreadCount + 1,
                };
              }
              return chat;
            });
            // Re-order active chats to the top
            const targetChat = updated.find((c) => c.id === data.chatId);
            if (targetChat) {
              return [targetChat, ...updated.filter((c) => c.id !== data.chatId)];
            }
            return updated;
          });
        });
      })
      .catch(() => {});

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentUser, params?.id]);

  // Handle active status for chat partner
  useEffect(() => {
    if (chats.length === 0 || !currentUser) return;

    // Query each other participant's online status initially (can be simulated or updated via socket)
    chats.forEach((chat) => {
      const partner = chat.clientId === currentUser.id ? chat.specialistProfile?.user : chat.client;
      if (partner) {
        // Assume offline initially until user_online fires, or we can check via api.
        // For simple reactive status, we start as offline or default.
      }
    });
  }, [chats, currentUser]);

  const getChatPartner = (chat: any) => {
    if (!currentUser) return null;
    if (chat.clientId === currentUser.id) {
      return {
        name: chat.specialistProfile?.user?.name || chat.specialistProfile?.user?.email,
        email: chat.specialistProfile?.user?.email,
        category: chat.specialistProfile?.category,
        avatarUrl: chat.specialistProfile?.avatarUrl,
        userId: chat.specialistProfile?.userId,
      };
    } else {
      return {
        name: chat.client?.name || chat.client?.email,
        email: chat.client?.email,
        category: null,
        avatarUrl: null,
        userId: chat.clientId,
      };
    }
  };

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredChats = chats.filter((chat) => {
    const partner = getChatPartner(chat);
    if (!partner) return false;
    const nameMatch = partner.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = partner.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || emailMatch;
  });

  const handleBackToDashboard = () => {
    // Determine where to redirect based on role
    if (currentUser?.role === 'SPECIALIST') {
      router.push('/dashboard/bookings');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/30 flex items-center justify-center p-4 md:p-6 lg:p-8 animate-fade-in">
      <div className="max-w-6xl w-full h-[calc(100vh-64px)] md:h-[calc(100vh-96px)] bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xl rounded-2xl overflow-hidden flex transition-all duration-300">
        {/* Left Side Pane: Chats list */}
        <aside
          className={`w-full lg:w-80 border-r border-slate-100 flex flex-col h-full bg-white/50 backdrop-blur-sm transition-all duration-200 ${
            isChatOpen ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Header Area */}
          <header className="p-4 border-b border-slate-100/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToDashboard}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600" /> Messages
              </h2>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-slate-200/80 rounded-xl text-xs bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all"
              />
            </div>
          </header>

          {/* Chat List Scrollable section */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50/50 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-xs text-slate-400">Loading conversations...</span>
              </div>
            ) : filteredChats.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-12">No active chats found.</p>
            ) : (
              filteredChats.map((chat) => {
                const partner = getChatPartner(chat);
                const isSelected = params?.id && parseInt(params.id as string, 10) === chat.id;
                const latestMsg = chat.messages?.[0];
                const isOnline = partner ? onlineUsers[partner.userId] : false;

                return (
                  <NextLink
                    key={chat.id}
                    href={`/dashboard/chat/${chat.id}`}
                    onClick={() => {
                      // Mark as read locally in sidebar state immediately
                      setChats((prev) =>
                        prev.map((c) =>
                          c.id === chat.id ? { ...c, unreadCount: 0 } : c
                        )
                      );
                    }}
                    className={`flex items-center gap-3 p-4 text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/50 border-l-4 border-l-blue-600 pl-3 shadow-[inset_1px_0_0_rgba(37,99,235,0.05)]'
                        : 'bg-transparent hover:bg-slate-50/60 hover:translate-x-0.5'
                    }`}
                  >
                    {/* Avatar with Online/Offline indicator */}
                    <div className="relative flex-shrink-0">
                      {partner?.avatarUrl ? (
                        <img
                          src={partner.avatarUrl}
                          alt={partner.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                          {partner?.name?.slice(0, 2).toUpperCase() || '??'}
                        </div>
                      )}
                      {/* Active Status indicator */}
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                          isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      />
                    </div>

                    {/* Middle: Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-800 text-sm truncate pr-2">
                          {partner?.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {formatTimestamp(latestMsg?.createdAt)}
                        </span>
                      </div>
                      
                      {partner?.category && (
                        <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider block mt-0.5">
                          {partner.category}
                        </span>
                      )}

                      <p className={`text-xs truncate mt-1 ${latestMsg && chat.unreadCount > 0 ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                        {latestMsg ? latestMsg.text : 'No messages yet'}
                      </p>
                    </div>

                    {/* Right side: Unread Count Badge */}
                    {chat.unreadCount > 0 && !isSelected && (
                      <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold px-1 animate-pulse">
                        {chat.unreadCount}
                      </span>
                    )}
                  </NextLink>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Side Pane: Children details container */}
        <section
          className={`flex-1 flex flex-col h-full bg-slate-50/50 backdrop-blur-md relative ${
            isChatOpen ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {children}
        </section>
      </div>
    </main>
  );
}
