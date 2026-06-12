'use client';

import React, { useEffect } from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error details to console
    console.error('Unhandled runtime error:', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-md rounded-2xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="text-red-600 w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Щось пішло не так</h1>
          <p className="text-slate-500 text-sm">
            Під час обробки цієї сторінки сталася непередбачена помилка. Будь ласка, спробуйте оновити сесію.
          </p>
        </div>

        {error.message && (
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-left">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Діагностика помилки</p>
            <p className="text-slate-700 text-xs font-mono break-all">{error.message}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2 justify-center">
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 text-sm font-semibold transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            На головну
          </Link>
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Спробувати знову
          </button>
        </div>
      </div>
    </main>
  );
}
