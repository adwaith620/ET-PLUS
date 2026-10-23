import { cache } from 'react';
import { cookies } from 'next/headers';
import { getSession, destroySession } from './auth';
import {
  DEMO_PROFILE,
  DEMO_PROFILE_B,
  DEMO_SUBJECTS,
  DEMO_TIMETABLE,
  DEMO_DAY_HISTORY,
  DEMO_MATERIALS,
  DEMO_RESULTS,
  DEMO_ASSESSMENT_RECORDS,
  DEMO_ANNOUNCEMENTS,
} from './demo-data';
import { calculateAttendanceSummary } from './attendance-calculator';
import { etlabFetchProfile, etlabFetchAttendance, etlabFetchResults } from './etlab-client';
import { normalizeStudentProfile, normalizeSubjectAttendance } from './course-catalog';
import { generateDynamicNotifications } from './notifications-service';
import { getCombinedAnnouncements, getCohortAnnouncements } from './announcements-service';
import { getSharedMaterials, getCombinedMaterials } from './materials-service';
import { getSynchronizedAssignments, AssignmentSyncResult } from './assignment-service';
import {
  getCachedStudentData,
  setCachedStudentData,
  deduplicateRequest,
  invalidateStudentCache,
} from './cache';
import type {
  StudentProfile,
  AttendanceSummary,
  SubjectAttendanceData,
  TimetableSlot,
  DayAttendanceHistory,
  Assignment,
  StudyMaterial,
  SemesterResult,
  EtlabAssessmentRecord,
  Announcement,
  NotificationItem,
} from '../types/index.ts';

export { invalidateStudentCache, setCachedStudentData, getCachedStudentData };

export interface DashboardData {
  mode: 'live' | 'demo';
  profile: StudentProfile;
  attendance: AttendanceSummary;
  attendanceError?: string;
  timetable: TimetableSlot[];
  dayHistory: DayAttendanceHistory[];
  assignments: Assignment[];
  assignmentSyncResult?: AssignmentSyncResult;
  assignmentError?: string;
  upcomingAssignmentsCount: number;
  materials: StudyMaterial[];
  results: SemesterResult[];
  assessmentRecords: EtlabAssessmentRecord[];
  resultsError?: string;
  announcements: Announcement[];
  notifications: NotificationItem[];
  lastSynced: string;
  targetPercentage: number;
}

export interface DashboardShellData {
  profile: StudentProfile;
  mode: 'live' | 'demo';
  overallPercentage?: number;
  hasShortage: boolean;
  lastSynced: string;
  notifications: NotificationItem[];
  targetPercentage: number;
  pendingAssignmentsCount: number;
}

async function resolveEffectiveTarget(username?: string, targetPercentage?: number): Promise<number> {
  if (typeof targetPercentage === 'number' && !isNaN(targetPercentage) && targetPercentage > 0 && targetPercentage <= 100) {
    return targetPercentage;
  }

  try {
    const cookieStore = await cookies();
    const userTargetCookie = username ? cookieStore.get(`etlab_target_${username}`) : undefined;
    const generalTargetCookie = cookieStore.get('etlab_target');
    const cookieVal = userTargetCookie?.value || generalTargetCookie?.value;
    if (cookieVal) {
      const parsed = parseFloat(cookieVal);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
        return parsed;
      }
    }
  } catch {
    // Fallback when cookies() is unavailable
  }

  return 75;
}

/**
 * Retrieves complete dashboard data with per-request React memoization,
 * in-flight request deduplication, and student-scoped caching.
 */
