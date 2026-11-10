'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  EtlabAssessmentRecord,
  SemesterResult,
  AcademicStanding,
  AcademicSourceHealth,
  StudentProfile,
} from '@/types';
import { recordMatchesCategory, isLabCourse, stripLabSuffix, getCourseFullName, SEMESTER_3_COURSES } from '@/lib/course-catalog';
import {
  OFFICIAL_GRADES_TABLE,
  ORDERED_GRADES,
  EVALUATION_CONFIGS,
  EvaluationType,
  EvaluationConfig,
  GradeLetter,
  detectEvaluationType,
  checkPassingConditions,
  determineGrade,
  calculateTargetEse,
  stepGrade,
  calculateSummary,
  CalculatorSubject,
  TargetGradePrediction,
  isMinorOrRemedial,
} from '@/lib/credit-calculator';
import {
  Calculator,
  RefreshCw,
  Award,
  AlertCircle,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  BookOpen,
  Info,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';

/**
 * Permanent starry effect for S grade badges.
 * Displays tiny purple and light-violet stars with gentle twinkling and subtle sparkles.
 * Stays continuously visible for as long as a subject has an S grade.
 * Respects prefers-reduced-motion by remaining visible but completely static.
 */
function PermanentSGradeStars() {
  const stars = [
    { id: 1, top: '-6px', left: '-7px', size: 9, delay: '0s', duration: '2.4s', anim: 'animate-s-star-twinkle-a', color: '#c084fc' },
    { id: 2, top: '-7px', right: '-6px', size: 8, delay: '0.6s', duration: '2.8s', anim: 'animate-s-star-twinkle-b', color: '#e9d5ff' },
    { id: 3, bottom: '-5px', left: '-5px', size: 7, delay: '1.2s', duration: '2.2s', anim: 'animate-s-star-twinkle-a', color: '#d8b4fe' },
    { id: 4, bottom: '-6px', right: '-7px', size: 9, delay: '0.4s', duration: '3.0s', anim: 'animate-s-star-twinkle-b', color: '#a855f7' },
    { id: 5, top: '-9px', left: '48%', size: 6, delay: '0.9s', duration: '2.5s', anim: 'animate-s-star-twinkle-a', color: '#f3e8ff' },
  ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-visible z-10"
    >
      {stars.map((s) => (
        <span
          key={s.id}
          className={`absolute block ${s.anim} pointer-events-none`}
          style={{
            top: s.top,
            bottom: s.bottom,
            left: s.left,
            right: s.right,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        >
          <svg
            width={s.size}
            height={s.size}
            viewBox="0 0 24 24"
            fill={s.color}
            className="drop-shadow-[0_0_5px_rgba(192,132,252,0.85)]"
          >
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        </span>
      ))}
    </div>
  );
}

interface CalculatorClientProps {
  assessmentRecords?: EtlabAssessmentRecord[];
  results?: SemesterResult[];
  academicStanding?: AcademicStanding;
  sourceHealth?: AcademicSourceHealth;
  resultsError?: string;
  mode?: 'live' | 'demo';
  lastSynced?: string;
  profile?: StudentProfile;
  currentSemester?: number;
}

export function CalculatorClient({
  assessmentRecords = [],
  results = [],
  academicStanding,
  sourceHealth,
  resultsError,
  mode = 'demo',
  lastSynced = 'Just now',
  profile,
  currentSemester = 3,
}: CalculatorClientProps) {
  const router = useRouter();

  // ETLAB Sync state
  const [syncedRecords, setSyncedRecords] = useState<EtlabAssessmentRecord[] | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncTime, setSyncTime] = useState<string>(lastSynced);

  const activeRecords = syncedRecords ?? assessmentRecords;

  // Manual ESE marks input per subject: Record<subjectId, number | undefined>
  // Strictly excludes MINOR/REMEDIAL courses
  const [manualEse, setManualEse] = useState<Record<string, number | undefined>>(() => {
    return {
      '24CSP304': 32, // Type 1: 52/60 + 32/40 = 84 -> A
      '24AIJ303': 34, // Type 1: 50/60 + 34/40 = 84 -> A
      '24AIP305': 48, // Type 2: 35/40 + 48/60 = 83 -> A
      '24MAP300': 46, // Type 2: 36/40 + 46/60 = 82 -> A
      '24EST382': 48, // Type 2: 34/40 + 48/60 = 82 -> A
      '24EST372': 45, // Type 2: 32/40 + 45/60 = 77 -> B+
    };
  });

  // Active target grades for interactive predictor: Record<subjectId, GradeLetter>
  const [targetGrades, setTargetGrades] = useState<Record<string, GradeLetter | undefined>>({});

  // Expandable grading reference accordion state
  const [showGradingReference, setShowGradingReference] = useState<boolean>(false);

  // Sync with ETLAB handler — reuses /api/results
  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setClientError(null);

    try {
      const res = await fetch(`/api/results?refresh=true&sem=${currentSemester}`);
      const data = await res.json();
      if (data.records) {
        setSyncedRecords(data.records);
      }
      if (data.lastSynced) {
        setSyncTime(data.lastSynced);
      }
      if (data.resultsError) {
        setClientError(data.resultsError);
      } else {
        setClientError(null);
      }
      router.refresh();
    } catch {
      setClientError('Unable to connect to ETLAB. Please check your network and try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Convert semester number to Roman numeral format matching ETLAB records
  const currentSemLabel = useMemo(() => {
    if (currentSemester === 1) return 'Ist Semester';
    if (currentSemester === 2) return 'IInd Semester';
    if (currentSemester === 3) return 'IIIrd Semester';
    if (currentSemester === 4) return 'IVth Semester';
    return `${currentSemester}th Semester`;
  }, [currentSemester]);

  // Extract internal marks records from Results -> Internal for current semester
  const internalRecords = useMemo(() => {
    return activeRecords.filter(
      (rec) => rec.semester === currentSemLabel && recordMatchesCategory(rec, 'Internal Marks')
    );
  }, [activeRecords, currentSemLabel]);

  // Build unified subjects list mapping current semester curriculum to Results -> Internal
  // Excludes MINOR / REMEDIAL courses completely from calculation & table
  const subjects: CalculatorSubject[] = useMemo(() => {
    // Collect all registered course codes for this semester
    const knownCourses = Object.values(SEMESTER_3_COURSES);

    // Track processed subject keys to prevent duplicate rows
    const seenKeys = new Set<string>();
    const list: CalculatorSubject[] = [];

    // 1. First add all matching internal records from Results -> Internal
    for (const rec of internalRecords) {
      const code = (rec.subjectCode || '').trim().toUpperCase();
      // Strictly exclude MINOR/REMEDIAL subjects from calculations and table
      if (isMinorOrRemedial(code, rec.subjectName)) continue;

      const isLab = rec.isLab === true || isLabCourse(rec.subjectCode, rec.subjectName);
      const rowKey = `${code}::${isLab ? 'practical' : 'theory'}`;

      if (seenKeys.has(rowKey)) continue;
      seenKeys.add(rowKey);

      const stripped = stripLabSuffix(code);
      const catalogCourse = SEMESTER_3_COURSES[stripped] || SEMESTER_3_COURSES[code];

      // Automatically determine evaluation type solely from CIA denominator (rec.maxMarks)
      const detection = detectEvaluationType(rec.maxMarks);
      const activeConfig = detection.config;
      const ciaObtained = typeof rec.obtainedMarks === 'number' && !isNaN(rec.obtainedMarks) ? rec.obtainedMarks : undefined;
      const hasPublishedCia = ciaObtained !== undefined;

      // Current manual ESE prediction
      const rawEse = manualEse[rowKey] !== undefined ? manualEse[rowKey] : manualEse[code];
      const eseInput = activeConfig.hasEse ? rawEse : undefined;

      // Passing check
      const passingCheck = checkPassingConditions(ciaObtained, eseInput, activeConfig);

      // Total marks calculation
      let totalMarks: number | undefined = undefined;
      if (hasPublishedCia) {
        if (!activeConfig.hasEse) {
          totalMarks = ciaObtained;
        } else if (typeof eseInput === 'number' && !isNaN(eseInput)) {
          totalMarks = ciaObtained + eseInput;
        }
      }

      // Predicted Grade from current total & passing conditions
      const currentGradeInfo = totalMarks !== undefined
        ? determineGrade(totalMarks, passingCheck.isPassing)
        : { grade: 'F' as GradeLetter, gradePoint: 0.0 };

      // Interactive target prediction if user selected an active target
      const activeTarget = targetGrades[rowKey];
      let targetPrediction: TargetGradePrediction | undefined = undefined;
      if (activeTarget) {
        targetPrediction = calculateTargetEse(activeTarget, ciaObtained, activeConfig);
      }

      list.push({
        id: rec.id || rowKey,
        subjectCode: rec.subjectCode,
        subjectName: rec.subjectName || getCourseFullName(code),
        credits: catalogCourse?.credits || (isLab ? 1 : 4),
        isLab,
        evaluationType: activeConfig.type,
        isEvaluationReliable: detection.isReliable,
        config: activeConfig,
        ciaObtained,
        ciaMax: activeConfig.ciaMax,
        eseInput,
        activeTargetGrade: activeTarget,
        targetPrediction,
        hasPublishedCia,
        totalMarks,
        grade: currentGradeInfo.grade,
        gradePoint: currentGradeInfo.gradePoint,
        isPassing: passingCheck.isPassing,
        passingReasons: passingCheck.reasons,
      });
    }

    // 2. Include any registered semester courses that don't have published internal records yet
    for (const course of knownCourses) {
      const code = course.code.trim().toUpperCase();
      // Strictly exclude MINOR/REMEDIAL subjects from calculations and table
      if (isMinorOrRemedial(code, course.name)) continue;

      const rowKey = `${code}::theory`;

      if (seenKeys.has(rowKey)) continue;
      seenKeys.add(rowKey);

      // No CIA internal marks published yet -> flagged as requiring verification
      const detection = detectEvaluationType(undefined);
      const activeConfig = detection.config;
      const rawEse = manualEse[rowKey] !== undefined ? manualEse[rowKey] : manualEse[code];
      const eseInput = activeConfig.hasEse ? rawEse : undefined;

      const passingCheck = checkPassingConditions(undefined, eseInput, activeConfig);

      list.push({
        id: rowKey,
        subjectCode: course.code,
        subjectName: course.name,
        credits: course.credits,
        isLab: course.category === 'Lab',
        evaluationType: activeConfig.type,
        isEvaluationReliable: detection.isReliable,
        config: activeConfig,
        ciaObtained: undefined,
        ciaMax: activeConfig.ciaMax,
        eseInput,
        activeTargetGrade: undefined,
        hasPublishedCia: false,
        totalMarks: undefined,
        grade: 'F',
        gradePoint: 0.0,
        isPassing: false,
        passingReasons: ['Internal marks (CIA) are awaiting publication.'],
      });
    }

    return list;
  }, [internalRecords, manualEse, targetGrades]);

  // Overall summary metrics — automatically excludes MINOR/REMEDIAL because it is omitted from subjects
  const summary = useMemo(() => calculateSummary(subjects), [subjects]);

  // Update manual ESE input
  const handleEseChange = (rowKey: string, value: string, eseMax: number) => {
    if (value.trim() === '') {
      setManualEse((prev) => ({ ...prev, [rowKey]: undefined }));
      return;
    }
    const num = parseFloat(value);
    if (!isNaN(num)) {
      const clamped = Math.max(0, Math.min(eseMax, num));
      setManualEse((prev) => ({ ...prev, [rowKey]: clamped }));
    }
  };

  // Step target grade up or down
  const handleTargetStep = (rowKey: string, currentGrade: GradeLetter, direction: 'UP' | 'DOWN') => {
    const activeCurrent = targetGrades[rowKey] || currentGrade;
    const nextGrade = stepGrade(activeCurrent, direction);
    setTargetGrades((prev) => ({ ...prev, [rowKey]: nextGrade }));
  };

  // Reset target grade back to manual prediction
  const handleResetTarget = (rowKey: string) => {
    setTargetGrades((prev) => {
      const updated = { ...prev };
      delete updated[rowKey];
      return updated;
    });
  };

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* 1. Header with Title, Mode Pill, and ETLAB Sync Button */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#26282f] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                  Credit Calculator
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f4f1eb] dark:bg-[#23262c] text-stone-700 dark:text-stone-300 border border-[#e7e4de] dark:border-[#2e3138]">
                  Semester {currentSemester}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-[#14281c] dark:text-emerald-400 border border-emerald-200 dark:border-[#1e3d29]">
                  {mode}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Official CIA marks synchronized from Results → Internal with interactive End Sem grade prediction.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            <span className="text-[11px] text-stone-400 font-mono hidden md:inline">
              Synced: {syncTime}
            </span>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              title="Synchronize latest internal assessment marks from ETLAB"
              className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-lg text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync with ETLAB'}</span>
            </button>
          </div>
        </div>

        {/* Informative notice distinguishing projection from official results */}
        <div className="mt-4 pt-3.5 border-t border-[#efece6] dark:border-[#262831] flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>
              <strong>Continuous Assessment (CIA)</strong> values are official and fixed from Results → Internal. <strong>End Semester (ESE)</strong> marks and target grades are student simulations, not published results.
            </span>
          </div>
          <Link
            href="/dashboard/results"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white underline"
          >
            <span>View Results → Internal</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Sync Error Notice if any */}
      {clientError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{clientError}</span>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-2.5 py-1 rounded-md bg-amber-600 text-white text-[11px] font-semibold hover:bg-amber-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Top Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Subjects */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#26282f] shadow-xs">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Total Subjects</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
              {summary.totalSubjects}
            </span>
            <span className="text-[10px] text-stone-400 font-mono">{summary.totalCredits} Credits</span>
          </div>
        </div>

        {/* Currently Passed */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#26282f] shadow-xs">
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">Eligible / Passed</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
              {summary.passedCount}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        {/* Currently Failed */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#26282f] shadow-xs">
          <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 block">Shortage / Fail</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-xl sm:text-2xl font-bold font-mono ${summary.failedCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-stone-400'}`}>
              {summary.failedCount}
            </span>
            <AlertCircle className={`w-4 h-4 ${summary.failedCount > 0 ? 'text-rose-500' : 'text-stone-300 dark:text-stone-600'}`} />
          </div>
        </div>

        {/* S Grade Subjects - Purple theme */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#26282f] shadow-xs">
          <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 block">S Grade (≥90%)</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-purple-700 dark:text-purple-300">
              {summary.sGradeCount}
            </span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
        </div>

        {/* A+ / A Grade Subjects */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#26282f] shadow-xs">
          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 block">A+ / A Grades</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-blue-700 dark:text-blue-300">
              {summary.aGradesCount}
            </span>
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
        </div>

        {/* Predicted SGPA */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-[#fbfaf8] dark:bg-[#202228] border border-stone-300 dark:border-stone-700 shadow-xs">
          <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 block">Predicted SGPA</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl sm:text-2xl font-extrabold font-mono text-stone-900 dark:text-white">
              {summary.weightedSgpa.toFixed(2)}
            </span>
            <span className="text-[10px] text-stone-500 font-mono">10.0 scale</span>
          </div>
        </div>
      </div>

      {/* 3. Main Subject-wise Marks Table */}
      <div className="rounded-2xl border border-[#e7e4de] dark:border-[#26282f] bg-white dark:bg-[#18191d] shadow-xs overflow-hidden">
        {/* Table Title and Actions Bar */}
        <div className="p-4 sm:p-5 border-b border-[#e7e4de] dark:border-[#26282f] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span>Semester Curriculum Evaluations</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                {subjects.length} Subjects
              </span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Enter your anticipated End Sem (ESE) marks or use the interactive ↑ / ↓ predictor to find target marks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGradingReference(!showGradingReference)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#f4f1eb] dark:bg-[#23262c] text-stone-700 dark:text-stone-300 hover:bg-[#eae6de] dark:hover:bg-[#2d3038] border border-[#e7e4de] dark:border-[#2e3138] transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-stone-500" />
              <span>{showGradingReference ? 'Hide Grading Table' : 'Grading Rules'}</span>
            </button>
          </div>
        </div>

        {/* Expandable Grading System Reference Section */}
        {showGradingReference && (
          <div className="p-4 sm:p-5 bg-[#fbfaf8] dark:bg-[#1f2127] border-b border-[#e7e4de] dark:border-[#26282f] animate-in fade-in">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <span>Official KTU Grading System & Evaluation Schemes</span>
                </h3>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                  Scale: 100 Marks Total
                </span>
              </div>

              {/* Official Grading Scale Grid */}
              <div className="overflow-x-auto rounded-xl border border-[#e7e4de] dark:border-[#2a2d35] bg-white dark:bg-[#18191d]">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#f4f1eb] dark:bg-[#22252c] border-b border-[#e7e4de] dark:border-[#2a2d35] text-[11px] text-stone-600 dark:text-stone-400 font-semibold uppercase">
                      <th className="p-2.5">Grade</th>
                      <th className="p-2.5 text-right">Grade Point (GP)</th>
                      <th className="p-2.5">% of Total Marks Obtained</th>
                      <th className="p-2.5">Evaluation Eligibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#efece6] dark:divide-[#262831]">
                    {OFFICIAL_GRADES_TABLE.map((row) => (
                      <tr key={row.grade} className="hover:bg-stone-50 dark:hover:bg-stone-800/30">
                        <td className="p-2.5 font-bold font-mono text-stone-900 dark:text-stone-100">
                          {row.grade}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-stone-800 dark:text-stone-200">
                          {row.gradePoint.toFixed(1)}
                        </td>
                        <td className="p-2.5 text-stone-700 dark:text-stone-300">
                          {row.description}
                        </td>
                        <td className="p-2.5 text-stone-500 dark:text-stone-400 text-[11px]">
                          {row.grade === 'F' ? 'Below 50% combined, or below 40% ESE, or below 40% CIA' : 'Must satisfy all individual passing thresholds'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Three Evaluation Types Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-white dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#2a2d35] space-y-1">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                    Type 1 — Integrated Theory
                  </span>
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">CIA /60 • ESE /40 • Total /100</p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                    Min CIA: 24/60 (40%) • Min ESE: 16/40 (40%) • Combined Min: 50/100.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#2a2d35] space-y-1">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                    Type 2 — Standard Theory
                  </span>
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">CIA /40 • ESE /60 • Total /100</p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                    Min CIA: 16/40 (40%) • Min ESE: 24/60 (40%) • Combined Min: 50/100.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#2a2d35] space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                    Type 3 — CIA-Only / Practicals
                  </span>
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">CIA /100 • ESE: NIL • Total /100</p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                    Evaluated solely on continuous internal marks. Min CIA: 50/100.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Subjects Table */}
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Credit Calculator Subjects Table">
          <table className="w-full text-xs text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#f9f8f5] dark:bg-[#181a1f] border-b border-[#e7e4de] dark:border-[#26282f] text-[11px] text-stone-600 dark:text-stone-400 font-semibold uppercase tracking-wider">
                <th className="p-3.5 pl-5">Subject</th>
                <th className="p-3.5 text-right whitespace-nowrap">Internal (CIA)</th>
                <th className="p-3.5 text-right whitespace-nowrap">End Sem (ESE)</th>
                <th className="p-3.5 text-right whitespace-nowrap">Total / 100</th>
                <th className="p-3.5 text-center whitespace-nowrap">Grade</th>
                <th className="p-3.5 pr-5 text-center whitespace-nowrap">Target Predictor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efece6] dark:divide-[#262831]">
              {subjects.map((sub) => {
                const rowKey = `${sub.subjectCode}::${sub.isLab ? 'practical' : 'theory'}`;
                const hasTarget = Boolean(sub.activeTargetGrade);
                const isTargetAchieved = sub.targetPrediction?.isAlreadyAchieved;
                const isTargetImpossible = sub.targetPrediction && !sub.targetPrediction.isAttainable;
                const targetEse = sub.targetPrediction?.requiredEse;

                return (
                  <React.Fragment key={rowKey}>
                    <tr className="hover:bg-[#fbfaf8] dark:hover:bg-[#202228] transition-colors">
                      {/* 1. SUBJECT */}
                      <td className="p-3.5 pl-5">
                        <div className="font-semibold text-stone-900 dark:text-stone-100">
                          {sub.subjectName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="font-mono text-[10px] text-stone-500 dark:text-stone-400">
                            {sub.subjectCode}
                          </span>
                          <span className="text-[10px] text-stone-300 dark:text-stone-600">•</span>
                          <span className="text-[10px] font-semibold text-stone-600 dark:text-stone-400">
                            {sub.credits} Credits
                          </span>
                          <span className="text-[10px] text-stone-300 dark:text-stone-600">•</span>

                          {/* Automatically determined non-editable evaluation type label */}
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                            {sub.config.label}
                          </span>

                          {!sub.isEvaluationReliable && (
                            <span
                              title="CIA maximum marks denominator is missing or does not match 40, 60, or 100. Verification required."
                              className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            >
                              Needs Verification
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. INTERNAL (CIA) — SOURCE OF TRUTH */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        {sub.hasPublishedCia ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="font-mono font-bold text-stone-900 dark:text-stone-100 text-sm">
                              {sub.ciaObtained}/{sub.config.ciaMax}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              Fixed (Results → Internal)
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-end">
                            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                              Awaiting marks
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              Max: {sub.config.ciaMax}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 3. END SEM (ESE) */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        {!sub.config.hasEse ? (
                          <span className="text-xs font-mono font-semibold text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800/60 px-2 py-1 rounded">
                            NIL
                          </span>
                        ) : (
                          <div className="inline-flex flex-col items-end gap-1">
                            {/* Manual ESE input */}
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={sub.config.eseMax}
                                step="any"
                                value={sub.eseInput !== undefined ? sub.eseInput : ''}
                                onChange={(e) => handleEseChange(rowKey, e.target.value, sub.config.eseMax)}
                                placeholder="0"
                                aria-label={`End Semester marks for ${sub.subjectName}`}
                                className={`w-16 px-2 py-1 text-right text-xs font-mono font-bold rounded-md border transition-all ${
                                  hasTarget
                                    ? 'border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-500'
                                    : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191d] text-stone-900 dark:text-stone-100 focus:ring-1 focus:ring-stone-400 focus:border-stone-400'
                                }`}
                              />
                              <span className="text-xs font-mono text-stone-400">
                                /{sub.config.eseMax}
                              </span>
                            </div>

                            {/* Target ESE Highlighted in YELLOW */}
                            {hasTarget && (
                              <div className="flex items-center gap-1">
                                {isTargetImpossible ? (
                                  <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                                    Unattainable
                                  </span>
                                ) : (
                                  <span
                                    title="Required ESE marks calculated for target grade"
                                    className="text-[11px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-yellow-300 dark:bg-yellow-500 text-yellow-950 shadow-xs border border-yellow-400"
                                  >
                                    Target ESE: {targetEse}/{sub.config.eseMax}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 4. TOTAL / 100 */}
                      <td className="p-3.5 text-right font-mono whitespace-nowrap">
                        {sub.totalMarks !== undefined ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                              {Number.isInteger(sub.totalMarks) ? sub.totalMarks : sub.totalMarks.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              /100
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>

                      {/* 5. GRADE */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="relative inline-flex flex-col items-center gap-1">
                          <div className="relative inline-flex items-center">
                            <span
                              className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono transition-colors shadow-2xs ${
                                sub.grade === 'S'
                                  ? 'bg-purple-100/90 text-purple-900 border border-purple-300 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-700/80 shadow-[0_0_12px_rgba(168,85,247,0.25)] animate-s-badge-glow'
                                  : sub.grade === 'A+' || sub.grade === 'A'
                                  ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                  : sub.grade === 'B+' || sub.grade === 'B'
                                  ? 'bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                                  : sub.grade === 'F'
                                  ? 'bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                                  : 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700'
                              }`}
                            >
                              {sub.grade}
                              <span className="ml-1 text-[10px] font-normal opacity-80">
                                ({sub.gradePoint.toFixed(1)})
                              </span>
                            </span>

                            {/* Permanent starry effect for as long as subject has S grade */}
                            {sub.grade === 'S' && <PermanentSGradeStars />}
                          </div>

                          <span
                            className={`text-[9px] font-semibold uppercase tracking-wider ${
                              sub.isPassing
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {sub.isPassing ? 'Eligible' : 'Fail'}
                          </span>
                        </div>
                      </td>

                      {/* 6. INTERACTIVE TARGET PREDICTOR (↑ / ↓) */}
                      <td className="p-3.5 pr-5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 p-1 rounded-lg bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
                          {/* DOWN Button */}
                          <button
                            onClick={() => handleTargetStep(rowKey, sub.grade, 'DOWN')}
                            disabled={!sub.hasPublishedCia}
                            title="Move target to lower grade"
                            aria-label={`Target lower grade for ${sub.subjectName}`}
                            className="p-1 rounded text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 cursor-pointer disabled:opacity-40"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {/* Target Grade Badge */}
                          <div className="relative min-w-[48px] px-1.5 py-0.5 text-center">
                            {hasTarget ? (
                              <span
                                className={`text-xs font-mono font-extrabold ${
                                  sub.activeTargetGrade === 'S'
                                    ? 'text-purple-700 dark:text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.35)]'
                                    : 'text-amber-900 dark:text-yellow-300'
                                }`}
                              >
                                {sub.activeTargetGrade}
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-stone-400">
                                {sub.grade}
                              </span>
                            )}

                            {/* Permanent starry effect when target is S */}
                            {sub.activeTargetGrade === 'S' && <PermanentSGradeStars />}
                          </div>

                          {/* UP Button */}
                          <button
                            onClick={() => handleTargetStep(rowKey, sub.grade, 'UP')}
                            disabled={!sub.hasPublishedCia}
                            title="Move target to higher grade"
                            aria-label={`Target higher grade for ${sub.subjectName}`}
                            className="p-1 rounded text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 cursor-pointer disabled:opacity-40"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>

                          {/* Reset Target Button (if active) */}
                          {hasTarget && (
                            <button
                              onClick={() => handleResetTarget(rowKey)}
                              title="Reset target to current manual prediction"
                              aria-label={`Reset target for ${sub.subjectName}`}
                              className="p-1 ml-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Explanatory Target or Failure Box for this subject */}
                    {(hasTarget || !sub.isPassing) && (
                      <tr className="bg-stone-50/70 dark:bg-[#1b1d22]/50">
                        <td colSpan={6} className="px-5 py-2.5 text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            {/* Target Explanation */}
                            {hasTarget && sub.targetPrediction && (
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                                    sub.activeTargetGrade === 'S'
                                      ? 'text-purple-800 dark:text-purple-300 bg-purple-200/60 dark:bg-purple-950/50 border border-purple-300/60 dark:border-purple-800/60'
                                      : 'text-amber-800 dark:text-amber-300 bg-yellow-200/60 dark:bg-yellow-500/20'
                                  }`}
                                >
                                  Target: {sub.activeTargetGrade}
                                </span>
                                <span className="text-stone-700 dark:text-stone-300 text-[11px] leading-relaxed">
                                  {sub.targetPrediction.explanation}
                                </span>
                              </div>
                            )}

                            {/* Failure Reason */}
                            {!sub.isPassing && sub.passingReasons.length > 0 && (
                              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 text-[11px]">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{sub.passingReasons[0]}</span>
                              </div>
                            )}

                            {hasTarget && (
                              <button
                                onClick={() => handleResetTarget(rowKey)}
                                className="text-[10px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline cursor-pointer shrink-0"
                              >
                                Return to Manual Prediction
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
