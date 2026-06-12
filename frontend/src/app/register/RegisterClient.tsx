'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { Loader2, Mail, Lock, User as UserIcon, Shield, UserCheck } from 'lucide-react';
import Link from 'next/link';

const registerSchema = z.object({
  email: z.string().email('Будь ласка, введіть дійсну адресу електронної пошти'),
  name: z.string().min(2, 'Ім\'я має містити щонайменше 2 символи'),
  password: z.string().min(6, 'Пароль має містити щонайменше 6 символів'),
  role: z.enum(['CLIENT', 'SPECIALIST']),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterClient() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'CLIENT' },
    mode: 'onBlur',
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/register', data);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Помилка реєстрації. Будь ласка, спробуйте ще раз.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.03)] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserCheck className="text-green-600 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Реєстрація успішна!</h1>
          <p className="text-slate-500 mt-2">Ваш обліковий запис створено. Тепер ви можете увійти.</p>
          <Link
            href="/login"
            className="mt-6 inline-block w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Перейти до входу
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.03)] rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Створити обліковий запис</h1>
          <p className="text-slate-500 text-sm mt-2">Почніть роботу з платформою AuraBooking</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-3 text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Role selector cards */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Приєднатися як:
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setValue('role', 'CLIENT')}
                className={`flex flex-col items-center p-4 border rounded-xl cursor-pointer text-center hover:scale-[1.01] transition-all duration-200 ${
                  selectedRole === 'CLIENT'
                    ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <UserIcon className={`w-6 h-6 mb-2 ${selectedRole === 'CLIENT' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-semibold ${selectedRole === 'CLIENT' ? 'text-blue-900' : 'text-slate-700'}`}>
                  Клієнт
                </span>
              </button>

              <button
                type="button"
                onClick={() => setValue('role', 'SPECIALIST')}
                className={`flex flex-col items-center p-4 border rounded-xl cursor-pointer text-center hover:scale-[1.01] transition-all duration-200 ${
                  selectedRole === 'SPECIALIST'
                    ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Shield className={`w-6 h-6 mb-2 ${selectedRole === 'SPECIALIST' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-semibold ${selectedRole === 'SPECIALIST' ? 'text-blue-900' : 'text-slate-700'}`}>
                  Спеціаліст
                </span>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
              Повне ім'я
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                id="name"
                type="text"
                {...register('name')}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-slate-900 bg-white"
                placeholder="John Doe"
              />
            </div>
            {errors.name && (
              <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.name.message}</p>
            )}
          </div>

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
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
              Пароль
            </label>
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
            Зареєструватися
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
          Вже маєте обліковий запис?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500">
            Увійти
          </Link>
        </div>
      </div>
    </main>
  );
}
