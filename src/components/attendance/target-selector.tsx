'use client';

import React, { useState } from 'react';
import { Target, AlertCircle } from 'lucide-react';

interface TargetSelectorProps {
  currentTarget: number;
  onTargetChange: (target: number) => void;
}

export function TargetSelector({
  currentTarget,
  onTargetChange,
}: TargetSelectorProps) {
  const presetTargets = [75, 80, 85, 90, 95];

  const [prevTarget, setPrevTarget] = useState<number>(currentTarget);
  const [customInput, setCustomInput] = useState<string>(currentTarget.toString());
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // Sync custom input with currentTarget when currentTarget changes from outside and input is not focused
  if (currentTarget !== prevTarget) {
    setPrevTarget(currentTarget);
    if (!isFocused) {
      setCustomInput(currentTarget.toString());
      setErrorMessage('');
    }
  }

  const handlePresetClick = (preset: number) => {
    setErrorMessage('');
    setCustomInput(preset.toString());
    onTargetChange(preset);
  };

  const handleApplyCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a target percentage');
      return;
    }

    const parsed = parseFloat(trimmed);
    if (isNaN(parsed)) {
      setErrorMessage('Target must be a valid number');
      return;
    }

    if (parsed <= 0 || parsed > 100) {
      setErrorMessage('Target must be greater than 0% and up to 100%');
      return;
    }

    // Round to 1 decimal place to prevent floating point anomalies
    const rounded = Math.round(parsed * 10) / 10;
    setErrorMessage('');
    setCustomInput(rounded.toString());
    onTargetChange(rounded);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyCustom();
    }
  };

  const isPresetActive = (preset: number) => currentTarget === preset;
  const isCustomActive = !presetTargets.includes(currentTarget);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-lg bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35]">
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
                Active: {currentTarget}%
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              Active application-wide target • KTU mandatory minimum requirement is 75%
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1 bg-[#f7f6f3] dark:bg-[#202227] p-1 rounded-md border border-[#e7e4de] dark:border-[#2a2d35]">
            {presetTargets.map((target) => {
              const active = isPresetActive(target);
              return (
                <button
                  key={target}
                  type="button"
                  onClick={() => handlePresetClick(target)}
                  aria-label={`Set target to ${target}%`}
                  aria-pressed={active}
                  className={`px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded text-xs font-medium transition-colors ${
                    active
                      ? 'bg-white dark:bg-[#18191d] text-stone-900 dark:text-white font-semibold shadow-xs border border-[#e7e4de] dark:border-[#2f323c]'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {target}%
                </button>
              );
            })}
          </div>

          {/* Custom Target Input & Apply Button */}
          <div
            className={`flex items-center gap-1 bg-[#f7f6f3] dark:bg-[#202227] p-1 rounded-md border ${
              isCustomActive
                ? 'border-emerald-500/50 dark:border-emerald-500/40 ring-1 ring-emerald-500/20'
                : 'border-[#e7e4de] dark:border-[#2a2d35]'
            }`}
          >
            <label htmlFor="custom-target-input" className="sr-only">
              Custom target percentage
            </label>
            <div className="relative flex items-center">
              <input
                id="custom-target-input"
                type="text"
                inputMode="decimal"
                value={customInput}
                placeholder="Custom"
                aria-label="Custom attendance target percentage"
                aria-invalid={!!errorMessage}
                aria-describedby={errorMessage ? 'custom-target-error' : undefined}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={(e) => {
                  setCustomInput(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                onKeyDown={handleKeyDown}
                className="w-16 px-2 py-1 min-h-[36px] text-xs text-center font-semibold bg-white dark:bg-[#18191d] rounded border border-[#e7e4de] dark:border-[#2f323c] text-stone-900 dark:text-white outline-none focus:ring-1 focus:ring-stone-400"
              />
              <span className="text-xs font-semibold text-stone-400 mx-1">%</span>
            </div>

            <button
              type="button"
              onClick={handleApplyCustom}
              aria-label="Apply custom attendance target"
              className="px-2.5 py-1 min-h-[36px] rounded text-xs font-semibold bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:opacity-90 transition-opacity"
            >
              Set
            </button>
          </div>
        </div>
      </div>

      {/* Validation Feedback Message */}
      {errorMessage && (
        <div
          id="custom-target-error"
          role="alert"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-50 dark:bg-[#2c1618] border border-rose-200 dark:border-[#441f23] text-rose-700 dark:text-rose-400 text-xs"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
