'use client';

import React, { useState } from 'react';
import { AttendanceRadial } from '@/components/attendance/attendance-radial';
import { TargetSelector } from '@/components/attendance/target-selector';
import { WhatIfSimulator } from '@/components/attendance/what-if-simulator';
import { FullDaySimulator } from '@/components/attendance/full-day-simulator';
import { SubjectList } from '@/components/attendance/subject-card';
import { HistoryCalendar } from '@/components/attendance/history-calendar';
import { calculateAttendanceSummary } from '@/lib/attendance-calculator';
import { SubjectAttendanceData, TimetableSlot, DayAttendanceHistory } from '@/types';
import { Sparkles, Calendar, Layers } from 'lucide-react';

interface AttendanceClientProps {
  initialSubjects: SubjectAttendanceData[];
  timetable: TimetableSlot[];
  dayHistory: DayAttendanceHistory[];
}

export function AttendanceClient({
  initialSubjects,
  timetable,
  dayHistory,
}: AttendanceClientProps) {
  const [target, setTarget] = useState<number>(75);
  const [activeTab, setActiveTab] = useState<'analytics' | 'whatif' | 'history'>('analytics');

  // Recalculate summary whenever user changes target
  const summary = calculateAttendanceSummary(initialSubjects, target);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Attendance Analytics & Simulator
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Detailed breakdown of attended and conducted hours, safe absences, and forecast simulations
        </p>
      </div>

      {/* Target Selector */}
      <TargetSelector currentTarget={target} onTargetChange={setTarget} />

      {/* Overall Attendance Radial Gauge */}
      <AttendanceRadial
        percentage={summary.overallPercentage}
        targetPercentage={target}
        attended={summary.totalAttended}
        total={summary.totalConducted}
        safeBunks={summary.safeBunks}
        classesToRecover={summary.classesToRecover}
      />

      {/* Navigation View Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'analytics'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Course Breakdown</span>
        </button>

        <button
          onClick={() => setActiveTab('whatif')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'whatif'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>What-If Forecast Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Day-by-Day Log</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <SubjectList subjects={summary.subjects} targetPercentage={target} />
        </div>
      )}

      {activeTab === 'whatif' && (
        <div className="space-y-6">
          <WhatIfSimulator
            subjects={summary.subjects}
            totalAttended={summary.totalAttended}
            totalConducted={summary.totalConducted}
            targetPercentage={target}
          />

          <FullDaySimulator
            timetable={timetable}
            subjects={summary.subjects}
            totalAttended={summary.totalAttended}
            totalConducted={summary.totalConducted}
            targetPercentage={target}
          />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          <HistoryCalendar history={dayHistory} />
        </div>
      )}
    </div>
  );
}
