'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Assignment } from '@/types';
import { getDeadlineCountdown } from '@/lib/assignment-utils';
import {
  ExternalLink,
  FileText,
  RefreshCw,
  Clock,
  Calendar,
  User,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Search,
} from 'lucide-react';

interface AssignmentsClientProps {
  assignments?: Assignment[];
  mode?: 'live' | 'demo';
  syncError?: string;
  lastSynced?: string;
  upcomingCount?: number;
}

export function AssignmentsClient({
  assignments = [],
  lastSynced = 'Just now',
}: AssignmentsClientProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'overdue' | 'completed'>('all');

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetch('/api/assignments?refresh=true');
      router.refresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const filteredAssignments = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (assignments || []).filter((asg) => {
      const matchesSearch =
        !q ||
        asg.title.toLowerCase().includes(q) ||
        asg.subject.toLowerCase().includes(q) ||
        asg.subjectCode.toLowerCase().includes(q) ||
        (asg.description && asg.description.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (statusFilter === 'all') return true;
      if (statusFilter === 'upcoming') return asg.status === 'upcoming';
      if (statusFilter === 'overdue') return asg.status === 'overdue';
      if (statusFilter === 'completed') return asg.status === 'completed' || asg.status === 'submitted';
      return true;
    });
  }, [assignments, searchQuery, statusFilter]);

  const hasAssignments = assignments && assignments.length > 0;

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

      {hasAssignments ? (
        <div className="space-y-4">
          {/* Controls: Search & Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c] dark:text-[#9ca3af]" />
              <input
                type="text"
                placeholder="Search assignments by title or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] placeholder-[#78716c] dark:placeholder-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-stone-500"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {(['all', 'upcoming', 'overdue', 'completed'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setStatusFilter(filterKey)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                    statusFilter === filterKey
                      ? 'bg-[#1c1917] text-white dark:bg-[#f3f4f6] dark:text-[#141518]'
                      : 'bg-[#f4f1eb] dark:bg-[#202227] text-[#78716c] dark:text-[#9ca3af] hover:text-[#1c1917] dark:hover:text-[#f3f4f6]'
                  }`}
                >
                  {filterKey}
                </button>
              ))}
            </div>
          </div>

          {/* Assignment Cards List */}
          {filteredAssignments.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {filteredAssignments.map((asg) => {
                const countdown = getDeadlineCountdown(asg.dueDate);
                return (
                  <div
                    key={asg.id}
                    className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs hover:border-stone-400 dark:hover:border-stone-600 transition-colors space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#f4f1eb] dark:bg-[#202227] text-stone-800 dark:text-stone-200 border border-[#e7e4de] dark:border-[#2a2d35]">
                            {asg.subjectCode} · {asg.subject}
                          </span>
                          {asg.status === 'upcoming' ? (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {countdown.text}
                            </span>
                          ) : asg.status === 'overdue' ? (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Overdue
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {asg.status}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
                          {asg.title}
                        </h3>
                        {asg.description && (
                          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] whitespace-pre-line leading-relaxed">
                            {asg.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#f0eee9] dark:border-[#22252b] text-xs text-[#78716c] dark:text-[#9ca3af]">
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Due: <strong className="font-medium text-[#1c1917] dark:text-[#f3f4f6]">{asg.dueDate}</strong></span>
                        </span>
                        {asg.faculty && (
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            <span>{asg.faculty}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {asg.attachmentUrl && (
                          <a
                            href={asg.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>Attachment</span>
                          </a>
                        )}
                        <a
                          href={asg.externalUrl || 'https://tkmce.etlab.in/student/assignments'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-[#f4f1eb] dark:bg-[#202227] hover:bg-[#eae6de] dark:hover:bg-[#282a30] text-[#1c1917] dark:text-[#f3f4f6] transition-colors"
                        >
                          <span>Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-xs text-[#78716c] dark:text-[#9ca3af]">
              No assignments match the selected filters.
            </div>
          )}
        </div>
      ) : (
        /* 3. Minimal Clean Empty State */
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
      )}
    </div>
  );
}
