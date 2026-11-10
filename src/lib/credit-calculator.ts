import type { EtlabAssessmentRecord, SemesterResult } from '../types/index.ts';
import { isLabCourse, stripLabSuffix, getCourseFullName } from './course-catalog.ts';

export type GradeLetter = 'S' | 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'P' | 'F';

export interface GradeDefinition {
  grade: GradeLetter;
  gradePoint: number;
  minPercentage: number;
  maxPercentage: number;
  description: string;
}

export const OFFICIAL_GRADES_TABLE: GradeDefinition[] = [
  { grade: 'S', gradePoint: 10.0, minPercentage: 90, maxPercentage: 100, description: '90% and above' },
  { grade: 'A+', gradePoint: 9.0, minPercentage: 85, maxPercentage: 90, description: '85% and above but below 90%' },
  { grade: 'A', gradePoint: 8.5, minPercentage: 80, maxPercentage: 85, description: '80% and above but below 85%' },
  { grade: 'B+', gradePoint: 8.0, minPercentage: 75, maxPercentage: 80, description: '75% and above but below 80%' },
  { grade: 'B', gradePoint: 7.5, minPercentage: 70, maxPercentage: 75, description: '70% and above but below 75%' },
  { grade: 'C+', gradePoint: 7.0, minPercentage: 65, maxPercentage: 70, description: '65% and above but below 70%' },
  { grade: 'C', gradePoint: 6.5, minPercentage: 60, maxPercentage: 65, description: '60% and above but below 65%' },
  { grade: 'D', gradePoint: 6.0, minPercentage: 55, maxPercentage: 60, description: '55% and above but below 60%' },
  { grade: 'P', gradePoint: 5.5, minPercentage: 50, maxPercentage: 55, description: '50% and above but below 55%' },
  { grade: 'F', gradePoint: 0.0, minPercentage: 0, maxPercentage: 50, description: 'Below 50%' },
];

