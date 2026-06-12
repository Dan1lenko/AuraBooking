'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { Loader2, User, Save, Upload, CalendarRange, LogOut, Calendar } from 'lucide-react';
import Link from 'next/link';

const profileSchema = z.object({
  bio: z.string().min(10, 'Біографія повинна містити щонайменше 10 символів'),
  category: z.string().min(2, 'Категорія має бути вказана'),
  price: z.number().positive('Ціна повинна бути більшою за нуль'),
  experience: z.number().int().nonnegative('Досвід роботи не може бути від’ємним'),
  avatarUrl: z.string().nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SpecialistProfileEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
  });

  useEffect(() => {
    api.get('/specialists/me')
      .then((res) => {
        reset(res.data);
        if (res.data.avatarUrl) {
          setAvatarPreview(res.data.avatarUrl);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reset]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show instant preview
    setAvatarPreview(URL.createObjectURL(file));

    // Upload immediately
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post('/specialists/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setValue('avatarUrl', response.data.avatarUrl);
    } catch (uploadErr) {
      setError('Не вдалося завантажити аватар. Продовжуємо з попереднім зображенням.');
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.put('/specialists/me', data);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося зберегти дані профілю.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await api.post('/auth/logout');
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-500 text-sm">Завантаження налаштувань профілю...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 animate-fade-in">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between bg-white border border-slate-200 px-6 py-3 rounded-xl shadow-sm">
          <nav className="flex gap-4">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg bg-blue-50 text-blue-700 transition-colors"
            >
              <User className="w-4 h-4" />
              Редагувати профіль
            </Link>
            <Link
              href="/dashboard/schedule"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
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

        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8">
          <header className="border-b border-slate-100 pb-6 mb-8 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Редагувати профіль спеціаліста</h1>
              <p className="text-slate-500 text-sm mt-1">Налаштуйте біографію, вартість послуг та виберіть категорію</p>
            </div>
          </header>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-3 text-sm mb-6 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 border border-green-100 rounded-lg p-3 text-sm mb-6 text-center">
            Профіль успішно збережено!
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-slate-100">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar Preview"
                  className="w-24 h-24 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                  <User className="w-12 h-12" />
                </div>
              )}
            </div>

            <div className="space-y-2 text-center md:text-left">
              <label htmlFor="avatar-file" className="flex items-center gap-2 py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer transition-colors w-fit mx-auto md:mx-0">
                <Upload className="w-4 h-4" />
                Завантажити нове фото
              </label>
              <input
                id="avatar-file"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <p className="text-xs text-slate-400">JPG, PNG або WebP. Максимальний розмір 5 МБ.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="category" className="block text-sm font-semibold text-slate-700 mb-2">Категорія</label>
              <select
                id="category"
                {...register('category')}
                className="w-full py-2.5 px-3 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 bg-white"
              >
                <option value="Therapy">Терапія</option>
                <option value="Coaching">Наставництво</option>
                <option value="Massage">Масаж</option>
                <option value="Consulting">Консультації</option>
                <option value="Design">Дизайн</option>
              </select>
              {errors.category && (
                <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-semibold text-slate-700 mb-2">Ціна ($/год)</label>
              <input
                id="price"
                type="number"
                step="0.01"
                {...register('price', { valueAsNumber: true })}
                className="w-full py-2.5 px-3 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 bg-white"
              />
              {errors.price && (
                <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="experience" className="block text-sm font-semibold text-slate-700 mb-2">Досвід (років)</label>
              <input
                id="experience"
                type="number"
                {...register('experience', { valueAsNumber: true })}
                className="w-full py-2.5 px-3 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 bg-white"
              />
              {errors.experience && (
                <p className="text-red-500 text-xs mt-1">{errors.experience.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-semibold text-slate-700 mb-2">Біографія</label>
            <textarea
              id="bio"
              rows={5}
              {...register('bio')}
              className="w-full py-2.5 px-3 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 bg-white"
              placeholder="Розкажіть клієнтам про себе..."
            />
            {errors.bio && (
              <p className="text-red-500 text-xs mt-1">{errors.bio.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Зберегти зміни
          </button>
        </form>
        </div>
      </div>
    </main>
  );
}
