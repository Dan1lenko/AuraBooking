'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Star, User, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';

export default function SpecialistsClient() {
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    api.get('/auth/me')
      .then(res => setCurrentUser(res.data.user))
      .catch(() => {});
  }, []);

  const fetchSpecialists = () => {
    setLoading(true);
    const params: any = {};
    if (category) params.category = category;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;

    api.get('/specialists', { params })
      .then(res => setSpecialists(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSpecialists();
  }, [category]);

  const categoriesList = [
    { value: 'Therapy', label: 'Терапія' },
    { value: 'Coaching', label: 'Наставництво' },
    { value: 'Massage', label: 'Масаж' },
    { value: 'Consulting', label: 'Консультації' },
    { value: 'Design', label: 'Дизайн' }
  ];

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
              className="text-sm font-semibold text-blue-600 transition-colors"
            >
              Знайти спеціалістов
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
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Каталог спеціалістів</h1>
          <p className="text-slate-500 mt-2 text-lg">Знайдіть та забронюйте перевірених фахівців для ваших потреб</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 h-fit sticky top-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
              <SlidersHorizontal className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-bold text-slate-900">Фільтри</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Категорія</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full py-2.5 px-3 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 bg-white"
                >
                  <option value="">Всі категорії</option>
                  {categoriesList.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Ціновий діапазон ($/год)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Мін."
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Макс."
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              <button
                onClick={fetchSpecialists}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-colors cursor-pointer"
              >
                Застосувати фільтри
              </button>
            </div>
          </aside>

          {/* Directory Listings */}
          <section className="lg:col-span-3">
            {loading ? (
              <p className="text-slate-400 text-center py-12">Завантаження спеціалістів...</p>
            ) : specialists.length === 0 ? (
              <p className="text-slate-400 text-center py-12">Не знайдено спеціалістів, що відповідають фільтрам.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {specialists.map((spec) => (
                  <Link
                    key={spec.id}
                    href={`/specialists/${spec.id}`}
                    className="block bg-white border border-slate-200 hover:border-blue-200 shadow-sm rounded-2xl p-6 transition-all duration-200 hover:scale-[1.01]"
                  >
                    <div className="flex gap-4">
                      {spec.avatarUrl ? (
                        <img
                          src={spec.avatarUrl}
                          alt={spec.user?.name}
                          className="w-16 h-16 rounded-full object-cover border border-slate-100"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <User className="w-8 h-8" />
                        </div>
                      )}
                      <div>
                        <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 uppercase">
                          {categoryTranslation[spec.category] || spec.category}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 mt-2">{spec.user?.name || 'Фахівець'}</h3>
                        <p className="text-slate-500 text-sm mt-1">{getExperienceLabel(spec.experience)}</p>
                      </div>
                    </div>

                    <p className="text-slate-600 text-sm mt-4 line-clamp-2">{spec.bio}</p>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
                      <div className="flex items-center gap-1.5 text-amber-500 text-sm font-semibold">
                        <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                        <span>{(spec.rating ?? 0.0).toFixed(1)}</span>
                        <span className="text-slate-400 font-normal">({spec.reviewsCount})</span>
                      </div>
                      <span className="text-slate-900 font-bold text-lg">
                        ${spec.price}<span className="text-slate-400 font-semibold text-xs">/год</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
        </div>
      </main>
    </div>
  );
}
