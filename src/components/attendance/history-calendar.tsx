'use client';

import React, { useState } from 'react';
import { DayAttendanceHistory } from '@/types';
import { getCourseFullName } from '@/lib/course-catalog';
import { Calendar, CheckCircle2, XCircle } from 'lucide-react';

interface HistoryCalendarProps {
  history: DayAttendanceHistory[];
}

export function HistoryCalendar({ history }: HistoryCalendarProps) {
  const [filter, setFilter] = useState<'all' | 'absent' | 'perfect'>('all');

  const filteredHistory = history.filter((day) => {
    const hasAbsent = day.periods.some((p) => p.status === 'absent');
    if (filter === 'absent') return hasAbsent;
    if (filter === 'perfect') return !hasAbsent;
    return true;
  });

  return (
    <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#f4f1eb] dark:bg-[#202227] text-[#1c1917] dark:text-[#f3f4f6]">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
              Day-by-Day Attendance History
            </h3>
            <p className="text-xs text-[#78716c] dark:text-[#9ca3af]">
              Period-wise log of verified attendance marked by faculties on ETLAB
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-[#f4f1eb] dark:bg-[#202227] p-1 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-white dark:bg-[#1b1d22] text-[#1c1917] dark:text-[#f3f4f6] shadow-xs'
                : 'text-[#78716c] dark:text-[#9ca3af] hover:text-[#1c1917] dark:hover:text-[#f3f4f6]'
            }`}
          >
            All Days
          </button>
          <button
            onClick={() => setFilter('absent')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              filter === 'absent'
                ? 'bg-white dark:bg-[#1b1d22] text-rose-700 dark:text-rose-400 shadow-xs'
                : 'text-[#78716c] dark:text-[#9ca3af] hover:text-[#1c1917] dark:hover:text-[#f3f4f6]'
            }`}
          >
            Days with Absences
          </button>
          <button
            onClick={() => setFilter('perfect')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              filter === 'perfect'
                ? 'bg-white dark:bg-[#1b1d22] text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-[#78716c] dark:text-[#9ca3af] hover:text-[#1c1917] dark:hover:text-[#f3f4f6]'
            }`}
          >
            100% Present Days
          </button>
        </div>
      </div>

      {/* Timeline Days List */}
      <div className="space-y-3 pt-1">
        {filteredHistory.map((day) => {
          const hasAbsence = day.periods.some((p) => p.status === 'absent');
          const dayPercentage = Math.round((day.totalPresent / day.totalConducted) * 100);

          return (
            <div
              key={day.date}
              className="p-4 rounded-lg border border-[#e7e4de] dark:border-[#2a2d35] bg-[#fdfcfb] dark:bg-[#181a1f] hover:border-[#d6d2cb] dark:hover:border-[#383c46] transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#e7e4de] dark:border-[#2a2d35] gap-2">
                <div className="flex items-center gap-3">
                  <div className="text-center px-2.5 py-1 rounded-md bg-white dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35]">
                    <span className="text-[10px] font-semibold uppercase text-[#78716c] dark:text-[#9ca3af] block">
                      {day.dayOfWeek.slice(0, 3)}
                    </span>
                    <span className="text-xs font-bold text-[#1c1917] dark:text-[#f3f4f6]">
                      {day.date.split('-')[2]}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
                      {day.dayOfWeek}, {day.date}
                    </h4>
                    <span className="text-[11px] text-[#78716c] dark:text-[#9ca3af]">
                      {day.totalPresent} of {day.totalConducted} periods attended ({dayPercentage}%)
                    </span>
                  </div>
                </div>

                <span
                  className={`self-start sm:self-auto px-2 py-0.5 rounded text-[11px] font-medium ${
                    !hasAbsence
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
                      : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40'
                  }`}
                >
                  {!hasAbsence ? 'Full Attendance' : 'Partial Absence'}
                </span>
              </div>

              {/* Periods Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mt-3">
                {day.periods.map((period) => {
                  const isPresent = period.status === 'present';
                  return (
                    <div
                      key={period.period}
                      className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between ${
                        isPresent
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40'
                          : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-medium">
                        <span className="text-[#78716c] dark:text-[#9ca3af]">Period {period.period}</span>
                        {isPresent ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        )}
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        <span
                          className="font-semibold text-[#1c1917] dark:text-[#f3f4f6] block text-xs line-clamp-1 leading-snug"
                          title={getCourseFullName(period.subjectCode, period.subjectName)}
                        >
                          {getCourseFullName(period.subjectCode, period.subjectName)}
                        </span>
                        <span className="font-mono text-[10px] text-[#78716c] dark:text-[#9ca3af] block">
                          {period.subjectCode}
                        </span>
                        <span
                          className={`text-[10px] font-medium capitalize block pt-0.5 ${
                            isPresent ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {period.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
