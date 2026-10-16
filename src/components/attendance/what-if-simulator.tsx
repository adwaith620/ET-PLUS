'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Minus,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Info,
} from 'lucide-react';
import { SubjectAttendance } from '@/types';
import {
  calculatePercentage,
  getAttendanceStatus,
} from '@/lib/attendance-calculator';

interface WhatIfSimulatorProps {
  subjects: SubjectAttendance[];
  totalAttended: number;
  totalConducted: number;
  targetPercentage: number;
}

export function WhatIfSimulator({
  subjects,
  totalAttended,
  totalConducted,
  targetPercentage,
}: WhatIfSimulatorProps) {
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('OVERALL');
  const [missCount, setMissCount] = useState<number>(0);
  const [attendCount, setAttendCount] = useState<number>(0);

  // Active baseline data
  let currentAttended = totalAttended;
  let currentTotal = totalConducted;
  let label = 'Overall Combined Attendance';

  if (selectedSubjectCode !== 'OVERALL') {
    const sub = subjects.find((s) => s.code === selectedSubjectCode);
    if (sub) {
      currentAttended = sub.attendedHours;
      currentTotal = sub.totalHours;
      label = `${sub.code}: ${sub.name}`;
    }
  }

  const currentPercentage = calculatePercentage(currentAttended, currentTotal);

  // Calculate projection:
  // First apply hypothetical attendances (A + attendCount, T + attendCount)
  // Then apply hypothetical misses (T + attendCount + missCount)
  const projectedAttended = currentAttended + attendCount;
  const projectedTotal = currentTotal + attendCount + missCount;
  const projectedPercentage = calculatePercentage(projectedAttended, projectedTotal);

  const delta = Number((projectedPercentage - currentPercentage).toFixed(2));
  const currentStatus = getAttendanceStatus(currentPercentage, targetPercentage);
  const projectedStatus = getAttendanceStatus(projectedPercentage, targetPercentage);

  const handleQuickPreset = (miss: number, attend: number) => {
    setMissCount(miss);
    setAttendCount(attend);
  };

  const handleReset = () => {
    setMissCount(0);
    setAttendCount(0);
  };

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                What-If Attendance Simulator
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 uppercase tracking-wide">
                Hypothetical
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Simulate upcoming attendances or absences to forecast percentage changes
            </p>
          </div>
        </div>

        {/* Course dropdown selector */}
        <select
          value={selectedSubjectCode}
          onChange={(e) => {
            setSelectedSubjectCode(e.target.value);
            handleReset();
          }}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="OVERALL">Overall Attendance (All Courses)</option>
          {subjects.map((sub) => (
            <option key={sub.code} value={sub.code}>
              {sub.code}: {sub.name} ({sub.percentage}%)
            </option>
          ))}
        </select>
      </div>

      {/* Projection Comparison Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
        {/* Baseline State */}
        <div className="flex flex-col justify-between p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Current Baseline
            </span>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate mt-0.5">
              {label}
            </p>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {currentPercentage}%
              </span>
              <span className="text-xs text-slate-400 block mt-0.5">
                {currentAttended} / {currentTotal} hours
              </span>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                currentStatus === 'safe'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : currentStatus === 'warning'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
              }`}
            >
              {currentStatus}
            </span>
          </div>
        </div>

        {/* Projected State */}
        <div className="flex flex-col justify-between p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Projected Forecast
              </span>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                After +{attendCount} attended, -{missCount} missed
              </p>
            </div>
            {delta !== 0 && (
              <span
                className={`flex items-center gap-1 text-xs font-extrabold px-2 py-0.5 rounded-full ${
                  delta > 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                }`}
              >
                {delta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {delta > 0 ? `+${delta}%` : `${delta}%`}
              </span>
            )}
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span
                className={`text-3xl font-extrabold ${
                  projectedPercentage >= targetPercentage
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {projectedPercentage}%
              </span>
              <span className="text-xs text-slate-400 block mt-0.5">
                {projectedAttended} / {projectedTotal} projected hours
              </span>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                projectedStatus === 'safe'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : projectedStatus === 'warning'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
              }`}
            >
              {projectedStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Scenario Preset Pills */}
      <div>
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
          One-Click Scenarios
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickPreset(1, 0)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              missCount === 1 && attendCount === 0
                ? 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            Miss next 1 class (-1)
          </button>
          <button
            onClick={() => handleQuickPreset(2, 0)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              missCount === 2 && attendCount === 0
                ? 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            Miss next 2 classes (-2)
          </button>
          <button
            onClick={() => handleQuickPreset(0, 3)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              missCount === 0 && attendCount === 3
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            Attend next 3 classes (+3)
          </button>
          <button
            onClick={() => handleQuickPreset(0, 5)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              missCount === 0 && attendCount === 5
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            Attend next 5 classes (+5)
          </button>
          <button
            onClick={() => handleQuickPreset(4, 0)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              missCount === 4 && attendCount === 0
                ? 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            Skip full day (4-6 periods)
          </button>
          {(missCount > 0 || attendCount > 0) && (
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Steppers for custom absences and attendances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        {/* Attend Stepper */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Additional Classes Attended
            </span>
            <span className="text-[11px] text-slate-400">Formula: P = 100 × (A + n) / (T + n)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAttendCount(Math.max(0, attendCount - 1))}
              className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-sm text-slate-900 dark:text-white">
              {attendCount}
            </span>
            <button
              onClick={() => setAttendCount(attendCount + 1)}
              className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Miss Stepper */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Additional Classes Missed
            </span>
            <span className="text-[11px] text-slate-400">Formula: P = 100 × A / (T + m)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMissCount(Math.max(0, missCount - 1))}
              className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-sm text-slate-900 dark:text-white">
              {missCount}
            </span>
            <button
              onClick={() => setMissCount(missCount + 1)}
              className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center hover:bg-red-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Hypothetical Notice disclaimer */}
      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100/60 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800">
        <Info className="w-4 h-4 shrink-0 text-slate-400" />
        <span>
          Simulated outcomes are for personal academic planning only and do not alter official college records.
        </span>
      </div>
    </div>
  );
}
