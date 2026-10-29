import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Home, LogIn } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The requested page could not be found on ET-PLUS.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#fdfcfb] dark:bg-[#141518] flex flex-col justify-center items-center px-4 py-16 text-center">
      <div className="max-w-md w-full bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] rounded-xl p-8 shadow-xs">
        <div className="inline-flex items-center justify-center mb-4">
          <BrandLogo size={48} priority />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#78716c] dark:text-[#9ca3af] mb-1">
          404 Error
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6] mb-2">
          Page Not Found
        </h1>
        <p className="text-xs sm:text-sm text-[#78716c] dark:text-[#9ca3af] mb-6">
          The page you requested does not exist or may have been moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg text-xs font-medium bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg text-xs font-medium bg-[#f9f8f5] dark:bg-[#21242a] hover:bg-[#f4f1eb] dark:hover:bg-[#272a32] text-[#1c1917] dark:text-[#f3f4f6] border border-[#e7e4de] dark:border-[#2a2d35] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
