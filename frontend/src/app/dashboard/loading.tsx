import React from 'react';

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8 animate-pulse">
        {/* Skeleton Header */}
        <header className="h-[98px] bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-200 rounded-xl" />
            <div className="space-y-2">
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-5 w-40 bg-slate-200 rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-28 bg-slate-200 rounded-xl" />
            <div className="h-10 w-28 bg-slate-200 rounded-xl" />
          </div>
        </header>

        {/* Skeleton Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
              <div className="h-6 w-48 bg-slate-200 rounded" />
              <div className="space-y-3">
                <div className="h-20 bg-slate-100 rounded-xl border border-slate-200" />
                <div className="h-20 bg-slate-100 rounded-xl border border-slate-200" />
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
              <div className="h-6 w-40 bg-slate-200 rounded" />
              <div className="space-y-3">
                <div className="h-16 bg-slate-100 rounded-xl border border-slate-200" />
                <div className="h-16 bg-slate-100 rounded-xl border border-slate-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
