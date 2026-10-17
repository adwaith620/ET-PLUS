'use client';

import React, { useState } from 'react';
import { AttendanceRadial } from '@/components/attendance/attendance-radial';
import { TargetSelector } from '@/components/attendance/target-selector';
import { WhatIfSimulator } from '@/components/attendance/what-if-simulator';
import { FullDaySimulator } from '@/components/attendance/full-day-simulator';
import { SubjectList } from '@/components/attendance/subject-card';
import { calculateAttendanceSummary } from '@/lib/attendance-calculator';
import { SubjectAttendanceData, TimetableSlot } from '@/types';
import { useAttendanceTarget } from '@/context/attendance-target-context';
import { Sparkles, Layers } from 'lucide-react';

interface AttendanceClientProps {
  initialSubjects: SubjectAttendanceData[];
  timetable: TimetableSlot[];
}

export function AttendanceClient({
  initialSubjects,
  timetable,
}: AttendanceClientProps) {
  const { target, setTarget } = useAttendanceTarget();
  const [activeTab, setActiveTab] = useState<'analytics' | 'whatif'>('analytics');

  // Recalculate summary whenever user changes target
  const summary = calculateAttendanceSummary(initialSubjects, target);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6]">
          Attendance Analytics & Simulator
        </h1>
        <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-1">
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
      <div className="flex border-b border-[#e7e4de] dark:border-[#2a2d35] gap-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'analytics'
              ? 'border-[#1c1917] text-[#1c1917] dark:border-[#f3f4f6] dark:text-[#f3f4f6]'
              : 'border-transparent text-[#78716c] hover:text-[#1c1917] dark:text-[#9ca3af] dark:hover:text-[#f3f4f6]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Course Breakdown</span>
        </button>

        <button
          onClick={() => setActiveTab('whatif')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'whatif'
              ? 'border-[#1c1917] text-[#1c1917] dark:border-[#f3f4f6] dark:text-[#f3f4f6]'
              : 'border-transparent text-[#78716c] hover:text-[#1c1917] dark:text-[#9ca3af] dark:hover:text-[#f3f4f6]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>What-If Forecast Simulator</span>
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
    </div>
  );
}
