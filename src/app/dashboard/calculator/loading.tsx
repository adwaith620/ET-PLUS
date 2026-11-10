import React from 'react';
import Link from 'next/link';
import { Calculator } from 'lucide-react';

export default function CalculatorLoading() {
  return (
    <div className="space-y-6 pb-20 select-none" aria-busy="true" aria-label="Loading Credit Calculator...">
      {/* 1. Header Card Skeleton */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#26282f] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Calculator className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <div className="h-5 w-40 rounded-md bg-stone-200 dark:bg-stone-800 animate-pulse" />
              <div className="h-3.5 w-72 rounded-md bg-stone-100 dark:bg-stone-800/60 animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-32 rounded-lg bg-stone-200 dark:bg-stone-800 animate-pulse" />
        </div>
      </div>

      {/* 2. Top Summary Metric Skeleton Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-4 rounded-xl bg-white dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#26282f] h-20 space-y-2">
            <div className="h-3 w-16 bg-stone-200 dark:bg-stone-800 rounded" />
            <div className="h-6 w-10 bg-stone-300 dark:bg-stone-700 rounded" />
          </div>
        ))}
      </div>

      {/* 3. Table Skeleton Card */}
      <div className="rounded-2xl border border-[#e7e4de] dark:border-[#26282f] bg-white dark:bg-[#18191d] p-6 shadow-xs flex flex-col items-center justify-center text-center space-y-3">
        <div className="relative w-10 h-10" role="status" aria-label="Loading">
          <div className="w-10 h-10 rounded-full border-2 border-stone-200 dark:border-stone-800" />
          <div className="w-10 h-10 rounded-full border-2 border-amber-600 dark:border-amber-400 border-t-transparent animate-spin absolute inset-0" />
        </div>
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          Loading Continuous Assessment Evaluations...
        </p>
        <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm">
          Retrieving official subject-wise CIA marks from Results → Internal.
        </p>
      </div>
    </div>
  );
}
