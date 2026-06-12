'use client';

import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { Bell, CalendarCheck, Clock, MessageSquare, Check, X, Loader2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';

export default function NotificationsBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // 1. Fetch current user and notifications history
  useEffect(() => {
    api.get('/auth/me')
      .then((res) => {
        setCurrentUser(res.data.user);
      })
      .catch(() => {});

    api.get('/notifications')
      .then((res) => {
        setNotifications(res.data);
      })
      .catch(() => {});

    // Close dropdown on clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 2. Connect to Socket.io to listen for real-time notifications
  useEffect(() => {
    if (!currentUser) return;

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

        socket.on('new_notification', (notif: any) => {
          setNotifications((prev) => {
            // Avoid duplicates
            if (prev.some((n) => n.id === notif.id)) return prev;
            return [notif, ...prev];
          });
        });
      })
      .catch(() => {});

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentUser]);

  const handleMarkAsRead = async (id: number, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {}
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      try {
        await api.put(`/notifications/${notif.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
      } catch (err) {}
    }
    setIsOpen(false);

    // Contextual redirection based on notification type
    if (notif.type === 'MESSAGE') {
      router.push('/dashboard/chat');
    } else if (notif.type?.startsWith('BOOKING') || notif.type === 'REMINDER') {
      if (currentUser?.role === 'SPECIALIST') {
        router.push('/dashboard/bookings');
      } else {
        router.push('/dashboard');
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':
        return (
          <div className="w-8 h-8 rounded-xl bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
            <CalendarCheck className="w-4.5 h-4.5" />
          </div>
        );
      case 'REMINDER':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4.5 h-4.5" />
          </div>
        );
      case 'MESSAGE':
        return (
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4.5 h-4.5" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4.5 h-4.5" />
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 hover:bg-slate-50 border border-slate-200 shadow-sm rounded-xl text-slate-600 transition-colors cursor-pointer"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 shadow-lg rounded-2xl overflow-hidden z-50 flex flex-col max-h-96 animate-fade-in">
          {/* Header */}
          <header className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Сповіщення</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[10px] text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
              >
                Позначити всі як прочитані
              </button>
            )}
          </header>

          {/* List Scrollable area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-12">Сповіщень не знайдено.</p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex items-start gap-3 p-3.5 hover:bg-slate-50/50 cursor-pointer transition-colors ${
                    !notif.isRead ? 'bg-blue-50/10' : ''
                  }`}
                >
                  {getNotificationIcon(notif.type)}

                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-xs leading-relaxed ${!notif.isRead ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                      {notif.text}
                    </p>
                    <span className="text-[9px] text-slate-400 mt-1 block">
                      {new Date(notif.createdAt).toLocaleDateString('uk-UA', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {!notif.isRead && (
                    <button
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0 cursor-pointer"
                      title="Позначити як прочитане"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
