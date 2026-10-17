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
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-lg bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] animate-fade-in-up">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-md bg-[#f4f1eb] dark:bg-[#22252c] text-stone-700 dark:text-stone-300">
          <Target className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
              Attendance Target
            </h4>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50 font-medium">
              Auto-saved
            </span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            Active application-wide target • KTU mandatory minimum requirement is 75%
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-[#f7f6f3] dark:bg-[#202227] p-1 rounded-md border border-[#e7e4de] dark:border-[#2a2d35]">
        {presetTargets.map((target) => (
          <button
            key={target}
            onClick={() => onTargetChange(target)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              currentTarget === target
                ? 'bg-white dark:bg-[#18191d] text-stone-900 dark:text-white font-semibold shadow-xs border border-[#e7e4de] dark:border-[#2f323c]'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            {target}%
          </button>
        ))}

        {/* Custom target input */}
        <div className="flex items-center pl-1 border-l border-[#e7e4de] dark:border-[#2f323c]">
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
            className="w-12 px-1.5 py-0.5 text-xs text-center font-semibold bg-white dark:bg-[#18191d] rounded border border-[#e7e4de] dark:border-[#2f323c] text-stone-900 dark:text-white outline-none focus:ring-1 focus:ring-stone-400"
            title="Custom target percentage"
          />
          <span className="text-xs font-semibold text-stone-400 ml-1 pr-1">%</span>
        </div>
      </div>
    </div>
  );
}
