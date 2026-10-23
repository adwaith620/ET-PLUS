'use client';

import React, { useState, useEffect } from 'react';

interface OverviewRadialGaugeProps {
  percentage: number;
  targetPercentage: number;
  attended: number;
  total: number;
}

export function OverviewRadialGauge({
  percentage,
  targetPercentage,
  attended,
  total,
}: OverviewRadialGaugeProps) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  const isAvailable = total > 0;

  const [animatedPercentage, setAnimatedPercentage] = useState<number>(() => {
    if (!isAvailable) return 0;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return percentage;
    }
    return 0;
  });

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setAnimatedPercentage(isAvailable ? percentage : 0);
    });

    return () => cancelAnimationFrame(frameId);
  }, [percentage, isAvailable]);

  const clampedVal = isAvailable ? Math.min(100, Math.max(0, animatedPercentage)) : 0;
  const strokeDashoffset = isAvailable
    ? circumference - (clampedVal / 100) * circumference
    : circumference;

  const isSafe = isAvailable && percentage >= targetPercentage;
  const isWarning = isAvailable && !isSafe && percentage >= targetPercentage - 5;
  const strokeColor = !isAvailable
    ? '#a8a29e'
    : isSafe
    ? '#16a34a'
    : isWarning
    ? '#d97706'
    : '#dc2626';

  return (
    <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center shrink-0">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 170 170">
        <circle
          cx="85"
          cy="85"
          r={radius}
          className="stroke-[#efece6] dark:stroke-[#262831]"
          strokeWidth="10"
          fill="transparent"
        />
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
          className="motion-reduce:transition-none transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none select-none">
        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
          {isAvailable ? `${percentage}%` : '—'}
        </span>
        <span className="text-xs text-stone-500 dark:text-stone-400 font-mono mt-1">
          {isAvailable ? `${attended} / ${total} hrs` : 'No records'}
        </span>
        <span
          className={`mt-2 px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
            !isAvailable
              ? 'bg-stone-100 text-stone-600 border-stone-200 dark:bg-[#23262c] dark:text-stone-400 dark:border-[#2e3138]'
              : isSafe
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-[#14281c] dark:text-emerald-400 dark:border-[#1e3d29]'
              : isWarning
              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-[#2b2210] dark:text-amber-400 dark:border-[#423519]'
              : 'bg-red-50 text-red-800 border-red-200 dark:bg-[#2c1618] dark:text-red-400 dark:border-[#441f23]'
          }`}
        >
          {!isAvailable ? 'Unavailable' : isSafe ? 'Eligible' : isWarning ? 'Warning' : 'Shortage'}
        </span>
      </div>
    </div>
  );
}
