'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ExternalLink,
  FileText,
  RefreshCw,
} from 'lucide-react';

interface AssignmentsClientProps {
  assignments?: unknown[];
  mode?: 'live' | 'demo';
  syncError?: string;
  lastSynced?: string;
  upcomingCount?: number;
}

export function AssignmentsClient({
  lastSynced = 'Just now',
}: AssignmentsClientProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetch('/api/assignments?refresh=true');
      router.refresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-[#78716c] dark:text-[#9ca3af]">
        <Link
          href="/dashboard"
          className="hover:text-[#1c1917] dark:hover:text-[#f3f4f6] transition-colors"
        >
          Home
        </Link>
        <span>&gt;</span>
        <span className="text-[#1c1917] dark:text-[#f3f4f6] font-medium">Assignments</span>
      </nav>

      {/* 2. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#f4f1eb] dark:bg-[#202227] text-stone-800 dark:text-stone-200 border border-[#e7e4de] dark:border-[#2a2d35]">
              Semester 3 · Computer Science (AI)
            </span>
            <span className="text-xs text-[#78716c] dark:text-[#9ca3af]">
              Synced {lastSynced}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6]">
            Assignments
          </h1>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-1">
            Coursework and assignment submissions for Computer Science (AI)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh assignments from ETLAB"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] hover:bg-[#f9f8f5] dark:hover:bg-[#202227] flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync ETLAB'}</span>
          </button>

          <a
            href="https://tkmce.etlab.in/student/assignments"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>Open ETLAB Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* 3. Minimal Clean Empty State */}
      <div className="p-12 sm:p-16 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-center space-y-3 shadow-xs">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#f4f1eb] dark:bg-[#202227] text-[#78716c] dark:text-[#9ca3af] mx-auto border border-[#e7e4de] dark:border-[#2a2d35]">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
          No Assignments
        </h3>
        <p className="text-xs text-[#78716c] dark:text-[#9ca3af] max-w-sm mx-auto leading-relaxed">
          There are currently no active or pending assignments. Newly published coursework will appear here automatically.
        </p>
        <div className="pt-2">
          <a
            href="https://tkmce.etlab.in/student/assignments"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] transition-colors shadow-xs"
          >
            <span>View on ETLAB Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
