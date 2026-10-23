export interface SubjectAttendanceData {
  code: string;
  name: string;
  faculty: string;
  attendedHours: number;
  totalHours: number;
  category?: 'Theory' | 'Lab' | 'Elective';
}

export interface CalculatedSubjectAttendance extends SubjectAttendanceData {
  percentage: number;
  status: 'safe' | 'warning' | 'critical';
  safeBunks: number;
  classesToRecover: number;
}

export interface AttendanceSummaryCalculation {
  totalAttended: number;
  totalConducted: number;
  overallPercentage: number;
  targetPercentage: number;
  status: 'safe' | 'warning' | 'critical';
  safeBunks: number;
  classesToRecover: number;
  subjects: CalculatedSubjectAttendance[];
  isAvailable?: boolean;
}

/**
 * Calculate attendance percentage: P = 100 * (A / T)
 * If no classes conducted (T <= 0), returns 0% (never a fabricated 100%).
 */
export function calculatePercentage(attended: number, total: number): number {
  if (total <= 0) return 0;
  if (attended <= 0) return 0;
  if (attended >= total) return 100;
  return Number(((attended / total) * 100).toFixed(2));
}

/**
 * After missing m additional classes:
 * P_miss = 100 * (A / (T + m))
 */
export function calculateProjectedAfterMiss(
  attended: number,
  total: number,
  missCount: number
): number {
  if (missCount <= 0) return calculatePercentage(attended, total);
  const newTotal = total + missCount;
  if (newTotal <= 0) return 0;
  return Number(((attended / newTotal) * 100).toFixed(2));
}

/**
 * After attending n additional classes:
 * P_attend = 100 * ((A + n) / (T + n))
 */
export function calculateProjectedAfterAttend(
  attended: number,
  total: number,
  attendCount: number
): number {
  if (attendCount <= 0) return calculatePercentage(attended, total);
  const newAttended = attended + attendCount;
  const newTotal = total + attendCount;
  if (newTotal <= 0) return 0;
  return Number(((newAttended / newTotal) * 100).toFixed(2));
}

/**
 * Consecutive classes required to reach or restore target p (0 < p < 1):
 * n = max(0, ceil((p*T - A) / (1 - p)))
 *
 * Edge cases:
 * - If target p >= 1.0 (100%):
 *   If A == T (no misses), n = 0.
 *   If A < T (already missed at least 1), it is mathematically impossible to reach 100% unless total is reset, returns Infinity.
 * - If current percentage >= target: returns 0.
 */
export function calculateClassesToRecover(
  attended: number,
  total: number,
  targetPercentage: number
): number {
  const p = targetPercentage / 100;
  if (p <= 0) return 0;
  if (total <= 0) return 0;
  if (attended >= total * p) return 0;

  if (p >= 1) {
    return attended >= total ? 0 : Infinity;
  }

  const numerator = p * total - attended;
  const denominator = 1 - p;
  const needed = Math.ceil(numerator / denominator);
  return Math.max(0, needed);
}

/**
 * Maximum consecutive absences that maintain the target p (p > 0):
 * m_max = max(0, floor(A / p - T))
 *
 * Edge cases:
 * - If target p <= 0: returns Infinity (can skip infinite classes).
 * - If current percentage < target: returns 0 (already below target, cannot afford any absence).
 */
export function calculateSafeBunks(
  attended: number,
  total: number,
  targetPercentage: number
): number {
  const p = targetPercentage / 100;
  if (p <= 0) return Infinity;
  if (total <= 0) return 0;
  if (attended <= 0) return 0;

  const currentP = attended / total;
  if (currentP < p) return 0;

  const maxAllowedTotal = Math.floor(attended / p);
  const safeAbsences = maxAllowedTotal - total;
  return Math.max(0, safeAbsences);
}

/**
 * Determine if an individual class slot is bunkable.
 * Missing 1 class of weight `durationHours` leaves subject attendance >= target.
 *
 * Formula:
 * projected = (A / (C + durationHours)) * 100
 * Bunkable only when projected >= target.
 *
 * Guard rules:
 * - Free period: never bunkable
 * - Missing or zero conducted attendance (C <= 0): never bunkable
 * - Target <= 0 or > 100: false
 */
export function isClassBunkable(
  subjectCode: string,
  subjects: { code: string; attendedHours: number; totalHours: number }[],
  targetPercentage: number = 75,
  durationHours: number = 1
): boolean {
  if (!subjectCode || subjectCode.toUpperCase() === 'FREE') return false;
  if (!subjects || subjects.length === 0) return false;
  if (targetPercentage <= 0 || targetPercentage > 100) return false;

  const cleanCode = subjectCode.trim().toUpperCase();
  const sub = subjects.find((s) => {
    const sCode = s.code.trim().toUpperCase();
    return sCode === cleanCode || cleanCode.includes(sCode) || sCode.includes(cleanCode);
  });

  if (!sub) return false;
  if (sub.totalHours <= 0) return false;

  const newTotal = sub.totalHours + durationHours;
  if (newTotal <= 0) return false;

  const projectedPercentage = calculatePercentage(sub.attendedHours, newTotal);
  return projectedPercentage >= targetPercentage;
}

/**
 * Get status indicator relative to target:
 * - 'safe': >= target
 * - 'warning': between (target - 5%) and target
 * - 'critical': < (target - 5%)
 */
export function getAttendanceStatus(
  percentage: number,
  targetPercentage: number
): 'safe' | 'warning' | 'critical' {
  if (percentage >= targetPercentage) return 'safe';
  if (percentage >= targetPercentage - 5) return 'warning';
  return 'critical';
}

/**
 * Compute full attendance summary for a list of subjects
 */
export function calculateAttendanceSummary(
  subjects: SubjectAttendanceData[],
  targetPercentage: number = 75
): AttendanceSummaryCalculation {
  let totalAttended = 0;
  let totalConducted = 0;

  const calculatedSubjects: CalculatedSubjectAttendance[] = subjects.map((sub) => {
    totalAttended += sub.attendedHours;
    totalConducted += sub.totalHours;

    const percentage = calculatePercentage(sub.attendedHours, sub.totalHours);
    const safeBunks = calculateSafeBunks(sub.attendedHours, sub.totalHours, targetPercentage);
    const classesToRecover = calculateClassesToRecover(sub.attendedHours, sub.totalHours, targetPercentage);
    const status = getAttendanceStatus(percentage, targetPercentage);

    return {
      ...sub,
      percentage,
      safeBunks,
      classesToRecover,
      status,
    };
  });

  const isAvailable = totalConducted > 0 && subjects.length > 0;
  const overallPercentage = isAvailable ? calculatePercentage(totalAttended, totalConducted) : 0;
  const overallSafeBunks = isAvailable ? calculateSafeBunks(totalAttended, totalConducted, targetPercentage) : 0;
  const overallClassesToRecover = isAvailable ? calculateClassesToRecover(totalAttended, totalConducted, targetPercentage) : 0;
  const overallStatus = isAvailable ? getAttendanceStatus(overallPercentage, targetPercentage) : 'critical';

  return {
    totalAttended,
    totalConducted,
    overallPercentage,
    targetPercentage,
    status: overallStatus,
    safeBunks: overallSafeBunks,
    classesToRecover: overallClassesToRecover,
    subjects: calculatedSubjects,
    isAvailable,
  };
}
