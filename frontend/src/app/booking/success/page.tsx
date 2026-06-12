'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle, Calendar } from 'lucide-react';

export default function BookingSuccessPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="max-w-md w-full bg-white border border-slate-200 shadow-sm rounded-2xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Оплата успішна!</h1>
          <p className="text-slate-500 text-sm">Ваше бронювання надіслано, і оплату успішно оброблено.</p>
        </div>
        <footer className="flex flex-col gap-2 pt-2">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            <Calendar className="w-5 h-5" />
            Переглянути мої сесії
          </Link>
        </footer>
      </div>
    </main>
  );
}