export const getDashboardData = cache(async function getDashboardData(
  targetPercentage?: number,
  forceRefresh: boolean = false
): Promise<DashboardData | null> {
  const session = await getSession();
  if (!session) return null;

  const effectiveTarget = await resolveEffectiveTarget(session.username, targetPercentage);

  // Check student-scoped cache first if not explicitly forced to refresh
  if (!forceRefresh) {
    const cached = getCachedStudentData<DashboardData>(session.username, `dashboardData_${effectiveTarget}`);
    if (cached) {
      return cached;
    }
  }

  // Deduplicate identical in-flight server requests for the same student
  const dedupeKey = `${session.username}::dashboardData::${effectiveTarget}`;
  return deduplicateRequest(dedupeKey, async () => {
    const now = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    if (session.mode === 'live' && session.sessionId) {
      try {
        let rawProfile = session.profile;
        if (!rawProfile) {
          const pResult = await etlabFetchProfile(session.sessionId);
          if (pResult.success && pResult.profile) {
            rawProfile = pResult.profile;
          }
        }

        const profile = normalizeStudentProfile(rawProfile || {
          name: session.displayName || session.username,
          admissionNo: session.username,
          registerNo: session.username,
        });

        // Parallelize independent ETLAB attendance and assignment synchronization
        // (Examination results are loaded on-demand by /dashboard/results)
        const [attResult, asgSync, cohortAnnouncements, sharedMaterials] = await Promise.all([
          etlabFetchAttendance(session.sessionId, profile.semester || 3),
          getSynchronizedAssignments(session, forceRefresh),
          getCohortAnnouncements(),
          getSharedMaterials(),
        ]);

        let subjects: SubjectAttendanceData[] = [];
        let attendanceError: string | undefined;

        if (attResult.success && attResult.subjects && attResult.subjects.length > 0) {
          subjects = attResult.subjects.map(normalizeSubjectAttendance);
        } else if (!attResult.success) {
          if (attResult.error?.toLowerCase().includes('session expired') || attResult.error?.toLowerCase().includes('login')) {
            invalidateStudentCache(session.username);
            await destroySession();
            return null;
          }
          attendanceError = attResult.error || 'Attendance records unavailable or not yet published on ETLAB.';
        }
        const attendance = calculateAttendanceSummary(subjects, effectiveTarget);

        const assignments = asgSync.assignments;
        const assignmentError = asgSync.error;
        const upcomingAssignmentsCount = asgSync.upcomingCount;

        const results: SemesterResult[] = [];
        const assessmentRecords: EtlabAssessmentRecord[] = [];
        const announcements = await getCombinedAnnouncements(DEMO_ANNOUNCEMENTS);
        const notifications = await generateDynamicNotifications({
          username: session.username,
          subjects: attendance.subjects,
          assignments,
          cohortAnnouncements,
          sharedMaterials,
          targetPercentage: effectiveTarget,
        });

        const isSyncSuccessful = attResult.success && subjects.length > 0;
        const lastSynced = isSyncSuccessful ? now : '';

        const dashboardResult: DashboardData = {
          mode: 'live',
          profile,
          attendance,
          attendanceError,
          timetable: DEMO_TIMETABLE,
          dayHistory: DEMO_DAY_HISTORY,
          assignments,
          assignmentSyncResult: asgSync,
          assignmentError,
          upcomingAssignmentsCount,
          materials: sharedMaterials,
          results,
          assessmentRecords,
          resultsError: undefined,
          announcements,
          notifications,
          lastSynced,
          targetPercentage: effectiveTarget,
        };

        // Cache student data only when successful to prevent caching stale failure states
        if (isSyncSuccessful) {
          setCachedStudentData(session.username, `dashboardData_${effectiveTarget}`, dashboardResult);
          setCachedStudentData(session.username, `attendance_${effectiveTarget}`, attendance);
        }
        setCachedStudentData(session.username, 'assignments', assignments);

        return dashboardResult;
      } catch {
        const profile = normalizeStudentProfile(session.profile || {
          name: session.displayName || session.username,
          admissionNo: session.username,
          registerNo: session.username,
        });
        const attendance = calculateAttendanceSummary([], effectiveTarget);
        const [cohortAnnouncements, sharedMaterials] = await Promise.all([
          getCohortAnnouncements(),
          getSharedMaterials(),
        ]);
        const announcements = await getCombinedAnnouncements(DEMO_ANNOUNCEMENTS);
        const notifications = await generateDynamicNotifications({
          username: session.username,
          subjects: [],
          assignments: [],
          cohortAnnouncements,
          sharedMaterials,
          targetPercentage: effectiveTarget,
        });

        return {
          mode: 'live',
          profile,
          attendance,
          attendanceError: 'Unable to synchronize attendance from ETLAB portal.',
          timetable: DEMO_TIMETABLE,
          dayHistory: DEMO_DAY_HISTORY,
          assignments: [],
          assignmentError: 'Unable to synchronize assignments from ETLAB portal.',
          upcomingAssignmentsCount: 0,
          materials: [],
          results: [],
          assessmentRecords: [],
          resultsError: 'Unable to synchronize examination records from ETLAB portal.',
          announcements,
          notifications,
          lastSynced: '',
          targetPercentage: effectiveTarget,
        };
      }
    }

    // Demo mode: Strict isolation between Account A and Account B
    const isStudentB =
      session.username === '25CTA99' ||
      session.username === 'demo-b' ||
      session.username === 'student-b' ||
      session.displayName?.toLowerCase().includes('kavya');

    const activeProfile = isStudentB ? DEMO_PROFILE_B : DEMO_PROFILE;
    const profile = normalizeStudentProfile(session.profile || activeProfile);

    const [asgSync, cohortAnnouncements, sharedMaterials] = await Promise.all([
      getSynchronizedAssignments(session, forceRefresh),
      getCohortAnnouncements(),
      getSharedMaterials(),
    ]);

    const demoSubjects = isStudentB ? [] : DEMO_SUBJECTS;
    const attendance = calculateAttendanceSummary(demoSubjects, effectiveTarget);
    const assignments = asgSync.assignments;
    const upcomingAssignmentsCount = asgSync.upcomingCount;

    const announcements = await getCombinedAnnouncements(DEMO_ANNOUNCEMENTS);
    const notifications = await generateDynamicNotifications({
      username: session.username,
      subjects: attendance.subjects,
      assignments,
      cohortAnnouncements,
      sharedMaterials,
      targetPercentage: effectiveTarget,
    });

    const demoResults = isStudentB ? [] : DEMO_RESULTS;
    const demoAssessmentRecords = isStudentB ? [] : DEMO_ASSESSMENT_RECORDS;

    const demoResult: DashboardData = {
      mode: 'demo',
      profile,
      attendance,
      timetable: DEMO_TIMETABLE,
      dayHistory: DEMO_DAY_HISTORY,
      assignments,
      assignmentSyncResult: asgSync,
      upcomingAssignmentsCount,
      materials: isStudentB ? [] : DEMO_MATERIALS,
      results: demoResults,
      assessmentRecords: demoAssessmentRecords,
      announcements,
      notifications,
      lastSynced: now,
      targetPercentage: effectiveTarget,
    };

    setCachedStudentData(session.username, `dashboardData_${effectiveTarget}`, demoResult);
    setCachedStudentData(session.username, `attendance_${effectiveTarget}`, attendance);
    setCachedStudentData(session.username, 'assignments', assignments);
    setCachedStudentData(session.username, 'results', demoResults);
    setCachedStudentData(session.username, 'assessmentRecords', demoAssessmentRecords);

    return demoResult;
  });
});

