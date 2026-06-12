'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Save, Loader2, CalendarRange, User, LogOut, Calendar } from 'lucide-react';
import Link from 'next/link';

interface DaySchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export default function AvailabilityConfigPage() {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const daysLabel = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота'];
  const orderedDays = [1, 2, 3, 4, 5, 6, 0]; // Monday to Sunday

  useEffect(() => {
    api.get('/specialists/me/schedule')
      .then((res) => {
        // Initialize default empty schedules if database has none
        const initial = Array.from({ length: 7 }).map((_, index) => {
          const matched = res.data.find((d: any) => d.dayOfWeek === index);
          return matched ? {
            dayOfWeek: matched.dayOfWeek,
            startTime: matched.startTime,
            endTime: matched.endTime,
            isAvailable: matched.isAvailable
          } : {
            dayOfWeek: index,
            startTime: '09:00',
            endTime: '17:00',
            isAvailable: false
          };
        });
        setSchedule(initial);
      })
      .catch(() => {
        // Fallback defaults on error/unauthorized
        const fallback = Array.from({ length: 7 }).map((_, index) => ({
          dayOfWeek: index,
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: false
        }));
        setSchedule(fallback);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (dayOfWeek: number) => {
    setSchedule(prev => prev.map(day => 
      day.dayOfWeek === dayOfWeek ? { ...day, isAvailable: !day.isAvailable } : day
    ));
  };

  const handleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedule(prev => prev.map(day => 
      day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.put('/specialists/me/schedule', { schedule });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося зберегти налаштування розкладу.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await api.post('/auth/logout');
    window.location.href = '/login';
  };

  // Generate 30min slot options
  const timeOptions: string[] = [];
  for (let h = 0; h < 24; h++) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    timeOptions.push(`${pad(h)}:00`, `${pad(h)}:30`);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-500 text-sm">Завантаження деталей розкладу...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between bg-white border border-slate-200 px-6 py-3 rounded-xl shadow-sm">
          <nav className="flex gap-4">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
            >
              <User className="w-4 h-4" />
              Редагувати профіль
            </Link>
            <Link
              href="/dashboard/schedule"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg bg-blue-50 text-blue-700 transition-colors"
            >
              <CalendarRange className="w-4 h-4" />
              Керувати розкладом
            </Link>
            <Link
              href="/dashboard/bookings"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Керування бронюваннями
            </Link>
          </nav>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Вийти
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 md:p-8">
          <header className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-8">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <CalendarRange className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Керувати розкладом</h1>
              <p className="text-slate-500 text-sm mt-1">Налаштуйте стандартний щотижневий робочий час для сесій з клієнтами</p>
            </div>
          </header>

          {error && (
            <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl p-4 text-sm mb-6 text-center font-medium animate-shake">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-700 border border-green-100 rounded-xl p-4 text-sm mb-6 text-center font-medium">
              Налаштування доступності успішно збережено!
            </div>
          )}

          <div className="space-y-4 mb-8">
            {orderedDays.map((dayOfWeek) => {
              const day = schedule.find((d) => d.dayOfWeek === dayOfWeek);
              if (!day) return null;

              return (
                <div
                  key={day.dayOfWeek}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl gap-4 transition-all duration-200 ${
                    day.isAvailable
                      ? 'border-slate-200 bg-white shadow-sm'
                      : 'border-slate-100 bg-slate-50/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id={`toggle-${day.dayOfWeek}`}
                      checked={day.isAvailable}
                      onChange={() => handleToggle(day.dayOfWeek)}
                      className="w-5 h-5 accent-blue-600 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`toggle-${day.dayOfWeek}`}
                      className="font-bold text-slate-800 text-base min-w-[110px] cursor-pointer select-none"
                    >
                      {daysLabel[day.dayOfWeek]}
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <select
                        disabled={!day.isAvailable}
                        value={day.startTime}
                        onChange={(e) => handleTimeChange(day.dayOfWeek, 'startTime', e.target.value)}
                        className="py-2 pl-3 pr-8 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 text-sm font-semibold shadow-sm cursor-pointer appearance-none min-w-[100px]"
                      >
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</span>
                    </div>
                    
                    <span className="text-slate-400 text-sm font-medium">до</span>
                    
                    <div className="relative">
                      <select
                        disabled={!day.isAvailable}
                        value={day.endTime}
                        onChange={(e) => handleTimeChange(day.dayOfWeek, 'endTime', e.target.value)}
                        className="py-2 pl-3 pr-8 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 text-sm font-semibold shadow-sm cursor-pointer appearance-none min-w-[100px]"
                      >
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <footer className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm hover:shadow transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Зберегти доступність
            </button>
          </footer>
        </div>
      </div>
    </main>
  );
}
