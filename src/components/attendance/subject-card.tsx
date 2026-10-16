'use client';

import React, { useState } from 'react';
import { SubjectAttendance } from '@/types';
import { Search, ShieldCheck, AlertTriangle } from 'lucide-react';

interface SubjectListProps {
  subjects: SubjectAttendance[];
  targetPercentage: number;
}

export function SubjectList({ subjects, targetPercentage }: SubjectListProps) {
  const [filter, setFilter] = useState<'all' | 'shortage' | 'safe'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSubjects = subjects.filter((sub) => {
    const matchesSearch =
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.faculty.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'shortage') return sub.percentage < targetPercentage;
    if (filter === 'safe') return sub.percentage >= targetPercentage;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter courses by name, code, or faculty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All ({subjects.length})
          </button>
          <button
            onClick={() => setFilter('shortage')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'shortage'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-amber-600'
            }`}
          >
            Below Target ({subjects.filter((s) => s.percentage < targetPercentage).length})
          </button>
          <button
            onClick={() => setFilter('safe')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'safe'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600'
            }`}
          >
            Safe ({subjects.filter((s) => s.percentage >= targetPercentage).length})
          </button>
        </div>
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSubjects.map((subject) => {
          const isSafe = subject.percentage >= targetPercentage;
          const isWarning = !isSafe && subject.percentage >= targetPercentage - 5;

          const badgeColor = isSafe
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
            : isWarning
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
            : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400';

          const progressColor = isSafe
            ? 'bg-emerald-500'
            : isWarning
            ? 'bg-amber-500'
            : 'bg-red-500';

          return (
            <div
              key={subject.code}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                        {subject.code}
                      </span>
                      {subject.category && (
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">
                          {subject.category}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5 leading-snug">
                      {subject.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{subject.faculty}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {subject.percentage}%
                    </span>
                    <span className={`block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${badgeColor}`}>
                      {isSafe ? 'Eligible' : isWarning ? 'Warning' : 'Shortage'}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>
                      {subject.attendedHours} attended of {subject.totalHours} hrs
                    </span>
                    <span>Target: {targetPercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                      style={{ width: `${Math.min(100, subject.percentage)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Status footer with actionable calculation */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                {isSafe ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Can safely bunk <strong>{subject.safeBunks}</strong> class{subject.safeBunks !== 1 ? 'es' : ''}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Must attend next <strong>{subject.classesToRecover}</strong> class{subject.classesToRecover !== 1 ? 'es' : ''} to recover</span>
                  </div>
                )}
                <span className="text-slate-400 text-[11px]">
                  {subject.totalHours - subject.attendedHours} missed
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
