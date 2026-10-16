'use client';

import React, { useState } from 'react';
import { DayAttendanceHistory } from '@/types';
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
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Day-by-Day Attendance History
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Period-wise log of verified attendance marked by faculties on ETLAB
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            All Days
          </button>
          <button
            onClick={() => setFilter('absent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'absent'
                ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Days with Absences
          </button>
          <button
            onClick={() => setFilter('perfect')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'perfect'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            100% Present Days
          </button>
        </div>
      </div>

      {/* Timeline Days List */}
      <div className="space-y-3 pt-2">
        {filteredHistory.map((day) => {
          const hasAbsence = day.periods.some((p) => p.status === 'absent');
          const dayPercentage = Math.round((day.totalPresent / day.totalConducted) * 100);

          return (
            <div
              key={day.date}
              className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-3">
                  <div className="text-center px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      {day.dayOfWeek.slice(0, 3)}
                    </span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      {day.date.split('-')[2]}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {day.dayOfWeek}, {day.date}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {day.totalPresent} of {day.totalConducted} periods attended ({dayPercentage}%)
                    </span>
                  </div>
                </div>

                <span
                  className={`self-start sm:self-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    !hasAbsence
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
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
                      className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                        isPresent
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                          : 'bg-red-50/60 dark:bg-red-950/30 border-red-200 dark:border-red-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-slate-500 dark:text-slate-400">P{period.period}</span>
                        {isPresent ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                        )}
                      </div>
                      <div className="mt-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {period.subjectCode}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase block mt-0.5 ${
                            isPresent ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
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