/**
 * Shell-optimized data provider for DashboardLayout.
 * Avoids loading examination results, materials, or heavy records unnecessary for the outer shell.
 */
export const getDashboardShellData = cache(async function getDashboardShellData(): Promise<DashboardShellData | null> {
  const session = await getSession();
  if (!session) return null;

  const effectiveTarget = await resolveEffectiveTarget(session.username);

  // If full dashboardData is already in cache, reuse it directly
  const cachedFull = getCachedStudentData<DashboardData>(session.username, `dashboardData_${effectiveTarget}`);
  if (cachedFull) {
    const hasAttendance = cachedFull.attendance && cachedFull.attendance.totalConducted > 0;
    const overallPercentage = hasAttendance ? cachedFull.attendance.overallPercentage : undefined;
    const hasShortage = typeof overallPercentage === 'number' ? overallPercentage < effectiveTarget : false;

    return {
      profile: cachedFull.profile,
      mode: cachedFull.mode,
      overallPercentage,
      hasShortage,
      lastSynced: cachedFull.lastSynced || 'Sync pending',
      notifications: cachedFull.notifications || [],
      targetPercentage: effectiveTarget,
      pendingAssignmentsCount: cachedFull.upcomingAssignmentsCount,
    };
  }

  // Obtain authoritative dashboard data directly (memoized per-request by React cache)
  const dashboardData = await getDashboardData(effectiveTarget);
  if (!dashboardData) return null;

  const hasAttendance = dashboardData.attendance && dashboardData.attendance.totalConducted > 0;
  const overallPercentage = hasAttendance ? dashboardData.attendance.overallPercentage : undefined;
  const hasShortage = typeof overallPercentage === 'number' ? overallPercentage < effectiveTarget : false;

  return {
    profile: dashboardData.profile,
    mode: dashboardData.mode,
    overallPercentage,
    hasShortage,
    lastSynced: dashboardData.lastSynced || 'Sync pending',
    notifications: dashboardData.notifications || [],
    targetPercentage: effectiveTarget,
    pendingAssignmentsCount: dashboardData.upcomingAssignmentsCount,
  };
});

