'use client';

import React from 'react';
import Link from 'next/link';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function BookingCancelPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="max-w-md w-full bg-white border border-slate-200 shadow-sm rounded-2xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <XCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Оплату скасовано</h1>
          <p className="text-slate-500 text-sm">Сесію оплати було скасовано. Жодних коштів не списано.</p>
        </div>
        <footer className="flex flex-col gap-2 pt-2">
          <Link
            href="/specialists"
            className="flex items-center justify-center gap-2 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад до спеціалістів
          </Link>
        </footer>
      </div>
    </main>
  );
}
