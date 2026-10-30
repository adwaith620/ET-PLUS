'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  EtlabAssessmentRecord,
  SemesterResult,
  AcademicStanding,
  AcademicSourceHealth,
} from '@/types';
import { recordMatchesCategory } from '@/lib/course-catalog';
export { recordMatchesCategory };
import {
  FileText,
  FileCheck2,
  Calculator,
  FlaskConical,
  ExternalLink,
  Eye,
  X,
  AlertCircle,
  RefreshCw,
  Award,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface ResultsClientProps {
  assessmentRecords?: EtlabAssessmentRecord[];
  results?: SemesterResult[];
  academicStanding?: AcademicStanding;
  sourceHealth?: AcademicSourceHealth;
  resultsError?: string;
  mode?: 'live' | 'demo';
  lastSynced?: string;
}

const SEMESTERS = ['IIIrd Semester', 'IInd Semester', 'Ist Semester'] as const;
type SemesterOption = typeof SEMESTERS[number];

const RESULTS_CATEGORIES: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'Series Exam 1', label: 'Series Exam 1', icon: FileText },
  { id: 'Series Exam 2', label: 'Series Exam 2', icon: FileText },
  { id: 'Internal Marks', label: 'Internal Marks', icon: Calculator },
  { id: 'Assignments', label: 'Assignment Results', icon: FileCheck2 },
  { id: 'Lab', label: 'Lab Results', icon: FlaskConical },
];

