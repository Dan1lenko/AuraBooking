'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Star, User, Calendar, ShieldCheck, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Link from 'next/link';

export default function SpecialistProfileClient() {
  const params = useParams();
  const [specialist, setSpecialist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    api.get('/auth/me')
      .then(res => setCurrentUser(res.data.user))
      .catch(() => {});
  }, []);

  // Translation helpers
  const categoryTranslation: Record<string, string> = {
    Therapy: 'Терапія',
    Coaching: 'Наставництво',
    Massage: 'Масаж',
    Consulting: 'Консультації',
    Design: 'Дизайн'
  };

  const getExperienceLabel = (years: number) => {
    const lastDigit = years % 10;
    const lastTwoDigits = years % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return `${years} років досвіду`;
    if (lastDigit === 1) return `${years} рік досвіду`;
    if (lastDigit >= 2 && lastDigit <= 4) return `${years} роки досвіду`;
    return `${years} років досвіду`;
  };

  // Stripe States
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<any>(null);

  useEffect(() => {
    api.get('/payments/config').then((res) => {
      setStripePromise(loadStripe(res.data.publishableKey));
    }).catch(() => {});
  }, []);

  // Calendar states
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  // Reviews states
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Generate next 14 days for the picker list
  const [dateList, setDateList] = useState<any[]>([]);

  useEffect(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isoStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('uk-UA', { weekday: 'short' });
      const dayNum = d.toLocaleDateString('uk-UA', { day: 'numeric' });
      list.push({ isoStr, dayName, dayNum });
    }
    setDateList(list);
    setSelectedDate(list[0].isoStr);
  }, []);

  useEffect(() => {
    if (params?.id) {
      api.get(`/specialists/${params.id}`)
        .then(res => setSpecialist(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));

      api.get(`/reviews/${params.id}`)
        .then(res => setReviews(res.data))
        .catch(() => {})
        .finally(() => setLoadingReviews(false));
    }
  }, [params?.id]);

  useEffect(() => {
    if (params?.id && selectedDate) {
      setLoadingSlots(true);
      setSelectedSlot(null);
      setBookingError(null);
      api.get(`/specialists/${params.id}/slots`, { params: { date: selectedDate } })
        .then(res => setSlots(res.data))
        .catch(() => {})
        .finally(() => setLoadingSlots(false));
    }
  }, [params?.id, selectedDate]);

  const handleBookSession = async () => {
    if (!selectedSlot || !params?.id) return;
    if (!currentUser) {
      const currentPath = window.location.pathname;
      window.location.href = `/login?redirectTo=${encodeURIComponent(currentPath)}`;
      return;
    }
    if (currentUser.role === 'SPECIALIST') {
      setBookingError('Бронювати сесії можуть тільки клієнти.');
      return;
    }
    setBookingLoading(true);
    setBookingError(null);
    setBookingSuccess(false);
    try {
      const response = await api.post(`/bookings`, {
        specialistProfileId: parseInt(params.id as string, 10),
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      });
      setClientSecret(response.data.clientSecret);
      setBookingId(response.data.booking?.id || null);
    } catch (err: any) {
      setBookingError(err.response?.data?.message || 'Будь ласка, увійдіть, щоб забронювати сесію.');
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-500 text-sm">Завантаження інформації про спеціаліста...</p>
        </div>
      </main>
    );
  }

  if (!specialist) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <p className="text-slate-500 text-lg font-medium">Профіль спеціаліста не знайдено.</p>
      </main>
    );
  }

  const getReviewsWord = (count: number) => {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'відгуків';
    if (lastDigit === 1) return 'відгук';
    if (lastDigit >= 2 && lastDigit <= 4) return 'відгуки';
    return 'відгуків';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm">
              A
            </div>
            <span className="font-bold text-slate-900 tracking-tight text-lg">AuraBooking</span>
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              href="/specialists"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Знайти спеціалістів
            </Link>
            {currentUser ? (
              <>
                <span className="text-slate-200">|</span>
                <Link
                  href={currentUser.role === 'SPECIALIST' ? '/dashboard/schedule' : '/dashboard'}
                  className="py-2 px-4 bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-semibold rounded-xl transition-all"
                >
                  Особистий кабінет
                </Link>
              </>
            ) : (
              <>
                <span className="text-slate-200">|</span>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Увійти
                </Link>
                <Link
                  href="/register"
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow"
                >
                  Почати
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 animate-fade-in">
        <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 flex flex-col md:flex-row gap-6">
              {specialist.avatarUrl ? (
                <img
                  src={specialist.avatarUrl}
                  alt={specialist.user?.name}
                  className="w-24 h-24 rounded-full object-cover border border-slate-100 self-center md:self-start"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 self-center md:self-start">
                  <User className="w-12 h-12" />
                </div>
              )}

              <div className="flex-1 space-y-3 text-center md:text-left">
                <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 uppercase">
                  {categoryTranslation[specialist.category] || specialist.category}
                </span>
                <h1 className="text-2xl font-bold text-slate-900">{specialist.user?.name}</h1>
                <div className="flex items-center justify-center md:justify-start gap-1.5 text-amber-500 text-sm font-semibold">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>{(specialist.rating ?? 0.0).toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">({specialist.reviewsCount} {getReviewsWord(specialist.reviewsCount)})</span>
                </div>
                <div className="flex flex-wrap gap-4 pt-2 justify-center md:justify-start text-sm text-slate-500">
                  <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-green-500" /> Перевірений партнер</span>
                  <span>•</span>
                  <span>{getExperienceLabel(specialist.experience)}</span>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Біографія</h2>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{specialist.bio}</p>
            </section>

            {/* Client Reviews section */}
            <section className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Відгуки клієнтів</h2>
              {loadingReviews ? (
                <p className="text-slate-400 text-sm py-4 text-center">Завантаження відгуків...</p>
              ) : reviews.length === 0 ? (
                <p className="text-slate-400 text-sm py-6 text-center">Для цього спеціаліста ще немає відгуків.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-slate-800">
                          {rev.client?.name || rev.client?.email || 'Клієнт'}
                        </h4>
                        <span className="text-xs text-slate-400">
                          {new Date(rev.createdAt).toLocaleDateString('uk-UA', { dateStyle: 'medium' })}
                        </span>
                      </div>
                      <div className="flex text-amber-400">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sticky Book Session Sidebar */}
          <div>
            <aside className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 sticky top-6 space-y-6 text-center">
              <div>
                <span className="text-slate-400 text-xs font-semibold block uppercase">Вартість сесії</span>
                <span className="text-3xl font-extrabold text-slate-950">${specialist.price}</span>
                <span className="text-slate-400 text-sm font-semibold">/година</span>
              </div>

              {bookingSuccess && (
                <div className="bg-green-50 text-green-700 border border-green-100 rounded-xl p-3 text-xs text-center font-semibold">
                  Сесію успішно заброньовано!
                </div>
              )}

              {bookingError && (
                <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 text-xs text-center font-semibold">
                  {bookingError}
                </div>
              )}

              {/* Date Card List */}
              <div className="text-left space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Оберіть дату</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {dateList.map((d) => (
                    <button
                      key={d.isoStr}
                      type="button"
                      onClick={() => { setSelectedDate(d.isoStr); setBookingSuccess(false); }}
                      className={`flex flex-col items-center py-2 px-3 border rounded-xl cursor-pointer text-center min-w-[55px] transition-all duration-200 ${
                        selectedDate === d.isoStr
                          ? 'border-blue-600 bg-blue-50/20 text-blue-700 ring-1 ring-blue-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase">{d.dayName}</span>
                      <span className="text-base font-extrabold mt-0.5">{d.dayNum}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slots Grid */}
              <div className="text-left space-y-3">
                <label className="block text-sm font-semibold text-slate-700">Вільний час</label>
                {loadingSlots ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 border border-slate-100 rounded-lg">Немає вільного часу на цей день.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-1">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={slot.isBooked}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 text-center rounded-lg border text-xs font-semibold transition-all duration-200 ${
                          slot.isBooked
                            ? 'bg-slate-100 border-slate-100 text-slate-300 line-through cursor-not-allowed'
                            : selectedSlot?.time === slot.time
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600 cursor-pointer'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!clientSecret ? (
                <button
                  type="button"
                  onClick={handleBookSession}
                  disabled={!selectedSlot || bookingLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm hover:shadow transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bookingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
                  Підтвердити бронювання
                </button>
              ) : (
                stripePromise && (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm
                      clientSecret={clientSecret}
                      onSuccess={() => {
                        setBookingSuccess(true);
                        setClientSecret(null);
                        setBookingLoading(false);
                        window.location.href = `/booking/success?bookingId=${bookingId}`;
                      }}
                      onCancel={() => {
                        setClientSecret(null);
                        setBookingLoading(false);
                        window.location.href = '/booking/cancel';
                      }}
                    />
                  </Elements>
                )
              )}

              <p className="text-slate-400 text-[10px]">Гарантія задоволення. Перенесення безкоштовно за 24 години до початку.</p>
            </aside>
          </div>
        </div>
      </div>
    </main>
  </div>
);
}

function CheckoutForm({ clientSecret, onSuccess, onCancel }: { clientSecret: string; onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const card = elements.getElement(CardElement);
    if (!card) return;

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });

    if (result.error) {
      setError(result.error.message || 'Помилка оплати');
      setLoading(false);
    } else {
      if (result.paymentIntent.status === 'succeeded') {
        onSuccess();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50 shadow-inner">
        <CardElement options={{ style: { base: { fontSize: '14px', color: '#1e293b' } } }} />
      </div>
      {error && <p className="text-xs text-red-500 text-center font-bold">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer"
        >
          Скасувати
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Обробка...' : 'Оплатити та підтвердити'}
        </button>
      </div>
    </form>
  );
}
