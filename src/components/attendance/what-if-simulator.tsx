'use client';

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Minus,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Info,
  Search,
  ShieldCheck,
  AlertTriangle,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { SubjectAttendance } from '@/types';
import {
  calculatePercentage,
  calculateSafeBunks,
  calculateClassesToRecover,
  getAttendanceStatus,
} from '@/lib/attendance-calculator';
import { getCourseFullName } from '@/lib/course-catalog';

interface WhatIfSimulatorProps {
  subjects: SubjectAttendance[];
  totalAttended: number;
  totalConducted: number;
  targetPercentage: number;
}

interface SubjectAdjustment {
  attend: number;
  miss: number;
}

export function WhatIfSimulator({
  subjects,
  totalAttended,
  totalConducted,
  targetPercentage,
}: WhatIfSimulatorProps) {
  // Store adjustments per subject code
  const [adjustments, setAdjustments] = useState<Record<string, SubjectAdjustment>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'modified' | 'shortage'>('all');

  // Baseline overall calculations
  const baselineOverallPercentage = calculatePercentage(totalAttended, totalConducted);
  const baselineSafeBunks = calculateSafeBunks(totalAttended, totalConducted, targetPercentage);
  const baselineRecover = calculateClassesToRecover(totalAttended, totalConducted, targetPercentage);
  const baselineStatus = getAttendanceStatus(baselineOverallPercentage, targetPercentage);

  // Compute projections
  const {
    projectedOverallAttended,
    projectedOverallConducted,
    projectedOverallPercentage,
    overallDelta,
    projectedSafeBunks,
    projectedRecover,
    projectedStatus,
    activeModificationsCount,
    perSubjectCalculations,
  } = useMemo(() => {
    let projAtt = totalAttended;
    let projCond = totalConducted;
    let modCount = 0;

    const calculations = subjects.map((sub) => {
      const adj = adjustments[sub.code] || { attend: 0, miss: 0 };
      if (adj.attend > 0 || adj.miss > 0) {
        modCount += 1;
      }

      projAtt += adj.attend;
      projCond += adj.attend + adj.miss;

      const subBasePct = sub.percentage;
      const subProjAtt = sub.attendedHours + adj.attend;
      const subProjTotal = sub.totalHours + adj.attend + adj.miss;
      const subProjPct = calculatePercentage(subProjAtt, subProjTotal);
      const subDelta = Number((subProjPct - subBasePct).toFixed(2));
      const subProjSafeBunks = calculateSafeBunks(subProjAtt, subProjTotal, targetPercentage);
      const subProjRecover = calculateClassesToRecover(subProjAtt, subProjTotal, targetPercentage);
      const subProjStatus = getAttendanceStatus(subProjPct, targetPercentage);

      return {
        subject: sub,
        adj,
        subProjAtt,
        subProjTotal,
        subProjPct,
        subDelta,
        subProjSafeBunks,
        subProjRecover,
        subProjStatus,
        isModified: adj.attend > 0 || adj.miss > 0,
      };
    });

    const projPct = calculatePercentage(projAtt, projCond);
    const delta = Number((projPct - baselineOverallPercentage).toFixed(2));
    const safeB = calculateSafeBunks(projAtt, projCond, targetPercentage);
    const rec = calculateClassesToRecover(projAtt, projCond, targetPercentage);
    const status = getAttendanceStatus(projPct, targetPercentage);

    return {
      projectedOverallAttended: projAtt,
      projectedOverallConducted: projCond,
      projectedOverallPercentage: projPct,
      overallDelta: delta,
      projectedSafeBunks: safeB,
      projectedRecover: rec,
      projectedStatus: status,
      activeModificationsCount: modCount,
      perSubjectCalculations: calculations,
    };
  }, [subjects, adjustments, totalAttended, totalConducted, targetPercentage, baselineOverallPercentage]);

  // Adjusters
  const updateAdjustment = (code: string, deltaAttend: number, deltaMiss: number) => {
    setAdjustments((prev) => {
      const current = prev[code] || { attend: 0, miss: 0 };
      const nextAttend = Math.max(0, current.attend + deltaAttend);
      const nextMiss = Math.max(0, current.miss + deltaMiss);

      if (nextAttend === 0 && nextMiss === 0) {
        const copy = { ...prev };
        delete copy[code];
        return copy;
      }

      return {
        ...prev,
        [code]: { attend: nextAttend, miss: nextMiss },
      };
    });
  };

  const resetSubject = (code: string) => {
    setAdjustments((prev) => {
      const copy = { ...prev };
      delete copy[code];
      return copy;
    });
  };

  const handleResetAll = () => {
    setAdjustments({});
  };

  const applyGlobalPreset = (attendEach: number, missEach: number) => {
    const next: Record<string, SubjectAdjustment> = {};
    subjects.forEach((sub) => {
      next[sub.code] = { attend: attendEach, miss: missEach };
    });
    setAdjustments(next);
  };

  // Filtered course calculations for display
  const displayedCalculations = perSubjectCalculations.filter((item) => {
    const fullName = getCourseFullName(item.subject.code, item.subject.name).toLowerCase();
    const code = item.subject.code.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || code.includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterMode === 'modified') return item.isModified;
    if (filterMode === 'shortage') return item.subProjPct < targetPercentage;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Simulation Banner Notice */}
      <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 text-xs">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div>
          <span className="font-semibold uppercase tracking-wider text-[11px] block">
            Hypothetical Forecast Sandbox
          </span>
          <p className="mt-0.5 text-amber-800 dark:text-amber-300">
            Model concurrent multi-subject attendances and absences. All projections shown here are simulations for your planning and do not alter official ETLAB records.
          </p>
        </div>
      </div>

      {/* Combined Overall Projection Card */}
      <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#f4f1eb] dark:bg-[#22252c] text-stone-800 dark:text-stone-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                  Combined Overall Attendance Forecast
                </h3>
                {activeModificationsCount > 0 ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60">
                    {activeModificationsCount} subject{activeModificationsCount > 1 ? 's' : ''} modified
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                    Baseline Active
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Target threshold: <strong className="text-stone-700 dark:text-stone-200">{targetPercentage}%</strong> (KTU mandatory minimum: 75%)
              </p>
            </div>
          </div>

          {activeModificationsCount > 0 && (
            <button
              onClick={handleResetAll}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#f4f1eb] dark:bg-[#252830] text-stone-700 dark:text-stone-200 hover:bg-[#eae6df] dark:hover:bg-[#2d3039] border border-[#e7e4de] dark:border-[#2c2f37] flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Scenarios</span>
            </button>
          )}
        </div>

        {/* 2-Column Baseline vs Projected Overall Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Baseline Card */}
          <div className="p-4 rounded-lg bg-[#f9f8f5] dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#272a31] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Current Official Baseline
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                    baselineStatus === 'safe'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-[#14281c] dark:text-emerald-400 dark:border-[#1e3d29]'
                      : baselineStatus === 'warning'
                      ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-[#2b2210] dark:text-amber-400 dark:border-[#423519]'
                      : 'bg-red-50 text-red-800 border-red-200 dark:bg-[#2c1618] dark:text-red-400 dark:border-[#441f23]'
                  }`}
                >
                  {baselineStatus === 'safe' ? 'Eligible' : baselineStatus === 'warning' ? 'Warning' : 'Shortage'}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
                    {baselineOverallPercentage}%
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-400 block font-mono mt-0.5">
                    {totalAttended} / {totalConducted} hours conducted
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#e7e4de] dark:border-[#2a2d35] text-xs">
              {baselineStatus === 'safe' ? (
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Can safely bunk <strong>{baselineSafeBunks}</strong> overall class{baselineSafeBunks !== 1 ? 'es' : ''}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Must attend next <strong>{baselineRecover}</strong> consecutive class{baselineRecover !== 1 ? 'es' : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Projected Card */}
          <div className="p-4 rounded-lg bg-white dark:bg-[#202227] border-2 border-dashed border-stone-300 dark:border-stone-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Combined Projection
                </span>
                {overallDelta !== 0 && (
                  <span
                    className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border ${
                      overallDelta > 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-[#14281c] dark:text-emerald-400 dark:border-[#1e3d29]'
                        : 'bg-red-50 text-red-800 border-red-200 dark:bg-[#2c1618] dark:text-red-400 dark:border-[#441f23]'
                    }`}
                  >
                    {overallDelta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {overallDelta > 0 ? `+${overallDelta}%` : `${overallDelta}%`}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span
                    className={`text-3xl font-extrabold tracking-tight ${
                      projectedOverallPercentage >= targetPercentage
                        ? 'text-stone-900 dark:text-stone-100'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {projectedOverallPercentage}%
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-400 block font-mono mt-0.5">
                    {projectedOverallAttended} / {projectedOverallConducted} projected hours
                  </span>
                </div>

                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                    projectedStatus === 'safe'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-[#14281c] dark:text-emerald-400 dark:border-[#1e3d29]'
                      : projectedStatus === 'warning'
                      ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-[#2b2210] dark:text-amber-400 dark:border-[#423519]'
                      : 'bg-red-50 text-red-800 border-red-200 dark:bg-[#2c1618] dark:text-red-400 dark:border-[#441f23]'
                  }`}
                >
                  {projectedStatus === 'safe' ? 'Eligible' : projectedStatus === 'warning' ? 'Warning' : 'Shortage'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#e7e4de] dark:border-[#2a2d35] text-xs">
              {projectedStatus === 'safe' ? (
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Projected safe bunks: <strong>{projectedSafeBunks}</strong> class{projectedSafeBunks !== 1 ? 'es' : ''}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Projected recovery needed: <strong>{projectedRecover}</strong> class{projectedRecover !== 1 ? 'es' : ''}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Global Preset Shortcuts */}
        <div className="pt-2 border-t border-[#e7e4de] dark:border-[#2a2d35]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Multi-Subject Batch Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => applyGlobalPreset(1, 0)}
                className="px-2.5 py-1 text-xs rounded bg-[#f4f1eb] dark:bg-[#252830] text-stone-700 dark:text-stone-300 hover:bg-[#eae6df] border border-[#e7e4de] dark:border-[#2c2f37] transition-colors"
              >
                +1 attend in every course
              </button>
              <button
                onClick={() => applyGlobalPreset(3, 0)}
                className="px-2.5 py-1 text-xs rounded bg-[#f4f1eb] dark:bg-[#252830] text-stone-700 dark:text-stone-300 hover:bg-[#eae6df] border border-[#e7e4de] dark:border-[#2c2f37] transition-colors"
              >
                +3 attend in every course
              </button>
              <button
                onClick={() => applyGlobalPreset(0, 1)}
                className="px-2.5 py-1 text-xs rounded bg-[#f4f1eb] dark:bg-[#252830] text-stone-700 dark:text-stone-300 hover:bg-[#eae6df] border border-[#e7e4de] dark:border-[#2c2f37] transition-colors"
              >
                -1 miss in every course
              </button>
              <button
                onClick={() => applyGlobalPreset(0, 2)}
                className="px-2.5 py-1 text-xs rounded bg-[#f4f1eb] dark:bg-[#252830] text-stone-700 dark:text-stone-300 hover:bg-[#eae6df] border border-[#e7e4de] dark:border-[#2c2f37] transition-colors"
              >
                -2 miss in every course
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Course Scenario Builder Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Filter courses to simulate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-stone-900 dark:text-white placeholder:text-stone-400 outline-none focus:ring-1 focus:ring-stone-400"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#f7f6f3] dark:bg-[#202227] p-1 rounded-md border border-[#e7e4de] dark:border-[#2a2d35] self-start sm:self-auto">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filterMode === 'all'
                ? 'bg-white dark:bg-[#18191d] text-stone-900 dark:text-white font-semibold shadow-xs border border-[#e7e4de] dark:border-[#2f323c]'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            All Courses ({subjects.length})
          </button>
          <button
            onClick={() => setFilterMode('modified')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filterMode === 'modified'
                ? 'bg-white dark:bg-[#18191d] text-violet-700 dark:text-violet-300 font-semibold shadow-xs border border-[#e7e4de] dark:border-[#2f323c]'
                : 'text-stone-500 dark:text-stone-400 hover:text-violet-700'
            }`}
          >
            Modified ({activeModificationsCount})
          </button>
          <button
            onClick={() => setFilterMode('shortage')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filterMode === 'shortage'
                ? 'bg-white dark:bg-[#18191d] text-amber-700 dark:text-amber-300 font-semibold shadow-xs border border-[#e7e4de] dark:border-[#2f323c]'
                : 'text-stone-500 dark:text-stone-400 hover:text-amber-700'
            }`}
          >
            Projected Below Target
          </button>
        </div>
      </div>

      {/* Per-Subject Simulator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedCalculations.map((item) => {
          const { subject, adj, subProjAtt, subProjTotal, subProjPct, subDelta, subProjSafeBunks, subProjRecover, subProjStatus, isModified } = item;
          const fullName = getCourseFullName(subject.code, subject.name);

          return (
            <div
              key={subject.code}
              className={`p-4 sm:p-5 rounded-lg border transition-all ${
                isModified
                  ? 'bg-white dark:bg-[#1d1f25] border-violet-300 dark:border-violet-800/80 shadow-xs ring-1 ring-violet-200/50 dark:ring-violet-900/40'
                  : 'bg-white dark:bg-[#1b1d22] border-[#e7e4de] dark:border-[#2a2d35]'
              }`}
            >
              {/* Header: Full Course Name + Code */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 leading-snug tracking-tight">
                    {fullName}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[#f4f1eb] dark:bg-[#22252c] text-stone-700 dark:text-stone-300 border border-[#e7e4de] dark:border-[#2c2f37]">
                      {subject.code}
                    </span>
                    {subject.category && (
                      <span className="text-[10px] text-stone-400 uppercase font-medium">
                        {subject.category}
                      </span>
                    )}
                    {isModified && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                        Modified
                      </span>
                    )}
                  </div>
                </div>

                {/* Percentage & Delta */}
                <div className="text-right shrink-0">
                  <div className="flex items-baseline justify-end gap-1.5">
                    <span
                      className={`text-xl sm:text-2xl font-bold tracking-tight ${
                        subProjPct >= targetPercentage
                          ? 'text-stone-900 dark:text-stone-100'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {subProjPct}%
                    </span>
                  </div>
                  {subDelta !== 0 && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 border ${
                        subDelta > 0
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-[#14281c] dark:text-emerald-400 dark:border-[#1e3d29]'
                          : 'bg-red-50 text-red-800 border-red-200 dark:bg-[#2c1618] dark:text-red-400 dark:border-[#441f23]'
                      }`}
                    >
                      {subDelta > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {subDelta > 0 ? `+${subDelta}%` : `${subDelta}%`}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress & Baseline vs Projected stats */}
              <div className="mt-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                  <span>
                    Baseline: <strong className="font-mono">{subject.attendedHours}/{subject.totalHours}</strong> ({subject.percentage}%)
                  </span>
                  <span>
                    Projected: <strong className="font-mono text-stone-800 dark:text-stone-200">{subProjAtt}/{subProjTotal}</strong> hrs
                  </span>
                </div>
                <div className="w-full bg-[#efece6] dark:bg-[#272a31] h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      subProjPct >= targetPercentage
                        ? 'bg-emerald-600 dark:bg-emerald-500'
                        : subProjPct >= targetPercentage - 5
                        ? 'bg-amber-600 dark:bg-amber-500'
                        : 'bg-red-600 dark:bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, subProjPct)}%` }}
                  />
                </div>
              </div>

              {/* Independent Steppers */}
              <div className="mt-4 pt-3 border-t border-[#e7e4de] dark:border-[#2a2d35] grid grid-cols-2 gap-2">
                {/* Attend Stepper */}
                <div className="p-2 rounded bg-[#f9f8f5] dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#272a31] flex items-center justify-between">
                  <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300">
                    Attend (+n)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateAdjustment(subject.code, -1, 0)}
                      disabled={adj.attend <= 0}
                      className="w-6 h-6 rounded bg-white dark:bg-[#22252c] border border-[#e7e4de] dark:border-[#2c2f37] flex items-center justify-center text-stone-700 dark:text-stone-300 hover:bg-[#f4f1eb] disabled:opacity-40"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs font-mono text-stone-900 dark:text-white">
                      {adj.attend}
                    </span>
                    <button
                      onClick={() => updateAdjustment(subject.code, 1, 0)}
                      className="w-6 h-6 rounded bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 flex items-center justify-center hover:opacity-90"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Miss Stepper */}
                <div className="p-2 rounded bg-[#f9f8f5] dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#272a31] flex items-center justify-between">
                  <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300">
                    Miss (-m)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateAdjustment(subject.code, 0, -1)}
                      disabled={adj.miss <= 0}
                      className="w-6 h-6 rounded bg-white dark:bg-[#22252c] border border-[#e7e4de] dark:border-[#2c2f37] flex items-center justify-center text-stone-700 dark:text-stone-300 hover:bg-[#f4f1eb] disabled:opacity-40"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs font-mono text-stone-900 dark:text-white">
                      {adj.miss}
                    </span>
                    <button
                      onClick={() => updateAdjustment(subject.code, 0, 1)}
                      className="w-6 h-6 rounded bg-red-700 dark:bg-red-500 text-white flex items-center justify-center hover:opacity-90"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Status footer with safe bunks or recovery */}
              <div className="mt-3 pt-2.5 border-t border-[#efece6] dark:border-[#26282f] flex items-center justify-between text-xs">
                {subProjStatus === 'safe' ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Safe bunks: <strong>{subProjSafeBunks}</strong></span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Must attend next <strong>{subProjRecover}</strong></span>
                  </div>
                )}

                {isModified && (
                  <button
                    onClick={() => resetSubject(subject.code)}
                    className="text-[11px] text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
