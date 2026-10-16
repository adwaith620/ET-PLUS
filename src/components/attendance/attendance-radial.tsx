'use client';

import React from 'react';

interface AttendanceRadialProps {
  percentage: number;
  targetPercentage: number;
  attended: number;
  total: number;
  safeBunks: number;
  classesToRecover: number;
}

export function AttendanceRadial({
  percentage,
  targetPercentage,
  attended,
  total,
  safeBunks,
  classesToRecover,
}: AttendanceRadialProps) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  const isSafe = percentage >= targetPercentage;
  const isWarning = !isSafe && percentage >= targetPercentage - 5;

  const strokeColor = isSafe
    ? '#10b981' // emerald-500
    : isWarning
    ? '#f59e0b' // amber-500
    : '#ef4444'; // red-500

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* SVG Radial Progress Ring */}
      <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            className="stroke-slate-100 dark:stroke-slate-800"
            strokeWidth="14"
            fill="transparent"
          />
          {/* Target marker ring or indicator */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={strokeColor}
            strokeWidth="14"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {percentage}%
          </span>
          <span className="text-xs font-semibold text-slate-400 mt-0.5">
            {attended} / {total} hrs
          </span>
          <span
            className={`mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSafe
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                : isWarning
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400'
            }`}
          >
            {isSafe ? 'Eligible' : isWarning ? 'Warning' : 'Shortage'}
          </span>
        </div>
      </div>

      {/* Analytics Breakdown & Guidance */}
      <div className="flex-1 space-y-3 w-full">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Institutional Status
            </span>
            <span className="text-xs text-slate-400">• Target: {targetPercentage}%</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            {isSafe
              ? `You are safely above your target (${percentage}% vs ${targetPercentage}%)`
              : `Attendance shortage detected (${percentage}% vs ${targetPercentage}%)`}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {isSafe
              ? `You have attended ${attended} out of ${total} conducted hours. Based on your ${targetPercentage}% target, you can afford up to ${safeBunks} more consecutive absences across all courses without falling below.`
              : `You need to attend ${classesToRecover} consecutive class${classesToRecover > 1 ? 'es' : ''} to reach your ${targetPercentage}% goal. Missing any more classes will worsen your shortage.`}
          </p>
        </div>

        {/* Metrics Pill Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Attended</span>
            <span className="text-base font-bold text-slate-900 dark:text-white">{attended} hrs</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Missed</span>
            <span className="text-base font-bold text-slate-900 dark:text-white">{total - attended} hrs</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              {isSafe ? 'Safe Absences' : 'Need to Recover'}
            </span>
            <span
              className={`text-base font-bold ${
                isSafe ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {isSafe ? `${safeBunks} classes` : `${classesToRecover} classes`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
