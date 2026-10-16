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

  // Get periods scheduled for this day
  const scheduledPeriods = timetable
    .filter((slot) => slot.day === selectedDay)
    .sort((a, b) => a.period - b.period);

  const totalPeriodsToday = scheduledPeriods.length;

  // Calculate impact: for each subject scheduled today, increment conducted hours by count of periods scheduled
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

  // Overall impact
  const currentOverall = calculatePercentage(totalAttended, totalConducted);
  const newOverallConducted = totalConducted + totalPeriodsToday;
  const newOverallPercentage = calculatePercentage(totalAttended, newOverallConducted);
  const overallDelta = Number((newOverallPercentage - currentOverall).toFixed(2));

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <CalendarX2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Full-Day Absence Simulator
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a weekday to analyze the exact cascading impact of missing all its scheduled periods
            </p>
          </div>
        </div>

        {/* Day selection tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedDay === day
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Impact Alert Banner */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Missing all {totalPeriodsToday} classes on {selectedDay}:
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Overall attendance drops from <strong>{currentOverall}%</strong> to{' '}
            <strong className={newOverallPercentage < targetPercentage ? 'text-red-500' : 'text-amber-500'}>
              {newOverallPercentage}%
            </strong>{' '}
            ({overallDelta}%)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-bold">
            {overallDelta}% Drop
          </div>
        </div>
      </div>

      {/* Affected Courses breakdown */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
          Breakdown by Scheduled Courses
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {subjectImpacts
            .filter((s) => s.affected)
            .map((sub) => {
              const willBeBelow = sub.projectedPercentage < targetPercentage;
              return (
                <div
                  key={sub.code}
                  className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-blue-600 dark:text-blue-400">{sub.code}</span>
                      <span className="text-red-500 font-semibold">{sub.delta}%</span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate mt-1">
                      {sub.name}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      {sub.periodsMissed} period{sub.periodsMissed > 1 ? 's' : ''} affected
                    </span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{sub.percentage}%</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className={`font-bold ${willBeBelow ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}`}>
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
