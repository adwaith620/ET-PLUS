'use client';

import React from 'react';
import { Target } from 'lucide-react';

interface TargetSelectorProps {
  currentTarget: number;
  onTargetChange: (target: number) => void;
}

export function TargetSelector({
  currentTarget,
  onTargetChange,
}: TargetSelectorProps) {
  const presetTargets = [75, 80, 85, 90];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
          <Target className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Attendance Target
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Set your personal analytical threshold (Institutional KTU minimum is 75%)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
        {presetTargets.map((target) => (
          <button
            key={target}
            onClick={() => onTargetChange(target)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentTarget === target
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {target}%
          </button>
        ))}

        {/* Custom target input */}
        <div className="flex items-center pl-1 border-l border-slate-200 dark:border-slate-700">
          <input
            type="number"
            min="50"
            max="100"
            value={currentTarget}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val >= 0 && val <= 100) {
                onTargetChange(val);
              }
            }}
            className="w-14 px-2 py-1 text-xs text-center font-bold bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
            title="Custom target percentage"
          />
          <span className="text-xs font-bold text-slate-400 ml-1 pr-1">%</span>
        </div>
      </div>
    </div>
  );
}
