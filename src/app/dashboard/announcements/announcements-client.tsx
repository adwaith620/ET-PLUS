'use client';

import React, { useState } from 'react';
import { Announcement } from '@/types';
import { Pin, Search, Calendar, User } from 'lucide-react';

interface AnnouncementsClientProps {
  announcements: Announcement[];
}

export function AnnouncementsClient({ announcements }: AnnouncementsClientProps) {
  const [filter, setFilter] = useState<'all' | 'Exam' | 'Placement' | 'Academic' | 'General'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = announcements.filter((ann) => {
    const matchesSearch =
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.author.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    return ann.category === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Institutional Announcements
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Official notifications from TKM College of Engineering, KTU Exam Cell, and Career Placement Unit
        </p>
      </div>

      {/* Search and Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search circulars, exams, placement alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto self-start sm:self-auto">
          {['all', 'Exam', 'Placement', 'Academic', 'General'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat as typeof filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filter === cat
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filtered.map((ann) => (
          <div
            key={ann.id}
            className={`p-5 rounded-2xl border shadow-xs transition-all ${
              ann.pinned
                ? 'bg-purple-50/20 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/60'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                  {ann.category}
                </span>
                {ann.pinned && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md">
                    <Pin className="w-3 h-3" /> Pinned Circular
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                <Calendar className="w-3.5 h-3.5" />
                {ann.date}
              </span>
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2">
              {ann.title}
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              {ann.content}
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Issued by: <strong className="text-slate-700 dark:text-slate-300">{ann.author}</strong>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