export const ORDERED_GRADES: GradeLetter[] = ['S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'P', 'F'];

export const GRADE_MIN_TOTALS: Record<GradeLetter, number> = {
  S: 90,
  'A+': 85,
  A: 80,
  'B+': 75,
  B: 70,
  'C+': 65,
  C: 60,
  D: 55,
  P: 50,
  F: 0,
};

export const GRADE_POINTS: Record<GradeLetter, number> = {
  S: 10.0,
  'A+': 9.0,
  A: 8.5,
  'B+': 8.0,
  B: 7.5,
  'C+': 7.0,
  C: 6.5,
  D: 6.0,
  P: 5.5,
  F: 0.0,
};

/**
 * Visual styling theme tokens for grades.
 * S Grade is styled with a refined Purple theme with subtle transparency and purple glow.
 */
export const GRADE_COLORS: Record<GradeLetter, string> = {
  S: 'bg-purple-100/90 text-purple-900 border-purple-300 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-700/80 shadow-[0_0_12px_rgba(168,85,247,0.25)]',
  'A+': 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700',
  A: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700',
  'B+': 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700',
  B: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700',
  'C+': 'bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700',
  C: 'bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700',
  D: 'bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700',
  P: 'bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700',
  F: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700',
};

export type EvaluationType = 'Type 1' | 'Type 2' | 'Type 3' | 'Unverified';

export interface EvaluationConfig {
  type: EvaluationType;
  label: string;
  ciaMax: number;
  eseMax: number;
  hasEse: boolean;
  minCia: number; // 40% of ciaMax
  minEse: number; // 40% of eseMax
  minTotal: number; // 50
}

export const EVALUATION_CONFIGS: Record<'Type 1' | 'Type 2' | 'Type 3', EvaluationConfig> = {
  'Type 1': {
    type: 'Type 1',
    label: 'Type 1 (60/40)',
    ciaMax: 60,
    eseMax: 40,
    hasEse: true,
    minCia: 24, // 40% of 60
    minEse: 16, // 40% of 40
    minTotal: 50,
  },
  'Type 2': {
    type: 'Type 2',
    label: 'Type 2 (40/60)',
    ciaMax: 40,
    eseMax: 60,
    hasEse: true,
    minCia: 16, // 40% of 40
    minEse: 24, // 40% of 60
    minTotal: 50,
  },
  'Type 3': {
    type: 'Type 3',
    label: 'Type 3 (100/NIL)',
    ciaMax: 100,
    eseMax: 0,
    hasEse: false,
    minCia: 40, // 40% of 100
    minEse: 0,
    minTotal: 50,
  },
};

/**
 * Checks if a subject code or name belongs to MINOR / REMEDIAL courses.
 * These courses are strictly excluded from the Credit Calculator.
 */
export function isMinorOrRemedial(code?: string, name?: string): boolean {
  const c = (code || '').toUpperCase().trim();
  const n = (name || '').toUpperCase().trim();
  return (
    c.includes('CSM3') ||
    c.includes('MINOR') ||
    c.includes('REMEDIAL') ||
    n.includes('MINOR') ||
    n.includes('REMEDIAL')
  );
}

/**
 * Automatically determines the evaluation type using the denominator (maximum marks)
 * of the CIA internal marks retrieved from Results -> Internal.
 * - 60  -> Type 1 (60/40)
 * - 40  -> Type 2 (40/60)
 * - 100 -> Type 3 (100/NIL)
 *
 * If the CIA denominator is missing or does not match 40, 60, or 100,
 * the subject is flagged as requiring verification without guessing.
 */
export function detectEvaluationType(
  ciaMaxMarks?: number
): { type: EvaluationType; isReliable: boolean; config: EvaluationConfig } {
  if (ciaMaxMarks === 60) {
    return { type: 'Type 1', isReliable: true, config: EVALUATION_CONFIGS['Type 1'] };
  }
  if (ciaMaxMarks === 40) {
    return { type: 'Type 2', isReliable: true, config: EVALUATION_CONFIGS['Type 2'] };
  }
  if (ciaMaxMarks === 100) {
    return { type: 'Type 3', isReliable: true, config: EVALUATION_CONFIGS['Type 3'] };
  }

  // Missing or does not match 40, 60, or 100: flag for verification without guessing
  return {
    type: 'Unverified',
    isReliable: false,
    config: {
      type: 'Unverified',
      label: 'Needs Verification',
      ciaMax: typeof ciaMaxMarks === 'number' && ciaMaxMarks > 0 ? ciaMaxMarks : 60,
      eseMax: typeof ciaMaxMarks === 'number' && ciaMaxMarks > 0 && ciaMaxMarks < 100 ? 100 - ciaMaxMarks : 40,
      hasEse: ciaMaxMarks !== 100,
      minCia: typeof ciaMaxMarks === 'number' && ciaMaxMarks > 0 ? ciaMaxMarks * 0.4 : 24,
      minEse: typeof ciaMaxMarks === 'number' && ciaMaxMarks > 0 && ciaMaxMarks < 100 ? (100 - ciaMaxMarks) * 0.4 : 16,
      minTotal: 50,
    },
  };
}

/**
 * Automatically determines the default ESE marks for a subject based on its evaluation configuration.
 * When the Credit Calculator is opened for the first time, all eligible subjects automatically
 * populate with the maximum possible marks (full marks) for each subject:
 * - Type 1 (60/40)   -> 40/40 (Full Marks)
 * - Type 2 (40/60)   -> 60/60 (Full Marks)
 * - Type 3 (100/NIL) -> undefined (NIL)
 */
export function getDefaultEseMarks(config: EvaluationConfig): number | undefined {
  return config.hasEse ? config.eseMax : undefined;
}

export interface PassingConditionResult {
  isPassing: boolean;
  reasons: string[];
  ciaSatisfied: boolean;
  eseSatisfied: boolean;
  totalSatisfied: boolean;
}

/**
 * Checks all mandatory passing conditions for a subject.
 * Type 1 & Type 2:
 * 1. CIA >= 40% of its maximum marks
 * 2. ESE >= 40% of its maximum marks
 * 3. CIA + ESE >= 50/100
 *
 * Type 3:
 * 1. CIA >= 40% of maximum marks (40/100)
 * 2. Combined marks >= 50/100
 */
export function checkPassingConditions(
  ciaObtained: number | undefined,
  eseObtained: number | undefined,
  config: EvaluationConfig
): PassingConditionResult {
  if (ciaObtained === undefined || ciaObtained === null || isNaN(ciaObtained)) {
    return {
      isPassing: false,
      reasons: ['Internal marks (CIA) are awaiting publication.'],
      ciaSatisfied: false,
      eseSatisfied: false,
      totalSatisfied: false,
    };
  }

  const reasons: string[] = [];
  const ciaSatisfied = ciaObtained >= config.minCia;
  if (!ciaSatisfied) {
    reasons.push(
      `Your internal marks are below the required 40% CIA threshold (${ciaObtained}/${config.ciaMax}, required: ${config.minCia}).`
    );
  }

  let eseSatisfied = true;
  if (config.hasEse) {
    const ese = typeof eseObtained === 'number' && !isNaN(eseObtained) ? eseObtained : 0;
    eseSatisfied = ese >= config.minEse;
    if (!eseSatisfied) {
      reasons.push(
        `You need at least ${config.minEse}/${config.eseMax} in the End Semester Examination to pass.`
      );
    }
  }

  const currentEse = config.hasEse && typeof eseObtained === 'number' && !isNaN(eseObtained) ? eseObtained : 0;
  const total = ciaObtained + currentEse;
  const totalSatisfied = total >= config.minTotal;
  if (!totalSatisfied) {
    reasons.push(`Your combined marks must be at least 50/100 to pass (current: ${total.toFixed(1)}/100).`);
  }

  const isPassing = ciaSatisfied && eseSatisfied && totalSatisfied;
  return {
    isPassing,
    reasons,
    ciaSatisfied,
    eseSatisfied,
    totalSatisfied,
  };
}

/**
 * Determines letter grade and grade points based on total score (0 - 100) and passing eligibility.
 * Exact grade boundaries are used without rounding.
 */
export function determineGrade(
  total: number,
  isPassing: boolean
): { grade: GradeLetter; gradePoint: number } {
  if (!isPassing) {
    return { grade: 'F', gradePoint: 0.0 };
  }

  if (total >= 90) return { grade: 'S', gradePoint: 10.0 };
  if (total >= 85) return { grade: 'A+', gradePoint: 9.0 };
  if (total >= 80) return { grade: 'A', gradePoint: 8.5 };
  if (total >= 75) return { grade: 'B+', gradePoint: 8.0 };
  if (total >= 70) return { grade: 'B', gradePoint: 7.5 };
  if (total >= 65) return { grade: 'C+', gradePoint: 7.0 };
  if (total >= 60) return { grade: 'C', gradePoint: 6.5 };
  if (total >= 55) return { grade: 'D', gradePoint: 6.0 };
  if (total >= 50) return { grade: 'P', gradePoint: 5.5 };

  return { grade: 'F', gradePoint: 0.0 };
}

export interface TargetGradePrediction {
  targetGrade: GradeLetter;
  isAttainable: boolean;
  requiredEse?: number;
  explanation: string;
  isAlreadyAchieved: boolean;
  reason?: string;
}

/**
 * Calculates the required ESE marks to achieve a specified target grade.
 * Respects all mandatory passing conditions, maximum ESE bounds, and Type 3 CIA-only evaluation.
 */
export function calculateTargetEse(
  targetGrade: GradeLetter,
  ciaObtained: number | undefined,
  config: EvaluationConfig
): TargetGradePrediction {
  if (ciaObtained === undefined || ciaObtained === null || isNaN(ciaObtained)) {
    return {
      targetGrade,
      isAttainable: false,
      isAlreadyAchieved: false,
      explanation: 'Internal marks (CIA) are awaiting publication.',
    };
  }

  // Check if CIA alone fails the mandatory CIA threshold (40%)
  if (ciaObtained < config.minCia) {
    return {
      targetGrade,
      isAttainable: false,
      isAlreadyAchieved: false,
      explanation: `Internal marks (${ciaObtained}/${config.ciaMax}) are below the mandatory 40% threshold (${config.minCia}). Passing grade cannot be achieved.`,
    };
  }

  // Grade F target
  if (targetGrade === 'F') {
    return {
      targetGrade: 'F',
      isAttainable: true,
      isAlreadyAchieved: false,
      requiredEse: config.hasEse ? 0 : undefined,
      explanation: 'Target Grade: F (Fail). Scored when passing conditions or minimum thresholds are not met.',
    };
  }

  const minTotalRequired = GRADE_MIN_TOTALS[targetGrade];

  // Type 3: CIA only, no ESE
  if (!config.hasEse) {
    if (ciaObtained >= minTotalRequired && ciaObtained >= config.minTotal) {
      return {
        targetGrade,
        isAttainable: true,
        isAlreadyAchieved: true,
        explanation: `Target Grade: ${targetGrade} is already achieved with your current internal marks (${ciaObtained}/100).`,
      };
    } else {
      return {
        targetGrade,
        isAttainable: false,
        isAlreadyAchieved: false,
        explanation: `Target Grade: ${targetGrade} requires ${minTotalRequired}/100. Since this course has no End Semester Examination, grade ${targetGrade} is unattainable with your current internal marks (${ciaObtained}/100).`,
      };
    }
  }

  // Type 1 and Type 2 (with ESE)
  const neededEseForTotal = minTotalRequired - ciaObtained;

  // Passing condition requires at least minEse (40% of eseMax)
  const requiredEse = Math.max(neededEseForTotal, config.minEse);

  // Check if required ESE exceeds max possible ESE marks
  if (requiredEse > config.eseMax) {
    const maxPossibleTotal = ciaObtained + config.eseMax;
    return {
      targetGrade,
      isAttainable: false,
      isAlreadyAchieved: false,
      explanation: `Target Grade: ${targetGrade} requires at least ${minTotalRequired} marks. With maximum possible ESE marks (${config.eseMax}/${config.eseMax}), your maximum attainable total is ${maxPossibleTotal}/100.`,
    };
  }

  // Check if minimum ESE passing requirement is higher than marks needed for total
  let extraExplanation = '';
  if (neededEseForTotal < config.minEse) {
    extraExplanation = ` (Note: You need at least ${config.minEse}/${config.eseMax} to satisfy the mandatory 40% ESE passing requirement).`;
  }

  const isAchieved = neededEseForTotal <= 0 && config.minEse <= 0;

  return {
    targetGrade,
    isAttainable: true,
    isAlreadyAchieved: isAchieved,
    requiredEse: Math.max(0, requiredEse),
    explanation: `Target Grade: ${targetGrade} • Required ESE Marks: ${Math.max(0, requiredEse)}/${config.eseMax}.${extraExplanation} You need at least ${Math.max(0, requiredEse)} marks in your End Semester Examination to achieve ${targetGrade}.`,
  };
}

/**
 * Moves up or down exactly one grade step in ORDERED_GRADES.
 */
export function stepGrade(current: GradeLetter, direction: 'UP' | 'DOWN'): GradeLetter {
  const idx = ORDERED_GRADES.indexOf(current);
  if (idx === -1) return current;

  if (direction === 'UP') {
    // UP moves towards 'S' (index 0)
    const nextIdx = Math.max(0, idx - 1);
    return ORDERED_GRADES[nextIdx];
  } else {
    // DOWN moves towards 'F' (last index)
    const nextIdx = Math.min(ORDERED_GRADES.length - 1, idx + 1);
    return ORDERED_GRADES[nextIdx];
  }
}

export interface CalculatorSubject {
  id: string;
  subjectCode: string;
  subjectName: string;
  credits: number;
  isLab: boolean;
  evaluationType: EvaluationType;
  isEvaluationReliable: boolean;
  config: EvaluationConfig;
  ciaObtained?: number;
  ciaMax?: number;
  eseInput?: number; // User manual prediction
  activeTargetGrade?: GradeLetter;
  targetPrediction?: TargetGradePrediction;
  hasPublishedCia: boolean;
  totalMarks?: number;
  grade: GradeLetter;
  gradePoint: number;
  isPassing: boolean;
  passingReasons: string[];
}

export interface CalculatorSummary {
  totalSubjects: number;
  passedCount: number;
  failedCount: number;
  sGradeCount: number;
  aGradesCount: number; // A+ and A
  averageGradePoint: number;
  weightedSgpa: number;
  totalCredits: number;
}

/**
 * Computes live summary metrics for the calculator view.
 */
export function calculateSummary(subjects: CalculatorSubject[]): CalculatorSummary {
  const totalSubjects = subjects.length;
  let passedCount = 0;
  let failedCount = 0;
  let sGradeCount = 0;
  let aGradesCount = 0;
  let totalGradePoints = 0;
  let totalWeightedPoints = 0;
  let totalCredits = 0;

  for (const sub of subjects) {
    if (sub.isPassing) {
      passedCount++;
    } else {
      failedCount++;
    }

    if (sub.grade === 'S') {
      sGradeCount++;
    } else if (sub.grade === 'A+' || sub.grade === 'A') {
      aGradesCount++;
    }

    totalGradePoints += sub.gradePoint;
    const cred = sub.credits > 0 ? sub.credits : 3;
    totalWeightedPoints += sub.gradePoint * cred;
    totalCredits += cred;
  }

  const averageGradePoint = totalSubjects > 0 ? Number((totalGradePoints / totalSubjects).toFixed(2)) : 0;
  const weightedSgpa = totalCredits > 0 ? Number((totalWeightedPoints / totalCredits).toFixed(2)) : 0;

  return {
    totalSubjects,
    passedCount,
    failedCount,
    sGradeCount,
    aGradesCount,
    averageGradePoint,
    weightedSgpa,
    totalCredits,
  };
}
