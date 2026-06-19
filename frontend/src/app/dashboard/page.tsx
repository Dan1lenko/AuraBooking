'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LogOut, Calendar, Clock, User, XCircle, ShieldAlert, MessageSquare, Star, Search } from 'lucide-react';
import Link from 'next/link';
import NotificationsBell from './components/notifications';
import ReviewDialog from './components/review-dialog';

export default function ClientDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<any>(null);

  // Translation helpers
  const categoryTranslation: Record<string, string> = {
    Therapy: 'Терапія',
    Coaching: 'Наставництво',
    Massage: 'Масаж',
    Consulting: 'Консультації',
    Design: 'Дизайн'
  };

  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        const user = res.data.user;
        setProfile(user);
        if (user.role === 'SPECIALIST') {
          window.location.href = '/dashboard/schedule';
        }
      })
      .catch(() => {});

    api.get('/bookings')
      .then(res => setBookings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await api.post('/auth/logout');
    window.location.href = '/login';
  };

  const handleCancelBooking = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.patch(`/bookings/${cancelTarget.id}`, { status: 'CANCELLED' });
      setBookings(prev => prev.map(b => b.id === cancelTarget.id ? { ...b, status: 'CANCELLED' } : b));
      setCancelTarget(null);
    } catch (err) {
      alert('Не вдалося скасувати бронювання.');
    } finally {
      setCancelling(false);
    }
  };

  const upcoming = bookings.filter(b => b.status === 'PENDING' || b.status === 'CONFIRMED');
  const past = bookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100">Очікує на підтвердження</span>;
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
        <p className="text-slate-400 text-sm font-semibold">Завантаження панелі приладів...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 animate-fade-in">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row items-stretch md:items-center justify-between bg-white border border-slate-200 shadow-sm rounded-2xl p-4 md:p-6 gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-slate-500 font-semibold uppercase tracking-wider">Кабінет клієнта</p>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate">{profile?.name || profile?.email}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/specialists"
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer shadow-sm"
            >
              <Search className="w-3.5 h-3.5" />
              Знайти спеціаліста
            </Link>
            <Link
              href="/dashboard/chat"
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3 md:px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 text-xs md:text-sm font-semibold transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Повідомлення
            </Link>
            <NotificationsBell />
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 text-xs md:text-sm font-semibold transition-colors cursor-pointer w-full md:w-auto mt-2 md:mt-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              Вийти
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming sessions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" /> Найближчі сесії
              </h2>
              {upcoming.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center justify-center gap-4 w-full">
                  <p className="text-slate-400 text-sm">У вас немає запланованих сесій.</p>
                  <Link
                    href="/specialists"
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    Записатись до спеціаліста
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcoming.map((b) => (
                    <div key={b.id} className="border border-slate-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800">{b.specialistProfile?.user?.name}</h4>
                          {getStatusBadge(b.status)}
                          {getPaymentBadge(b)}
                        </div>
                        <p className="text-slate-400 text-xs mt-1 uppercase font-semibold">{categoryTranslation[b.specialistProfile?.category] || b.specialistProfile?.category}</p>
                        <div className="flex items-center gap-3 text-slate-500 text-xs mt-2 font-medium">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(b.startTime).toLocaleDateString('uk-UA', { dateStyle: 'medium' })}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(b.startTime).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setCancelTarget(b)}
                        className="py-1.5 px-3.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-bold transition-colors cursor-pointer self-start md:self-center"
                      >
                        Скасувати сесію
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Past sessions */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-500" /> Історія сесій
              </h2>
              {past.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4">Минулих сесій не знайдено.</p>
              ) : (
                <div className="space-y-3">
                  {past.map((b) => (
                    <div key={b.id} className="border border-slate-100 rounded-xl p-3.5 text-left">
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="font-semibold text-slate-800 text-sm">{b.specialistProfile?.user?.name}</h4>
                        <div className="flex gap-2 items-center">
                          {getStatusBadge(b.status)}
                          {getPaymentBadge(b)}
                        </div>
                      </div>
                      <p className="text-slate-400 text-[10px] uppercase font-semibold mb-2">{categoryTranslation[b.specialistProfile?.category] || b.specialistProfile?.category}</p>
                      <p className="text-slate-500 text-xs font-semibold mb-3">{new Date(b.startTime).toLocaleDateString('uk-UA', { dateStyle: 'short' })}</p>
                      {b.status === 'COMPLETED' && (
                        <div className="mt-2 pt-2 border-t border-slate-50">
                          {b.review ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                              <span className="flex items-center gap-0.5 text-amber-500">
                                {Array.from({ length: b.review.rating }).map((_, i) => (
                                  <Star key={i} className="w-3.5 h-3.5 fill-current text-amber-400" />
                                ))}
                              </span>
                              <span>Відгук залишено</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReviewTarget(b)}
                              className="py-1.5 px-3 border border-blue-200 hover:bg-blue-50 text-blue-600 rounded-lg text-xs font-bold transition-colors cursor-pointer w-full text-center"
                            >
                              Залишити відгук
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cancellation Dialog Overlay */}
        {cancelTarget && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-lg space-y-4">
              <header className="flex items-center gap-3 text-red-600">
                <ShieldAlert className="w-6 h-6" />
                <h3 className="text-lg font-bold text-slate-900">Скасувати сесію</h3>
              </header>
              <p className="text-slate-600 text-sm">
                Ви впевнені, що хочете скасувати сесію з <strong>{cancelTarget.specialistProfile?.user?.name}</strong> {new Date(cancelTarget.startTime).toLocaleDateString('uk-UA')} о {new Date(cancelTarget.startTime).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}? Цю дію не можна скасувати.
              </p>
              <footer className="flex gap-3 pt-2 justify-end">
                <button
                  onClick={() => setCancelTarget(null)}
                  className="py-2 px-4 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 text-sm font-semibold transition-colors cursor-pointer"
                >
                  Зберегти запис
                </button>
                <button
                  onClick={handleCancelBooking}
                  disabled={cancelling}
                  className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {cancelling ? 'Скасування...' : 'Підтвердити скасування'}
                </button>
              </footer>
            </div>
          </div>
        )}

        {/* Review Dialog Overlay */}
        {reviewTarget && (
          <ReviewDialog
            booking={reviewTarget}
            onClose={() => setReviewTarget(null)}
            onSuccess={() => {
              setReviewTarget(null);
              api.get('/bookings')
                .then(res => setBookings(res.data))
                .catch(() => {});
            }}
          />
        )}
      </div>
    </main>
  );
}
