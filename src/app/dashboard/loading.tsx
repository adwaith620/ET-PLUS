import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading content...">
      {/* Top Banner Skeleton */}
      <div className="p-6 rounded-xl bg-white/60 dark:bg-[#1b1d22]/60 border border-[#e7e4de] dark:border-[#2a2d35] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2.5 w-full max-w-sm">
          <div className="flex gap-2">
            <div className="h-5 w-24 rounded bg-stone-200 dark:bg-[#282b34]" />
            <div className="h-5 w-32 rounded bg-stone-200 dark:bg-[#282b34]" />
          </div>
          <div className="h-7 w-48 rounded bg-stone-200 dark:bg-[#282b34]" />
          <div className="h-4 w-64 rounded bg-stone-100 dark:bg-[#22252d]" />
        </div>
        <div className="h-9 w-28 rounded-md bg-stone-200 dark:bg-[#282b34] shrink-0" />
      </div>

      {/* Grid Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="p-5 rounded-xl bg-white/60 dark:bg-[#1b1d22]/60 border border-[#e7e4de] dark:border-[#2a2d35] h-52 space-y-3">
          <div className="h-4 w-32 rounded bg-stone-200 dark:bg-[#282b34]" />
          <div className="h-24 w-full rounded bg-stone-100 dark:bg-[#22252d]" />
          <div className="h-3 w-40 rounded bg-stone-200 dark:bg-[#282b34]" />
        </div>
        <div className="p-5 rounded-xl bg-white/60 dark:bg-[#1b1d22]/60 border border-[#e7e4de] dark:border-[#2a2d35] h-52 space-y-3">
          <div className="h-4 w-32 rounded bg-stone-200 dark:bg-[#282b34]" />
          <div className="h-24 w-full rounded bg-stone-100 dark:bg-[#22252d]" />
          <div className="h-3 w-40 rounded bg-stone-200 dark:bg-[#282b34]" />
        </div>
        <div className="p-5 rounded-xl bg-white/60 dark:bg-[#1b1d22]/60 border border-[#e7e4de] dark:border-[#2a2d35] h-52 space-y-3 md:col-span-2 lg:col-span-1">
          <div className="h-4 w-32 rounded bg-stone-200 dark:bg-[#282b34]" />
          <div className="h-24 w-full rounded bg-stone-100 dark:bg-[#22252d]" />
          <div className="h-3 w-40 rounded bg-stone-200 dark:bg-[#282b34]" />
        </div>
      </div>
    </div>
  );
}
