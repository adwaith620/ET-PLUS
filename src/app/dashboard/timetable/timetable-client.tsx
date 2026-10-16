'use client';

import React, { useState } from 'react';
import { TimetableSlot } from '@/types';
import { Clock, MapPin, User, Download, List, Grid } from 'lucide-react';

interface TimetableClientProps {
  slots: TimetableSlot[];
}

export function TimetableClient({ slots }: TimetableClientProps) {
  const days: TimetableSlot['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const [selectedDay, setSelectedDay] = useState<TimetableSlot['day']>('Monday');
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  // Filter slots for selected day
  const dailySlots = slots
    .filter((s) => s.day === selectedDay)
    .sort((a, b) => a.period - b.period);

  // Periods matrix for weekly view
  const periods = [1, 2, 3, 4, 5, 6];

  const handleExportCsv = () => {
    let csv = 'Day,Period 1,Period 2,Period 3,Period 4,Period 5,Period 6\n';
    days.forEach((day) => {
      const daySlots = slots.filter((s) => s.day === day);
      const row: string[] = [day];
      periods.forEach((p) => {
        const slot = daySlots.find((s) => s.period === p);
        row.push(slot ? `"${slot.subjectCode} - ${slot.subjectName} (${slot.faculty})"` : '"-"');
      });
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TKMCE_Timetable_${new Date().getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Class Timetable
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Official class schedule for KTU B.Tech CSE (S6) • TKM College of Engineering
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('daily')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'daily'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Daily</span>
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'weekly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Weekly Grid</span>
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {viewMode === 'daily' ? (
        <div className="space-y-4">
          {/* Day selection tabs */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded-xl transition-all ${
                  selectedDay === day
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Daily list */}
          <div className="space-y-3">
            {dailySlots.map((slot) => (
              <div
                key={slot.period}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Period</span>
                    <span className="text-base font-black">{slot.period}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                        {slot.subjectCode}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {slot.startTime} – {slot.endTime}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      {slot.subjectName}
                    </h3>

                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {slot.faculty}
                      </span>
                      {slot.room && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {slot.room}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 self-start sm:self-auto">
                  Theory Course
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Weekly Grid View */
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full text-xs text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Day</th>
                {periods.map((p) => (
                  <th key={p} className="p-3 font-bold text-slate-500 uppercase tracking-wider">
                    Period {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {days.map((day) => {
                const daySlots = slots.filter((s) => s.day === day);
                return (
                  <tr key={day} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {day}
                    </td>
                    {periods.map((p) => {
                      const slot = daySlots.find((s) => s.period === p);
                      return (
                        <td key={p} className="p-2.5 align-top min-w-[130px]">
                          {slot ? (
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                              <span className="font-bold text-blue-600 dark:text-blue-400 block text-[11px]">
                                {slot.subjectCode}
                              </span>
                              <p className="font-medium text-slate-800 dark:text-slate-200 text-[10px] line-clamp-1">
                                {slot.subjectName}
                              </p>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {slot.room}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700 font-bold text-center block">
                              –
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
