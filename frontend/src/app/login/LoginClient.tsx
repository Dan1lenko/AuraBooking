'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { Loader2, Mail, Lock } from 'lucide-react';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email('Будь ласка, введіть дійсну адресу електронної пошти'),
  password: z.string().min(6, 'Пароль має містити щонайменше 6 символів'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginClient() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', data);
      const user = res.data.user;

      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get('redirectTo');

      if (redirectTo && redirectTo.startsWith('/') && !redirectTo.includes('://')) {
        window.location.href = redirectTo;
      } else if (user.role === 'SPECIALIST') {
        window.location.href = '/dashboard/schedule';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Помилка входу. Будь ласка, перевірте свої облікові дані.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.03)] rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">З поверненням</h1>
          <p className="text-slate-500 text-sm mt-2">Увійдіть, щоб керувати вашими записами</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-3 text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
              Електронна пошта
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                id="email"
                type="email"
                {...register('email')}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-slate-900 bg-white"
                placeholder="you@example.com"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                Пароль
              </label>
              <Link href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-500">
                Забули пароль?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                id="password"
                type="password"
                {...register('password')}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-slate-900 bg-white"
                placeholder="••••••••"
              />
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Увійти
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
          Немає облікового запису?{' '}
          <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-500">
            Зареєструватися
          </Link>
        </div>
      </div>
    </main>
  );
}
