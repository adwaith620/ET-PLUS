'use client';

import React, { useState } from 'react';
import { SubjectAttendance } from '@/types';
import { getCourseFullName } from '@/lib/course-catalog';
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
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search courses by code, title, or faculty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-stone-900 dark:text-white placeholder:text-stone-400 outline-none focus:ring-1 focus:ring-stone-400"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#f7f6f3] dark:bg-[#202227] p-1 rounded-md border border-[#e7e4de] dark:border-[#2a2d35] self-start sm:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'bg-white dark:bg-[#18191d] text-stone-900 dark:text-white font-semibold shadow-xs border border-[#e7e4de] dark:border-[#2f323c]'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            All ({subjects.length})
          </button>
          <button
            onClick={() => setFilter('shortage')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filter === 'shortage'
                ? 'bg-white dark:bg-[#18191d] text-amber-800 dark:text-amber-300 font-semibold shadow-xs border border-[#e7e4de] dark:border-[#2f323c]'
                : 'text-stone-500 dark:text-stone-400 hover:text-amber-700'
            }`}
          >
            Below Target ({subjects.filter((s) => s.percentage < targetPercentage).length})
          </button>
          <button
            onClick={() => setFilter('safe')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filter === 'safe'
                ? 'bg-white dark:bg-[#18191d] text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs border border-[#e7e4de] dark:border-[#2f323c]'
                : 'text-stone-500 dark:text-stone-400 hover:text-emerald-700'
            }`}
          >
            Safe ({subjects.filter((s) => s.percentage >= targetPercentage).length})
          </button>
        </div>
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredSubjects.map((subject) => {
          const isSafe = subject.percentage >= targetPercentage;
          const isWarning = !isSafe && subject.percentage >= targetPercentage - 5;

          const badgeClass = isSafe
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-[#14281c] dark:text-emerald-400 dark:border-[#1e3d29]'
            : isWarning
            ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-[#2b2210] dark:text-amber-400 dark:border-[#423519]'
            : 'bg-red-50 text-red-800 border-red-200 dark:bg-[#2c1618] dark:text-red-400 dark:border-[#441f23]';

          const progressColor = isSafe
            ? 'bg-emerald-600 dark:bg-emerald-500'
            : isWarning
            ? 'bg-amber-600 dark:bg-amber-500'
            : 'bg-red-600 dark:bg-red-500';

          return (
            <div
              key={subject.code}
              className="p-4 sm:p-5 rounded-lg bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] flex flex-col justify-between animate-fade-in-up"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="text-base font-semibold text-stone-900 dark:text-stone-100 leading-snug tracking-tight">
                      {getCourseFullName(subject.code, subject.name)}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[#f4f1eb] dark:bg-[#22252c] text-stone-700 dark:text-stone-300 border border-[#e7e4de] dark:border-[#2c2f37]">
                        {subject.code}
                      </span>
                      {subject.category && (
                        <span className="text-[10px] text-stone-400 uppercase font-medium">
                          {subject.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5">{subject.faculty}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                      {subject.percentage}%
                    </span>
                    <span className={`block text-[10px] font-medium uppercase tracking-wider px-2 py-0.2 rounded mt-1 border ${badgeClass}`}>
                      {isSafe ? 'Eligible' : isWarning ? 'Warning' : 'Shortage'}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3.5">
                  <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 mb-1">
                    <span>
                      {subject.attendedHours} attended of {subject.totalHours} hrs
                    </span>
                    <span>Target: {targetPercentage}%</span>
                  </div>
                  <div className="w-full bg-[#efece6] dark:bg-[#272a31] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
                      style={{ width: `${Math.min(100, subject.percentage)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Status footer */}
              <div className="mt-3.5 pt-2.5 border-t border-[#efece6] dark:border-[#26282f] flex items-center justify-between text-xs">
                {isSafe ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Can safely bunk <strong>{subject.safeBunks}</strong> class{subject.safeBunks !== 1 ? 'es' : ''}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Must attend next <strong>{subject.classesToRecover}</strong> class{subject.classesToRecover !== 1 ? 'es' : ''}</span>
                  </div>
                )}
                <span className="text-stone-400 text-[11px]">
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
