import React from 'react';
import { HelpCircle, ArrowRight, Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-md rounded-2xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600">
          <HelpCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Сторінку не знайдено</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Сторінка, яку ви шукаєте, могла бути видалена, її назва змінена або вона тимчасово недоступна.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Link
            href="/dashboard"
            className="flex items-center justify-between py-3 px-4 bg-slate-50 border border-slate-200 hover:border-blue-200 rounded-xl text-slate-700 text-sm font-semibold transition-all hover:scale-[1.01] cursor-pointer group"
          >
            <span>Перейти до панелі приладів</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 text-sm font-bold transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            На головну
          </Link>
        </div>
      </div>
    </main>
  );
}
