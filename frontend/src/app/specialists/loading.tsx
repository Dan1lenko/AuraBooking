import React from 'react';

export default function SpecialistsLoading() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
        {/* Skeleton Header */}
        <header className="space-y-2">
          <div className="h-10 w-80 bg-slate-200 rounded" />
          <div className="h-5 w-96 bg-slate-200 rounded" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Skeleton Filters Sidebar */}
          <aside className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 h-[320px]">
            <div className="h-6 w-24 bg-slate-200 rounded mb-6 border-b border-slate-100 pb-4" />
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="h-3 w-16 bg-slate-200 rounded" />
                <div className="h-10 w-full bg-slate-100 rounded-lg border border-slate-200" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-10 w-full bg-slate-100 rounded-lg border border-slate-200" />
              </div>
            </div>
          </aside>

          {/* Skeleton Listings */}
          <section className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-6">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-16 bg-slate-200 rounded-full" />
                    <div className="h-5 w-36 bg-slate-200 rounded" />
                    <div className="h-3.5 w-24 bg-slate-200 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-5/6 bg-slate-100 rounded" />
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                  <div className="h-5 w-20 bg-slate-200 rounded" />
                  <div className="h-6 w-16 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
