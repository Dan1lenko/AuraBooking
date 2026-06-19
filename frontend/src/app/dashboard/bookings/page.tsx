'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { CalendarRange, Calendar, Clock, User, LogOut, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import NotificationsBell from '../components/notifications';

export default function SpecialistBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'CONFIRMED' | 'PAST'>('PENDING');

  useEffect(() => {
    api.get('/bookings')
      .then(res => setBookings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categoryTranslation: Record<string, string> = {
    Therapy: 'Терапія',
    Coaching: 'Наставництво',
    Massage: 'Масаж',
    Consulting: 'Консультації',
    Design: 'Дизайн'
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await api.patch(`/bookings/${id}`, { status });
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    } catch (err) {
      alert('Не вдалося оновити статус.');
    }
  };

  const handleLogout = async () => {
    await api.post('/auth/logout');
    window.location.href = '/login';
  };

  const filtered = bookings.filter(b => {
    if (activeTab === 'PENDING') return b.status === 'PENDING';
    if (activeTab === 'CONFIRMED') return b.status === 'CONFIRMED';
    return b.status === 'COMPLETED' || b.status === 'CANCELLED';
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100">Очікує</span>;
      case 'CONFIRMED':
        return <span className="px-2.5 py-0.5 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100">Підтверджено</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200">Завершено</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-100">Скасовано</span>;
      default:
        return null;
    }
  };

  const getPaymentBadge = (booking: any) => {
    if (booking.payment?.status === 'SUCCEEDED') {
      return <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-100 uppercase">Оплачено</span>;
    }
    return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full border border-slate-200 uppercase">Неоплачено</span>;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <p className="text-slate-400 text-sm font-semibold">Завантаження списку розкладів...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 animate-fade-in">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between bg-white border border-slate-200 p-4 md:px-6 md:py-3 rounded-xl shadow-sm gap-4">
          <nav className="flex gap-2 md:gap-4 overflow-x-auto whitespace-nowrap scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
            >
              <User className="w-4 h-4" />
              Редагувати профіль
            </Link>
            <Link
              href="/dashboard/schedule"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Керувати розкладом
            </Link>
            <Link
              href="/dashboard/bookings"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg bg-blue-50 text-blue-700 transition-colors"
            >
              <CalendarRange className="w-4 h-4" />
              Керування бронюваннями
            </Link>
            <Link
              href="/dashboard/chat"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Повідомлення
            </Link>
          </nav>
          <div className="flex items-center justify-end gap-2">
            <NotificationsBell />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer w-full md:w-auto justify-center"
            >
              <LogOut className="w-3.5 h-3.5" />
              Вийти
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 md:p-8 space-y-6">
          <header className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Керування бронюваннями</h1>
              <p className="text-slate-500 text-xs mt-0.5">Підтверджуйте нові запити, завершуйте узгоджені сесії або скасовуйте їх.</p>
            </div>
          </header>

          {/* Sub tabs */}
          <div className="flex gap-2 border-b border-slate-100 pb-3">
            {(['PENDING', 'CONFIRMED', 'PAST'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-1.5 px-4 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === tab
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                {tab === 'PENDING' ? 'Очікують підтвердження' : tab === 'CONFIRMED' ? 'Підтверджені' : 'Історія'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filtered.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-12">Немає бронювань у цій категорії.</p>
            ) : (
              filtered.map((b) => (
                <div key={b.id} className="border border-slate-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800">{b.client?.name || b.client?.email}</h4>
                      {getStatusBadge(b.status)}
                      {getPaymentBadge(b)}
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 text-xs pt-1">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(b.startTime).toLocaleDateString('uk-UA', { dateStyle: 'medium' })}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(b.startTime).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {b.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(b.id, 'CANCELLED')}
                          className="flex items-center gap-1.5 py-1.5 px-3 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Відхилити
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(b.id, 'CONFIRMED')}
                          className="flex items-center gap-1.5 py-1.5 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Підтвердити
                        </button>
                      </>
                    )}
                    {b.status === 'CONFIRMED' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(b.id, 'CANCELLED')}
                          className="flex items-center gap-1.5 py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Скасувати запис
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(b.id, 'COMPLETED')}
                          className="flex items-center gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Позначити як завершене
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
