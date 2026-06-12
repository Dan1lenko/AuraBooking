import React from 'react';
import { Loader2 } from 'lucide-react';

export default function GlobalLoading() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-slate-500 text-sm font-semibold">Loading AuraBooking...</p>
      </div>
    </main>
  );
}