export function ResultsClient({
  assessmentRecords = [],
  academicStanding,
  sourceHealth,
  resultsError,
  lastSynced = 'Just now',
}: ResultsClientProps) {
  const router = useRouter();
  const [syncedRecords, setSyncedRecords] = useState<EtlabAssessmentRecord[] | null>(null);
  const [syncedStanding, setSyncedStanding] = useState<AcademicStanding | undefined | null>(null);
  const [syncedHealth, setSyncedHealth] = useState<AcademicSourceHealth | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncTime, setSyncTime] = useState<string>(lastSynced);

  const records = syncedRecords ?? assessmentRecords;
  const currentStanding = syncedStanding !== null ? syncedStanding : academicStanding;
  const currentHealth = syncedHealth ?? sourceHealth;
  const syncError = clientError !== null ? (clientError || undefined) : resultsError;

  const [selectedSem, setSelectedSem] = useState<SemesterOption>('IIIrd Semester');
  const [selectedCategory, setSelectedCategory] = useState<string>('Series Exam 1');
  const [selectedRecord, setSelectedRecord] = useState<EtlabAssessmentRecord | null>(null);

  const handleSelectSemester = async (sem: SemesterOption) => {
    setSelectedSem(sem);
    const semNum = sem === 'IIIrd Semester' ? 3 : sem === 'IInd Semester' ? 2 : 1;
    const hasRecords = records.some((r) => r.semester === sem);

    if (!hasRecords && !isSyncing) {
      setIsSyncing(true);
      try {
        const res = await fetch(`/api/results?sem=${semNum}`);
        const data = await res.json();
        if (data.records && data.records.length > 0) {
          setSyncedRecords((prev) => {
            const current = prev ?? assessmentRecords;
            const filteredOther = current.filter((r) => r.semester !== sem);
            return [...filteredOther, ...data.records];
          });
        }
      } catch {
        // Fallback gracefully
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setClientError(null);

    try {
      const semNum = selectedSem === 'IIIrd Semester' ? 3 : selectedSem === 'IInd Semester' ? 2 : 1;
      const res = await fetch(`/api/results?refresh=true&sem=${semNum}`);
      const data = await res.json();
      if (data.records) {
        setSyncedRecords(data.records);
      }
      if (data.academicStanding !== undefined) {
        setSyncedStanding(data.academicStanding);
      }
      if (data.sourceHealth) {
        setSyncedHealth(data.sourceHealth);
      }
      if (data.lastSynced) {
        setSyncTime(data.lastSynced);
      }
      if (data.resultsError) {
        setClientError(data.resultsError);
      } else {
        setClientError('');
      }
      router.refresh();
    } catch {
      setClientError('Unable to connect to ETLAB. Please check your network and try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter records by selected semester and category, with deterministic deduplication safety
  const filteredRecords = React.useMemo(() => {
    const matching = records.filter(
      (rec) => rec.semester === selectedSem && recordMatchesCategory(rec, selectedCategory)
    );

    const seen = new Set<string>();
    const deduped: EtlabAssessmentRecord[] = [];
    for (const rec of matching) {
      const key = `${(rec.subjectCode || '').trim().toUpperCase()}::${(rec.examName || '').trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(rec);
      }
    }
    return deduped;
  }, [records, selectedSem, selectedCategory]);

  const selectedCategoryObj = RESULTS_CATEGORIES.find((c) => c.id === selectedCategory);
  const selectedCategoryLabel = selectedCategoryObj ? selectedCategoryObj.label : selectedCategory;

  return (
    <div className="space-y-6">
      {/* 1. Breadcrumb navigation: Home > Results */}
      <nav className="flex items-center gap-2 text-xs text-[#78716c] dark:text-[#9ca3af]">
        <Link
          href="/dashboard"
          className="hover:text-[#1c1917] dark:hover:text-[#f3f4f6] transition-colors"
        >
          Home
        </Link>
        <span>&gt;</span>
        <span className="text-[#1c1917] dark:text-[#f3f4f6] font-medium">Results</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6]">
              Results & Academic Performance
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#f4f1eb] dark:bg-[#202227] text-stone-600 dark:text-stone-400 border border-[#e7e4de] dark:border-[#2a2d35]">
              Synced {syncTime}
            </span>
          </div>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af]">
            Consolidated from TKMCE ETLAB Classic and Students ETLAB API (official KTU SGPA/CGPA, series evaluations, lab evaluations, and internal marks)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            title="Synchronize examination results with ETLAB portals"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] hover:bg-[#f9f8f5] dark:hover:bg-[#202227] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync ETLAB'}</span>
          </button>

          <div className="flex items-center gap-1">
            <a
              href="https://tkmce.etlab.in/student/results"
              target="_blank"
              rel="noopener noreferrer"
              title="Open Classic ETLAB Portal"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] transition-colors shadow-xs"
            >
              <span>ETLAB Classic</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://students.etlab.app"
              target="_blank"
              rel="noopener noreferrer"
              title="Open Students ETLAB Portal"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-[#242730] dark:hover:bg-[#2e323e] dark:text-stone-200 border border-[#e7e4de] dark:border-[#2a2d35] transition-colors"
            >
              <span>Students App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Multi-Source Health Indicator */}
      <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#181a1f] border border-[#e7e4de] dark:border-[#2a2d35] flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold text-stone-900 dark:text-stone-100">
            Multi-Source Integration Active:
          </span>
          <span className="text-stone-600 dark:text-stone-400">
            Institution: <strong className="text-stone-800 dark:text-stone-200">TKMCE (tkmce)</strong>
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Classic ETLAB (tkmce.etlab.in)</span>
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Students ETLAB (students.etlab.app)</span>
          </span>
          {currentHealth?.primarySource && (
            <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              mode: {currentHealth.primarySource}
            </span>
          )}
        </div>
      </div>

      {/* Academic Standing Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#9ca3af]">
            <span className="font-medium">Cumulative GPA (CGPA)</span>
            <Award className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            {currentStanding?.cgpa !== undefined && currentStanding.cgpa > 0
              ? currentStanding.cgpa.toFixed(2)
              : '--'}
          </div>
          <p className="text-[11px] text-[#78716c] dark:text-[#9ca3af]">
            {currentStanding?.cgpa
              ? 'Official KTU Cumulative Score'
              : 'Awaiting KTU Publication'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#9ca3af]">
            <span className="font-medium">Semester GPA (SGPA)</span>
            <Calculator className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            {currentStanding?.sgpa !== undefined && currentStanding.sgpa > 0
              ? currentStanding.sgpa.toFixed(2)
              : '--'}
          </div>
          <p className="text-[11px] text-[#78716c] dark:text-[#9ca3af]">
            {currentStanding?.semester
              ? `Semester ${currentStanding.semester} Standing`
              : 'Latest Semester Score'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#9ca3af]">
            <span className="font-medium">Earned Credits</span>
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            {currentStanding?.creditsEarned !== undefined && currentStanding.creditsEarned > 0
              ? `${currentStanding.creditsEarned} / ${currentStanding.totalCredits || currentStanding.creditsEarned}`
              : '--'}
          </div>
          <p className="text-[11px] text-[#78716c] dark:text-[#9ca3af]">
            Academic Degree Progress
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#9ca3af]">
            <span className="font-medium">Academic Status</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 truncate">
            {currentStanding?.status || 'In Good Standing'}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {currentStanding?.totalPassed !== undefined
              ? `${currentStanding.totalPassed} Passed${currentStanding.totalFailed ? ` · ${currentStanding.totalFailed} Failed` : ''}`
              : 'Active Regular Registration'}
          </p>
        </div>
      </div>

      {/* Synchronization Error or Status Alert */}
      {syncError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold text-amber-950 dark:text-amber-200">
                {syncError.toLowerCase().includes('expired') ? 'ETLAB Session Timed Out' : 'Synchronization Notice'}
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                {syncError.toLowerCase().includes('expired')
                  ? 'Your upstream ETLAB portal session has timed out. Please sign in again with your credentials to refresh your official examination records.'
                  : syncError}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {!syncError.toLowerCase().includes('expired') && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-black transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Retry Sync</span>
              </button>
            )}
            {syncError.toLowerCase().includes('expired') && (
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-black transition-colors shrink-0"
              >
                Sign In Again
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 2. Centered Semester Selector */}
      <div className="flex justify-center items-center py-1">
        <div className="inline-flex items-center bg-[#f4f1eb] dark:bg-[#202227] p-1 rounded-xl border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs">
          {SEMESTERS.map((sem) => (
            <button
              key={sem}
              onClick={() => handleSelectSemester(sem)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedSem === sem
                  ? 'bg-white dark:bg-[#1b1d22] text-[#1c1917] dark:text-[#f3f4f6] shadow-xs'
                  : 'text-[#78716c] dark:text-[#9ca3af] hover:text-[#1c1917] dark:hover:text-[#f3f4f6]'
              }`}
            >
              {sem}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Five Simplified Category Tabs with Responsive Wrapping */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs">
        {RESULTS_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 min-h-[38px] rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#1c1917] text-white dark:bg-[#f3f4f6] dark:text-[#141518] shadow-xs'
                  : 'text-[#78716c] dark:text-[#9ca3af] hover:bg-[#f4f1eb] dark:hover:bg-[#202227]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Total count indicator */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[#78716c] dark:text-[#9ca3af]">
          {isSyncing ? (
            <span className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
              <RefreshCw className="w-3 h-3 animate-spin text-stone-500" />
              <span>Connecting and synchronizing with ETLAB sources...</span>
            </span>
          ) : syncError ? (
            <span>Synchronization paused.</span>
          ) : (
            <>
              Total <strong className="text-[#1c1917] dark:text-[#f3f4f6]">{filteredRecords.length}</strong> results in {selectedCategoryLabel}.
            </>
          )}
        </p>
      </div>

      {/* 5. Simplified Results Table (Subject | Examination | Marks | Status) */}
      <div
        className="overflow-x-auto rounded-xl border border-[#e7e4de] dark:border-[#2a2d35] bg-white dark:bg-[#1b1d22] shadow-xs focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-hidden"
        tabIndex={0}
        role="region"
        aria-label="Student examination evaluation records"
      >
        <table className="w-full text-xs text-left border-collapse min-w-[550px]">
          <thead>
            <tr className="bg-[#f9f8f5] dark:bg-[#181a1f] border-b border-[#e7e4de] dark:border-[#2a2d35]">
              <th className="p-3.5 font-semibold text-[#78716c] dark:text-[#9ca3af] uppercase tracking-wider text-[11px]">
                SUBJECT
              </th>
              <th className="p-3.5 font-semibold text-[#78716c] dark:text-[#9ca3af] uppercase tracking-wider text-[11px] whitespace-nowrap">
                EXAMINATION
              </th>
              <th className="p-3.5 font-semibold text-[#78716c] dark:text-[#9ca3af] uppercase tracking-wider text-right text-[11px] whitespace-nowrap">
                MARKS
              </th>
              <th className="p-3.5 font-semibold text-[#78716c] dark:text-[#9ca3af] uppercase tracking-wider text-center text-[11px] whitespace-nowrap">
                STATUS
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#efece6] dark:divide-[#262831]">
            {isSyncing ? (
              <tr>
                <td colSpan={4} className="p-12 sm:p-16 text-center text-xs text-[#78716c] dark:text-[#9ca3af]">
                  <div className="flex flex-col items-center justify-center space-y-3 py-4">
                    <div className="relative w-10 h-10" role="status" aria-label="Connecting to ETLAB">
                      <div className="w-10 h-10 rounded-full border-2 border-stone-200 dark:border-stone-800" />
                      <div className="w-10 h-10 rounded-full border-2 border-stone-800 dark:border-stone-200 border-t-transparent animate-spin absolute inset-0" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                        Connecting to ETLAB...
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Synchronizing examination records, internal assessments, and official university results...
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-12 text-center text-xs text-[#78716c] dark:text-[#9ca3af]">
                  <div className="space-y-2 max-w-md mx-auto">
                    <p className="font-semibold text-[#1c1917] dark:text-[#f3f4f6] text-sm">
                      No records available
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      No evaluation records available for {selectedCategoryLabel} in {selectedSem}. Evaluations will appear here once published by the academic department.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>Sync with ETLAB</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => {
                const hasScore = rec.obtainedMarks !== undefined && rec.obtainedMarks !== null && !isNaN(rec.obtainedMarks);
                const percentage =
                  rec.maxMarks > 0 && hasScore ? (rec.obtainedMarks! / rec.maxMarks) * 100 : 0;
                const isPassing = percentage >= 40;

                return (
                  <tr
                    key={rec.id}
                    className="hover:bg-[#fbfaf8] dark:hover:bg-[#202228] transition-colors"
                  >
                    {/* 1. SUBJECT */}
                    <td className="p-3.5">
                      <div className="font-semibold text-stone-900 dark:text-stone-100">
                        {rec.subjectName}
                      </div>
                      <div className="font-mono text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                        {rec.subjectCode}
                      </div>
                    </td>

                    {/* 2. EXAMINATION */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-medium text-stone-800 dark:text-stone-200">
                        {rec.examName}
                      </span>
                    </td>

                    {/* 3. MARKS: obtained/maximum */}
                    <td className="p-3.5 text-right font-mono font-bold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                      {hasScore ? (
                        rec.maxMarks > 0 ? (
                          <span>
                            {rec.obtainedMarks} <span className="font-normal text-stone-400 dark:text-stone-500 text-xs">/ {rec.maxMarks}</span>
                          </span>
                        ) : (
                          rec.obtainedMarks
                        )
                      ) : (
                        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          Awaiting marks
                        </span>
                      )}
                    </td>

                    {/* 4. STATUS */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {hasScore ? (
                          <>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                isPassing
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
                                  : 'bg-red-50 text-red-700 border-red-200/80 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/60'
                              }`}
                            >
                              Published
                            </span>
                            {percentage > 0 && (
                              <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400 hidden sm:inline">
                                {percentage.toFixed(0)}%
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                            Awaiting marks
                          </span>
                        )}

                        {rec.viewResponseUrl && (
                          <button
                            onClick={() => setSelectedRecord(rec)}
                            aria-label={`View answer sheet for ${rec.subjectCode}`}
                            className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                            title="View official answer sheet"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Answer Sheet Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1b1d22] rounded-xl border border-[#e7e4de] dark:border-[#2a2d35] shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-[#e7e4de] dark:border-[#2a2d35]">
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                  {selectedRecord.examName} — Evaluation Details
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {selectedRecord.subjectName} ({selectedRecord.subjectCode})
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-500">Source:</span>
                <span className="font-medium text-stone-900 dark:text-stone-100">
                  {selectedRecord.source === 'students_etlab' || selectedRecord.source === 'students-etlab'
                    ? 'Students API'
                    : 'Classic ETLAB'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Maximum Marks:</span>
                <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                  {selectedRecord.maxMarks > 0 ? selectedRecord.maxMarks : 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Obtained Score:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedRecord.obtainedMarks !== undefined && selectedRecord.obtainedMarks !== null
                    ? `${selectedRecord.obtainedMarks} / ${selectedRecord.maxMarks || '--'}`
                    : 'Awaiting marks'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Evaluation Category:</span>
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  {selectedRecord.category}
                </span>
              </div>
              {selectedRecord.deadline && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Deadline:</span>
                  <span className="text-stone-700 dark:text-stone-300">
                    {selectedRecord.deadline}
                  </span>
                </div>
              )}
              {selectedRecord.feedback && (
                <div className="pt-2 border-t border-[#e7e4de] dark:border-[#2a2d35]">
                  <span className="text-stone-500 block mb-1">Feedback:</span>
                  <p className="text-stone-700 dark:text-stone-300 bg-white dark:bg-[#1b1d22] p-2 rounded border border-[#e7e4de] dark:border-[#2a2d35]">
                    {selectedRecord.feedback}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200"
              >
                Close
              </button>
              {selectedRecord.viewResponseUrl && (
                <a
                  href={selectedRecord.viewResponseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:opacity-90 inline-flex items-center gap-1.5"
                >
                  <span>Open in ETLAB</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