/**
 * Targeted data fetcher for the Attendance page.
 * Loads only attendance records without waiting for assignments or results.
 */
export const getAttendancePageData = cache(async function getAttendancePageData(
  targetPercentage?: number,
  forceRefresh: boolean = false
) {
  const session = await getSession();
  if (!session) return null;

  const effectiveTarget = await resolveEffectiveTarget(session.username, targetPercentage);
  const now = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  if (!forceRefresh) {
    // Check cache
    const cachedAttendance = getCachedStudentData<AttendanceSummary>(session.username, `attendance_${effectiveTarget}`);
    if (cachedAttendance) {
      return {
        attendance: cachedAttendance,
        timetable: DEMO_TIMETABLE,
        mode: session.mode,
        lastSynced: 'Just now',
        syncSuccess: true,
      };
    }

    // If full dashboard data is available, reuse it
    const cachedFull = getCachedStudentData<DashboardData>(session.username, `dashboardData_${effectiveTarget}`);
    if (cachedFull) {
      return {
        attendance: cachedFull.attendance,
        timetable: cachedFull.timetable,
        mode: cachedFull.mode,
        lastSynced: cachedFull.lastSynced || 'Just now',
        syncSuccess: true,
      };
    }
  }

  if (session.mode === 'live' && session.sessionId) {
    try {
      const attResult = await etlabFetchAttendance(session.sessionId, session.profile?.semester || 3);
      if (!attResult.success && (attResult.error?.toLowerCase().includes('session expired') || attResult.error?.toLowerCase().includes('login'))) {
        invalidateStudentCache(session.username);
        await destroySession();
        return null;
      }
      let subjects: SubjectAttendanceData[] = [];
      if (attResult.success && attResult.subjects) {
        subjects = attResult.subjects.map(normalizeSubjectAttendance);
      }
      const summary = calculateAttendanceSummary(subjects, effectiveTarget);
      if (attResult.success && subjects.length > 0) {
        setCachedStudentData(session.username, `attendance_${effectiveTarget}`, summary);
      }
      return {
        attendance: summary,
        timetable: DEMO_TIMETABLE,
        mode: 'live' as const,
        attendanceError: attResult.success ? undefined : attResult.error,
        lastSynced: attResult.success ? now : 'Unavailable',
        syncSuccess: attResult.success,
      };
    } catch {
      return {
        attendance: calculateAttendanceSummary([], effectiveTarget),
        timetable: DEMO_TIMETABLE,
        mode: 'live' as const,
        attendanceError: 'Unable to synchronize attendance from ETLAB.',
        lastSynced: 'Unavailable',
        syncSuccess: false,
      };
    }
  }

  // Demo mode
  const isStudentB = session.username === '25CTA99' || session.username === 'demo-b';
  const subjects = isStudentB ? [] : DEMO_SUBJECTS;
  const summary = calculateAttendanceSummary(subjects, effectiveTarget);
  setCachedStudentData(session.username, `attendance_${effectiveTarget}`, summary);
  return {
    attendance: summary,
    timetable: DEMO_TIMETABLE,
    mode: 'demo' as const,
    lastSynced: now,
    syncSuccess: true,
  };
});

/**
 * Instant static timetable data provider.
 * Completely eliminates server roundtrips and ETLAB calls.
 */
export function getTimetablePageData() {
  return {
    timetable: DEMO_TIMETABLE,
    dayHistory: DEMO_DAY_HISTORY,
  };
}

