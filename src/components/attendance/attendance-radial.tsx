'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

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
  // Generously sized radial gauge with comfortable text-to-ring gap
  const radius = 72;
  const circumference = 2 * Math.PI * radius;

  // Track animated percentage for smooth entrance and transition without resetting to 0
  const [animatedPercentage, setAnimatedPercentage] = useState<number>(0);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(false);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setIsReducedMotion(true);
      setAnimatedPercentage(percentage);
      mountedRef.current = true;
      return;
    }

    // Smooth entrance animation from 0 to percentage over 500-700ms
    const frameId = requestAnimationFrame(() => {
      setAnimatedPercentage(percentage);
      mountedRef.current = true;
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  // When forecasting or attendance targets update, smoothly transition without resetting to 0
  useEffect(() => {
    if (mountedRef.current) {
      setAnimatedPercentage(percentage);
    }
  }, [percentage]);

  const clampedVal = Math.min(100, Math.max(0, animatedPercentage));
  const strokeDashoffset = circumference - (clampedVal / 100) * circumference;

  const isSafe = percentage >= targetPercentage;
  const isWarning = !isSafe && percentage >= targetPercentage - 5;

  const strokeColor = isSafe
    ? '#16a34a'
    : isWarning
    ? '#d97706'
    : '#dc2626';

  return (
    <div className="p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs space-y-6 animate-fade-in-up animate-delay-1">
      {/* Top Header: Title & Target Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#e7e4de] dark:border-[#2a2d35]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-stone-600 dark:text-stone-400" />
          <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
            Attendance Performance Overview
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
            Active Target: <strong className="text-stone-800 dark:text-stone-200">{targetPercentage}%</strong>
          </span>
          <span
            className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
              isSafe
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-[#14281c] dark:text-emerald-400 dark:border-[#1e3d29]'
                : isWarning
                ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-[#2b2210] dark:text-amber-400 dark:border-[#423519]'
                : 'bg-red-50 text-red-800 border-red-200 dark:bg-[#2c1618] dark:text-red-400 dark:border-[#441f23]'
            }`}
          >
            {isSafe ? 'Eligible' : isWarning ? 'Warning' : 'Shortage'}
          </span>
        </div>
      </div>

      {/* Enlarged Centered Circular Gauge */}
      <div className="flex flex-col items-center justify-center py-2">
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 170 170">
            {/* Background track */}
            <circle
              cx="85"
              cy="85"
              r={radius}
              className="stroke-[#efece6] dark:stroke-[#262831]"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Progress track */}
            <circle
              cx="85"
              cy="85"
              r={radius}
              stroke={strokeColor}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className={isReducedMotion ? '' : 'transition-[stroke-dashoffset] duration-700 ease-out'}
            />
          </svg>

          {/* Centered label with generous spacing from ring */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none select-none">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
              {percentage}%
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-mono mt-1">
              {attended} / {total} hrs
            </span>
            <span
              className={`mt-2 px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                isSafe
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-[#14281c] dark:text-emerald-400 dark:border-[#1e3d29]'
                  : isWarning
                  ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-[#2b2210] dark:text-amber-400 dark:border-[#423519]'
                  : 'bg-red-50 text-red-800 border-red-200 dark:bg-[#2c1618] dark:text-red-400 dark:border-[#441f23]'
              }`}
            >
              {isSafe ? 'Eligible' : isWarning ? 'Warning' : 'Shortage'}
            </span>
          </div>
        </div>
      </div>

      {/* Attended & Conducted Hours Grid Below the Chart */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="p-3.5 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#282b33]">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Attended Hours</span>
          <span className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5 block">{attended} hrs</span>
        </div>
        <div className="p-3.5 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#282b33]">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Conducted Hours</span>
          <span className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5 block">{total} hrs</span>
        </div>
        <div className="p-3.5 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#282b33]">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Missed Hours</span>
          <span className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5 block">{total - attended} hrs</span>
        </div>
        <div className="p-3.5 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#282b33]">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Target Threshold</span>
          <span className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5 block">{targetPercentage}%</span>
        </div>
      </div>

      {/* Safe-absence summary beneath those figures */}
      <div className="p-4 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#282b33]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSafe ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )}
            <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
              {isSafe ? 'Safe Absence Allowance' : 'Consecutive Classes Required to Recover'}
            </span>
          </div>
          <span
            className={`text-xs font-bold ${
              isSafe ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {isSafe ? `${safeBunks} classes` : `${classesToRecover} classes`}
          </span>
        </div>
        <p className="text-xs text-stone-600 dark:text-stone-400 mt-1.5 leading-relaxed">
          {isSafe
            ? `You have attended ${attended} out of ${total} conducted hours. Based on your ${targetPercentage}% target, you can safely miss up to ${safeBunks} more classes without falling into shortage.`
            : `You need to attend the next ${classesToRecover} consecutive class${classesToRecover > 1 ? 'es' : ''} without absence to restore your attendance to the required ${targetPercentage}% institutional threshold.`}
        </p>
      </div>
    </div>
  );
}
