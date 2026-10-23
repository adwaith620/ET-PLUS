import React from 'react';
import Link from 'next/link';

export default function ResultsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Connecting to ETLAB and loading examination records...">
      {/* 1. Breadcrumb navigation: Home > Results */}
      <nav className="flex items-center gap-2 text-xs text-[#78716c] dark:text-[#9ca3af]">
        <Link
          href="/dashboard"
          className="hover:text-[#1c1917] dark:hover:text-[#f3f4f6] transition-colors"
        >
          Home
        </Link>
        <span>&gt;</span>
        <span className="text-[#1c1917] dark:text-[#f3f4f6] font-medium">Results</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6]">
            Results
          </h1>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-1">
            Continuous internal evaluations, sessional series tests, lab practicals, and coursework marks
          </p>
        </div>
      </div>

      {/* Connecting Indicator Card with Spinner Circle */}
      <div className="p-8 sm:p-12 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs flex flex-col items-center justify-center text-center space-y-4">
        <div className="relative w-12 h-12" role="status" aria-label="Loading">
          <div className="w-12 h-12 rounded-full border-3 border-stone-200 dark:border-[#282b33]" />
          <div className="w-12 h-12 rounded-full border-3 border-[#1c1917] dark:border-[#f3f4f6] border-t-transparent animate-spin absolute inset-0" />
        </div>
        <div className="space-y-1 max-w-sm">
          <p className="text-sm sm:text-base font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
            Connecting to ETLAB...
          </p>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] leading-relaxed">
            Synchronizing official examination results and continuous assessment evaluations. Please wait a moment.
          </p>
        </div>
      </div>

      {/* Skeleton Filters & Table View */}
      <div className="space-y-4 animate-pulse opacity-60">
        <div className="flex justify-center items-center py-1">
          <div className="h-9 w-64 rounded-xl bg-stone-200 dark:bg-[#202227]" />
        </div>
        <div className="h-10 w-full rounded-xl bg-stone-100 dark:bg-[#202227]" />
        <div className="h-64 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35]" />
      </div>
    </div>
  );
}
