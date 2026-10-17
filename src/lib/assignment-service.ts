import type { Assignment, AuthSession } from '../types/index.ts';
import { etlabFetchAssignments } from './etlab-client.ts';
import { getCourseFullName, SEMESTER_3_COURSES } from './course-catalog.ts';
import { getAssignmentEffectiveStatus, isUpcomingAssignment, parseDeadline } from './assignment-utils.ts';
import { DEMO_ASSIGNMENTS } from './demo-data.ts';

export interface AssignmentSyncResult {
  success: boolean;
  assignments: Assignment[];
  upcomingAssignments: Assignment[];
  upcomingCount: number;
  totalCount: number;
  submittedCount: number;
  completedCount: number;
  overdueCount: number;
  error?: string;
  source: 'live' | 'demo';
  lastSynced: string;
}

interface CacheEntry {
  timestamp: number;
  result: AssignmentSyncResult;
}

const assignmentCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 20 * 1000; // 20 seconds short cache to deduplicate simultaneous requests

/**
 * Known fabricated assignment IDs and titles permanently excluded from the system.
 */
export const FABRICATED_ASSIGNMENT_IDS = new Set([
  'asg-01',
  'asg-02',
  'asg-03',
  'asg-04',
  'asg-05',
]);

export function isFabricatedAssignment(asg: Assignment): boolean {
  if (!asg) return true;
  if (asg.id && FABRICATED_ASSIGNMENT_IDS.has(asg.id)) return true;
  const title = (asg.title || '').toLowerCase();
  if (
    title.includes('gradient descent & linear regression from scratch') ||
    title.includes('avl tree balancing and red-black tree rotations') ||
    title.includes('singular value decomposition and fourier transforms') ||
    title.includes('cpu pipelining hazard simulation') ||
    title.includes('combinatorics, generating functions & graph proofs')
  ) {
    return true;
  }
  return false;
}

/**
 * Deduplicates assignments by unique subjectCode + title + dueDate
 */
