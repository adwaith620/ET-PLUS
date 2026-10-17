'use client';

import React, { useState } from 'react';
import { CalendarX2, ArrowRight } from 'lucide-react';
import { TimetableSlot, SubjectAttendance } from '@/types';
import { calculatePercentage } from '@/lib/attendance-calculator';

interface FullDaySimulatorProps {
  timetable: TimetableSlot[];
  subjects: SubjectAttendance[];
  totalAttended: number;
  totalConducted: number;
  targetPercentage: number;
}

export function FullDaySimulator({
  timetable,
  subjects,
  totalAttended,
  totalConducted,
  targetPercentage,
}: FullDaySimulatorProps) {
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const scheduledPeriods = timetable
    .filter((slot) => slot.day === selectedDay)
    .sort((a, b) => a.period - b.period);

  const totalPeriodsToday = scheduledPeriods.length;

  const subjectImpacts = subjects.map((sub) => {
    const periodsForSub = scheduledPeriods.filter((p) => p.subjectCode === sub.code).length;
    if (periodsForSub === 0) {
      return {
        ...sub,
        periodsMissed: 0,
        projectedAttended: sub.attendedHours,
        projectedTotal: sub.totalHours,
        projectedPercentage: sub.percentage,
        delta: 0,
        affected: false,
      };
    }

    const projectedAttended = sub.attendedHours;
    const projectedTotal = sub.totalHours + periodsForSub;
    const projectedPercentage = calculatePercentage(projectedAttended, projectedTotal);
    const delta = Number((projectedPercentage - sub.percentage).toFixed(2));

    return {
      ...sub,
      periodsMissed: periodsForSub,
      projectedAttended,
      projectedTotal,
      projectedPercentage,
      delta,
      affected: true,
    };
  });

  const currentOverall = calculatePercentage(totalAttended, totalConducted);
  const newOverallConducted = totalConducted + totalPeriodsToday;
  const newOverallPercentage = calculatePercentage(totalAttended, newOverallConducted);
  const overallDelta = Number((newOverallPercentage - currentOverall).toFixed(2));

  return (
    <div className="p-5 sm:p-6 rounded-lg bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-[#f4f1eb] dark:bg-[#22252c] text-stone-700 dark:text-stone-300">
            <CalendarX2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Full-Day Absence Simulator
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Analyze the compound impact of missing an entire day&apos;s scheduled periods
            </p>
          </div>
        </div>

        {/* Day selection tabs */}
        <div className="flex items-center gap-1 bg-[#f7f6f3] dark:bg-[#202227] p-1 rounded-md border border-[#e7e4de] dark:border-[#2a2d35] self-start sm:self-auto">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                selectedDay === day
                  ? 'bg-white dark:bg-[#18191d] text-stone-900 dark:text-white font-semibold shadow-xs border border-[#e7e4de] dark:border-[#2f323c]'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Impact Banner */}
      <div className="p-3.5 rounded-md bg-[#f9f8f5] dark:bg-[#1f2127] border border-[#e7e4de] dark:border-[#272a31] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
            Missing all {totalPeriodsToday} scheduled classes on {selectedDay}:
          </span>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Overall attendance drops from <strong>{currentOverall}%</strong> to{' '}
            <strong className={newOverallPercentage < targetPercentage ? 'text-red-600 dark:text-red-400' : 'text-stone-800 dark:text-stone-200'}>
              {newOverallPercentage}%
            </strong>
          </p>
        </div>

        <span className="px-2.5 py-1 rounded text-xs font-semibold font-mono bg-red-50 text-red-800 border border-red-200 dark:bg-[#2c1618] dark:text-red-300 dark:border-[#441f23]">
          {overallDelta}% Drop
        </span>
      </div>

      {/* Affected Courses breakdown */}
      <div>
        <h4 className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
          Affected Course Breakdown
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {subjectImpacts
            .filter((s) => s.affected)
            .map((sub) => {
              const willBeBelow = sub.projectedPercentage < targetPercentage;
              return (
                <div
                  key={sub.code}
                  className="p-3 rounded-md border border-[#e7e4de] dark:border-[#2a2d35] bg-white dark:bg-[#18191d] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-stone-800 dark:text-stone-200 font-mono">{sub.code}</span>
                      <span className="text-red-600 dark:text-red-400 font-mono text-[11px]">{sub.delta}%</span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 truncate mt-1">
                      {sub.name}
                    </p>
                    <span className="text-[10px] text-stone-400 block mt-0.5">
                      {sub.periodsMissed} period{sub.periodsMissed > 1 ? 's' : ''} affected
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-[#efece6] dark:border-[#26282f] flex items-center justify-between text-xs font-mono">
                    <span className="text-stone-400">{sub.percentage}%</span>
                    <ArrowRight className="w-3 h-3 text-stone-400" />
                    <span className={`font-semibold ${willBeBelow ? 'text-red-600 dark:text-red-400' : 'text-stone-800 dark:text-stone-200'}`}>
                      {sub.projectedPercentage}%
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
