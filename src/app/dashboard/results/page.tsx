import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Results',
};

export default function ResultsPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb navigation: Home > Results */}
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

      {/* Main Content Area */}
      <div className="p-8 sm:p-12 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs text-center space-y-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6]">
          Results
        </h1>
        <p className="text-xs sm:text-sm text-[#78716c] dark:text-[#9ca3af]">
          results updates coming soon in later updates
        </p>
      </div>
    </div>
  );
}