export function deduplicateAssignments(assignments: Assignment[]): Assignment[] {
  const seen = new Set<string>();
  const result: Assignment[] = [];

  for (const asg of assignments) {
    if (!asg || isFabricatedAssignment(asg)) continue;
    const key = `${(asg.subjectCode || '').trim().toUpperCase()}::${(asg.title || '').trim().toLowerCase()}::${(asg.dueDate || '').trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(asg);
    }
  }

  return result;
}

/**
 * Normalizes an assignment with canonical course names, effective status, and validated submission mode.
 */
export function normalizeAssignment(asg: Assignment): Assignment {
  const code = (asg.subjectCode || '').trim().toUpperCase();
  const canonicalName = getCourseFullName(code, asg.subject);
  const effectiveStatus = getAssignmentEffectiveStatus(asg);

  // Validate submission mode
  let submissionMode: Assignment['submissionMode'] = 'Submission mode not specified';
  if (asg.submissionMode === 'Online' || asg.submissionMode === 'Offline') {
    submissionMode = asg.submissionMode;
  }

  return {
    ...asg,
    id: asg.id || `asg-${code}-${Math.random().toString(36).substring(2, 7)}`,
    subjectCode: code,
    subject: canonicalName,
    title: (asg.title || 'Untitled Assignment').trim(),
    status: effectiveStatus,
    submissionMode,
    publishDate: asg.publishDate || 'Not specified',
    dueDate: asg.dueDate || 'Not specified',
    description: asg.description || `Coursework assignment for ${canonicalName}`,
    externalUrl: asg.externalUrl || 'https://tkmce.etlab.in/student/assignments',
  };
}

/**
 * Single shared function for obtaining normalized, synchronized assignment data for both Overview and Assignments pages.
 */
export async function getSynchronizedAssignments(
  session: AuthSession | null,
  forceRefresh: boolean = false
): Promise<AssignmentSyncResult> {
  const nowStr = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  if (!session) {
    return {
      success: false,
      assignments: [],
      upcomingAssignments: [],
      upcomingCount: 0,
      totalCount: 0,
      submittedCount: 0,
      completedCount: 0,
      overdueCount: 0,
      error: 'Authentication session required.',
      source: 'demo',
      lastSynced: nowStr,
    };
  }

  const cacheKey = `${session.mode}_${session.username}`;

  if (!forceRefresh) {
    const cached = assignmentCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.result;
    }
  }

  if (session.mode === 'live' && session.sessionId) {
    try {
      const fetchRes = await etlabFetchAssignments(session.sessionId, 3);

      if (!fetchRes.success) {
        // Return clear error state without synthetic fallback in live mode
        const errorResult: AssignmentSyncResult = {
          success: false,
          assignments: [],
          upcomingAssignments: [],
          upcomingCount: 0,
          totalCount: 0,
          submittedCount: 0,
          completedCount: 0,
          overdueCount: 0,
          error: fetchRes.error || 'Unable to synchronize assignments from ETLAB portal.',
          source: 'live',
          lastSynced: nowStr,
        };
        return errorResult;
      }

      const rawAssignments = fetchRes.assignments || [];
      const deduplicated = deduplicateAssignments(rawAssignments);
      const normalized = deduplicated.map(normalizeAssignment);

      // Filter for valid Semester 3 courses if present, or all authenticated records
      const s3Codes = new Set(Object.keys(SEMESTER_3_COURSES));
      const s3Assignments = normalized.filter((a) => {
        // If code is in S3 course catalog or has S3 prefix or is standard
        return s3Codes.has(a.subjectCode) || a.subjectCode.startsWith('24') || normalized.length <= 5;
      });

      const finalAssignments = s3Assignments.length > 0 ? s3Assignments : normalized;

      // Sort: Upcoming (sorted by earliest due date first), then submitted/completed/overdue
      finalAssignments.sort((a, b) => {
        const aUpcoming = isUpcomingAssignment(a);
        const bUpcoming = isUpcomingAssignment(b);
        if (aUpcoming && !bUpcoming) return -1;
        if (!aUpcoming && bUpcoming) return 1;

        const aDate = parseDeadline(a.dueDate).getTime();
        const bDate = parseDeadline(b.dueDate).getTime();
        return aDate - bDate;
      });

      const upcomingAssignments = finalAssignments.filter((a) => isUpcomingAssignment(a));
      const submittedCount = finalAssignments.filter((a) => a.status === 'submitted').length;
      const completedCount = finalAssignments.filter((a) => a.status === 'completed' || a.status === 'graded').length;
      const overdueCount = finalAssignments.filter((a) => a.status === 'overdue').length;

      const result: AssignmentSyncResult = {
        success: true,
        assignments: finalAssignments,
        upcomingAssignments,
        upcomingCount: upcomingAssignments.length,
        totalCount: finalAssignments.length,
        submittedCount,
        completedCount,
        overdueCount,
        source: 'live',
        lastSynced: nowStr,
      };

      assignmentCache.set(cacheKey, { timestamp: Date.now(), result });
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve live assignments.';
      return {
        success: false,
        assignments: [],
        upcomingAssignments: [],
        upcomingCount: 0,
        totalCount: 0,
        submittedCount: 0,
        completedCount: 0,
        overdueCount: 0,
        error: message,
        source: 'live',
        lastSynced: nowStr,
      };
    }
  }

  // Demo mode
  const deduplicated = deduplicateAssignments(DEMO_ASSIGNMENTS);
  const normalized = deduplicated.map(normalizeAssignment);

  // Sort upcoming first
  normalized.sort((a, b) => {
    const aUpcoming = isUpcomingAssignment(a);
    const bUpcoming = isUpcomingAssignment(b);
    if (aUpcoming && !bUpcoming) return -1;
    if (!aUpcoming && bUpcoming) return 1;

    const aDate = parseDeadline(a.dueDate).getTime();
    const bDate = parseDeadline(b.dueDate).getTime();
    return aDate - bDate;
  });

  const upcomingAssignments = normalized.filter((a) => isUpcomingAssignment(a));
  const submittedCount = normalized.filter((a) => a.status === 'submitted').length;
  const completedCount = normalized.filter((a) => a.status === 'completed' || a.status === 'graded').length;
  const overdueCount = normalized.filter((a) => a.status === 'overdue').length;

  const demoResult: AssignmentSyncResult = {
    success: true,
    assignments: normalized,
    upcomingAssignments,
    upcomingCount: upcomingAssignments.length,
    totalCount: normalized.length,
    submittedCount,
    completedCount,
    overdueCount,
    source: 'demo',
    lastSynced: nowStr,
  };

  assignmentCache.set(cacheKey, { timestamp: Date.now(), result: demoResult });
  return demoResult;
}

/**
 * Clears cached assignments for a user.
 */
export function clearAssignmentCache(session?: { mode?: string; username?: string } | null) {
  if (!session || !session.username) {
    assignmentCache.clear();
    return;
  }
  const cacheKey = `${session.mode || 'live'}_${session.username}`;
  assignmentCache.delete(cacheKey);
}

/**
 * Completely invalidates all in-memory assignment caches.
 */
export function clearAllAssignmentCaches(): void {
  assignmentCache.clear();
}

