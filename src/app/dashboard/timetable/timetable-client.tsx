'use client';

import React, { useState } from 'react';
import { TimetableSlot, SubjectAttendanceData } from '@/types';
import { getCourseFullName } from '@/lib/course-catalog';
import { isClassBunkable } from '@/lib/attendance-calculator';
import { useAttendanceTarget } from '@/context/attendance-target-context';
import { Clock, User, Download, List, Grid } from 'lucide-react';

interface TimetableClientProps {
  slots: TimetableSlot[];
  subjects?: SubjectAttendanceData[];
}

export function TimetableClient({ slots, subjects = [] }: TimetableClientProps) {
  const { target } = useAttendanceTarget();

  // Strictly Monday through Friday (Saturday explicitly excluded)
  const days: TimetableSlot['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const [selectedDay, setSelectedDay] = useState<TimetableSlot['day']>('Monday');
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  // Filter slots for selected day, strictly limited to periods 1-6
  const dailySlots = slots
    .filter((s) => s.day === selectedDay && s.period >= 1 && s.period <= 6)
    .sort((a, b) => a.period - b.period);

  // Strictly periods 1 through 6
  const periods = [1, 2, 3, 4, 5, 6];

  const handleExportCsv = () => {
    let csv = 'Day,Period 1,Period 2,Period 3,Period 4,Period 5,Period 6\n';
    days.forEach((day) => {
      const daySlots = slots.filter((s) => s.day === day && s.period >= 1 && s.period <= 6);
      const row: string[] = [day];
      periods.forEach((p) => {
        const slot = daySlots.find((s) => s.period === p);
        if (!slot || slot.type === 'Free') {
          row.push(slot?.type === 'Free' ? '"Free Period"' : '"-"');
        } else {
          row.push(`"${slot.subjectCode} - ${getCourseFullName(slot.subjectCode, slot.subjectName)} (${slot.faculty}) - ${slot.type}"`);
        }
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6]">
            Class Timetable
          </h1>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-1">
            Official academic schedule • TKM College of Engineering
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#f4f1eb] dark:bg-[#202227] p-1 rounded-lg">
            <button
              onClick={() => setViewMode('daily')}
              aria-label="Daily list view"
              className={`px-3 py-2 min-h-[40px] rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'daily'
                  ? 'bg-white dark:bg-[#1b1d22] text-[#1c1917] dark:text-[#f3f4f6] shadow-xs'
                  : 'text-[#78716c] dark:text-[#9ca3af]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Daily</span>
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              aria-label="Weekly grid view"
              className={`px-3 py-2 min-h-[40px] rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'weekly'
                  ? 'bg-white dark:bg-[#1b1d22] text-[#1c1917] dark:text-[#f3f4f6] shadow-xs'
                  : 'text-[#78716c] dark:text-[#9ca3af]'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Weekly Grid</span>
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            aria-label="Export timetable as CSV"
            className="px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-medium bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] hover:bg-[#f9f8f5] dark:hover:bg-[#202227] flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#78716c] dark:text-[#9ca3af]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {viewMode === 'daily' ? (
        <div className="space-y-4">
          {/* Day selection tabs */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#1b1d22] p-1.5 rounded-xl border border-[#e7e4de] dark:border-[#2a2d35] overflow-x-auto shadow-xs">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-1 min-w-[70px] min-h-[40px] py-2 text-xs font-medium rounded-lg transition-all ${
                  selectedDay === day
                    ? 'bg-[#1c1917] text-white dark:bg-[#f3f4f6] dark:text-[#141518] shadow-xs'
                    : 'text-[#78716c] dark:text-[#9ca3af] hover:bg-[#f4f1eb] dark:hover:bg-[#202227]'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Daily list */}
          <div className="space-y-3">
            {dailySlots.map((slot) => {
              if (slot.type === 'Free') {
                return (
                  <div
                    key={slot.period}
                    className="p-4 sm:p-5 rounded-xl bg-[#faf8f5]/60 dark:bg-[#181a1f]/60 border border-dashed border-[#e7e4de] dark:border-[#2a2d35] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-lg bg-[#f4f1eb] dark:bg-[#202227] text-[#78716c] dark:text-[#9ca3af] flex flex-col items-center justify-center shrink-0 border border-[#e7e4de] dark:border-[#2a2d35]">
                        <span className="text-[9px] font-semibold uppercase">Period</span>
                        <span className="text-sm font-bold">{slot.period}</span>
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-semibold text-[#78716c] dark:text-[#9ca3af]">
                          Free Period — No Class Scheduled
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[#a8a29e] dark:text-[#6b7280] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {slot.startTime} – {slot.endTime}
                          </span>
                        </div>
                        <p className="text-xs text-[#a8a29e] dark:text-[#6b7280] mt-1">
                          Unscheduled study gap.
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded bg-[#f4f1eb] dark:bg-[#202227] text-[#78716c] dark:text-[#9ca3af] border border-[#e7e4de] dark:border-[#2a2d35] self-start sm:self-auto">
                      Free Period
                    </span>
                  </div>
                );
              }

              const bunkable = isClassBunkable(slot.subjectCode, subjects, target, 1);

              return (
                <div
                  key={slot.period}
                  className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-[#d6d2cb] dark:hover:border-[#383c46] transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-lg bg-[#f4f1eb] dark:bg-[#202227] text-[#1c1917] dark:text-[#f3f4f6] flex flex-col items-center justify-center shrink-0 border border-[#e7e4de] dark:border-[#2a2d35]">
                      <span className="text-[9px] font-semibold uppercase text-[#78716c] dark:text-[#9ca3af]">Period</span>
                      <span className="text-sm font-bold">{slot.period}</span>
                    </div>

                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
                        {getCourseFullName(slot.subjectCode, slot.subjectName)}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-mono font-medium text-[#1c1917] dark:text-[#f3f4f6] bg-[#f4f1eb] dark:bg-[#202227] px-2 py-0.5 rounded border border-[#e7e4de] dark:border-[#2a2d35]">
                          {slot.subjectCode}
                        </span>
                        <span className="text-xs text-[#78716c] dark:text-[#9ca3af] flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#a8a29e]" />
                          {slot.startTime} – {slot.endTime}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-[#78716c] dark:text-[#9ca3af]">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-[#a8a29e]" />
                          {slot.faculty}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {bunkable && (
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded border bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50">
                        Bunkable
                      </span>
                    )}
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded border bg-[#f4f1eb] dark:bg-[#202227] text-[#78716c] dark:text-[#9ca3af] border-[#e7e4de] dark:border-[#2a2d35]">
                      {slot.type === 'Lab' ? 'Lab' : slot.type === 'Elective' ? 'Elective' : 'Theory'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Weekly Grid View */
        <div
          className="overflow-x-auto rounded-xl border border-[#e7e4de] dark:border-[#2a2d35] bg-white dark:bg-[#1b1d22] shadow-xs focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-hidden"
          tabIndex={0}
          role="region"
          aria-label="Weekly class timetable grid"
        >
          <table className="w-full text-xs text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#f9f8f5] dark:bg-[#181a1f] border-b border-[#e7e4de] dark:border-[#2a2d35]">
                <th className="p-3 font-semibold text-[#78716c] dark:text-[#9ca3af] uppercase tracking-wider text-[11px]">Day</th>
                {periods.map((p) => (
                  <th key={p} className="p-3 font-semibold text-[#78716c] dark:text-[#9ca3af] uppercase tracking-wider text-[11px]">
                    Period {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7e4de] dark:divide-[#2a2d35]">
              {days.map((day) => {
                const daySlots = slots.filter((s) => s.day === day);
                return (
                  <tr key={day} className="hover:bg-[#fdfcfb] dark:hover:bg-[#202227]/50">
                    <td className="p-3 font-semibold text-[#1c1917] dark:text-[#f3f4f6] whitespace-nowrap">
                      {day}
                    </td>
                    {periods.map((p) => {
                      const slot = daySlots.find((s) => s.period === p);
                      return (
                        <td key={p} className="p-2 align-top min-w-[130px]">
                          {slot ? (
                            slot.type === 'Free' ? (
                              <div className="p-2 rounded-lg bg-transparent border border-dashed border-[#e7e4de] dark:border-[#2a2d35] space-y-1 text-center py-3">
                                <p className="font-medium text-[#a8a29e] dark:text-[#6b7280] text-[10px]">
                                  Free Period
                                </p>
                              </div>
                            ) : (
                              <div className="p-2 rounded-lg bg-[#fdfcfb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono text-[10px] text-[#78716c] dark:text-[#9ca3af]">{slot.subjectCode}</span>
                                  {slot.type === 'Lab' && (
                                    <span className="text-[9px] font-semibold uppercase px-1 rounded bg-[#f4f1eb] dark:bg-[#202227] text-[#78716c] dark:text-[#9ca3af] border border-[#e7e4de] dark:border-[#2a2d35]">
                                      Lab
                                    </span>
                                  )}
                                </div>
                                <p className="font-semibold text-[#1c1917] dark:text-[#f3f4f6] text-[11px] line-clamp-2 leading-tight">
                                  {getCourseFullName(slot.subjectCode, slot.subjectName)}
                                </p>
                                <div className="text-[10px] text-[#78716c] dark:text-[#9ca3af]">
                                  <span className="truncate block" title={slot.faculty}>{slot.faculty}</span>
                                </div>
                              </div>
                            )
                          ) : (
                            <span className="text-[#d6d2cb] dark:text-[#383c46] font-bold text-center block">
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