/**
 * Targeted data fetcher for the Assignments page.
 */
export const getAssignmentsPageData = cache(async function getAssignmentsPageData(forceRefresh: boolean = false) {
  const session = await getSession();
  if (!session) return null;

  const sync = await getSynchronizedAssignments(session, forceRefresh);
  return {
    assignments: sync.assignments,
    mode: sync.source,
    syncError: sync.error,
    lastSynced: sync.lastSynced,
    upcomingCount: sync.upcomingCount,
  };
});

/**
 * Targeted data fetcher for the Study Materials page.
 * Loads materials instantly from disk/memory without touching external portals.
 */
export const getMaterialsPageData = cache(async function getMaterialsPageData() {
  const session = await getSession();
  if (!session) return null;

  const isStudentB = session.username === '25CTA99' || session.username === 'demo-b';
  const baseMaterials = session.mode === 'live' || isStudentB ? [] : DEMO_MATERIALS;
  const combined = await getCombinedMaterials(baseMaterials);

  return {
    materials: combined,
    currentUserName: session.displayName || session.username,
    currentUsername: session.username,
  };
});

/**
 * Targeted data fetcher for the Results page.
 * Fetches only examination results and internal assessment records.
 */
export const getResultsPageData = cache(async function getResultsPageData() {
  const session = await getSession();
  if (!session) return null;

  // Check cache
  const cachedResults = getCachedStudentData<SemesterResult[]>(session.username, 'results');
  const cachedRecords = getCachedStudentData<EtlabAssessmentRecord[]>(session.username, 'assessmentRecords');
  if (cachedResults && cachedRecords) {
    return {
      results: cachedResults,
      assessmentRecords: cachedRecords,
      resultsError: undefined,
      mode: session.mode,
    };
  }

  if (session.mode === 'live' && session.sessionId) {
    const res = await etlabFetchResults(session.sessionId);
    const records = res.success && res.records ? res.records : [];
    const results: SemesterResult[] = [];
    const error = res.success ? undefined : (res.error || 'Unable to retrieve examination results.');

    if (res.success) {
      setCachedStudentData(session.username, 'results', results);
      setCachedStudentData(session.username, 'assessmentRecords', records);
    }

    return {
      results,
      assessmentRecords: records,
      resultsError: error,
      mode: 'live' as const,
    };
  }

  // Demo mode
  const isStudentB = session.username === '25CTA99' || session.username === 'demo-b';
  const results = isStudentB ? [] : DEMO_RESULTS;
  const assessmentRecords = isStudentB ? [] : DEMO_ASSESSMENT_RECORDS;

  setCachedStudentData(session.username, 'results', results);
  setCachedStudentData(session.username, 'assessmentRecords', assessmentRecords);

  return {
    results,
    assessmentRecords,
    resultsError: undefined,
    mode: 'demo' as const,
  };
});

/**
 * Targeted data fetcher for the Announcements page.
 */
export const getAnnouncementsPageData = cache(async function getAnnouncementsPageData() {
  const session = await getSession();
  if (!session) return null;

  const combined = await getCombinedAnnouncements(DEMO_ANNOUNCEMENTS);
  return {
    announcements: combined,
    currentUsername: session.username,
    currentUserName: session.displayName || session.username,
  };
});

/**
 * Targeted data fetcher for the Student Profile page.
 */
export const getProfilePageData = cache(async function getProfilePageData() {
  const session = await getSession();
  if (!session) return null;

  if (session.profile) {
    return {
      profile: normalizeStudentProfile(session.profile),
      mode: session.mode,
    };
  }

  if (session.mode === 'live' && session.sessionId) {
    const pResult = await etlabFetchProfile(session.sessionId);
    const profile = normalizeStudentProfile(pResult.profile || {
      name: session.displayName || session.username,
      admissionNo: session.username,
      registerNo: session.username,
    });
    return { profile, mode: 'live' as const };
  }

  const isStudentB = session.username === '25CTA99' || session.username === 'demo-b';
  const profile = normalizeStudentProfile(isStudentB ? DEMO_PROFILE_B : DEMO_PROFILE);
  return { profile, mode: 'demo' as const };
});
