import { cookies } from 'next/headers';
import { getSession } from './auth';
import {
  DEMO_PROFILE,
  DEMO_SUBJECTS,
  DEMO_TIMETABLE,
  DEMO_DAY_HISTORY,
  DEMO_ASSIGNMENTS,
  DEMO_MATERIALS,
  DEMO_RESULTS,
  DEMO_ASSESSMENT_RECORDS,
  DEMO_ANNOUNCEMENTS,
  DEMO_NOTIFICATIONS,
} from './demo-data';
import { calculateAttendanceSummary } from './attendance-calculator';
import { etlabFetchProfile, etlabFetchAttendance, etlabFetchResults } from './etlab-client';
import { normalizeStudentProfile, normalizeSubjectAttendance } from './course-catalog';
import { generateDynamicNotifications } from './notifications-service';
import { getCombinedAnnouncements, getCohortAnnouncements } from './announcements-service';
import { getSharedMaterials } from './materials-service';
import { getSynchronizedAssignments, AssignmentSyncResult } from './assignment-service';
import {
  StudentProfile,
  AttendanceSummary,
  TimetableSlot,
  DayAttendanceHistory,
  Assignment,
  StudyMaterial,
  SemesterResult,
  EtlabAssessmentRecord,
  Announcement,
  NotificationItem,
} from '@/types';

export interface DashboardData {
  mode: 'live' | 'demo';
  profile: StudentProfile;
  attendance: AttendanceSummary;
  timetable: TimetableSlot[];
  dayHistory: DayAttendanceHistory[];
  assignments: Assignment[];
  assignmentSyncResult?: AssignmentSyncResult;
  assignmentError?: string;
  upcomingAssignmentsCount: number;
  materials: StudyMaterial[];
  results: SemesterResult[];
  assessmentRecords: EtlabAssessmentRecord[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  lastSynced: string;
  targetPercentage: number;
}

export async function getDashboardData(targetPercentage?: number): Promise<DashboardData | null> {
  const session = await getSession();
  if (!session) {
    return null;
  }

  // Resolve target preference from cookie if not explicitly provided
  let effectiveTarget = targetPercentage;
  if (!effectiveTarget) {
    try {
      const cookieStore = await cookies();
      const userTargetCookie = session.username ? cookieStore.get(`etlab_target_${session.username}`) : undefined;
      const generalTargetCookie = cookieStore.get('etlab_target');
      const cookieVal = userTargetCookie?.value || generalTargetCookie?.value;
      if (cookieVal) {
        const parsed = parseFloat(cookieVal);
        if (!isNaN(parsed) && parsed >= 50 && parsed <= 100) {
          effectiveTarget = parsed;
        }
      }
    } catch {
      // Fallback in environments where cookies() isn't accessible
    }
  }
  if (!effectiveTarget) {
    effectiveTarget = 75;
  }

  const now = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  if (session.mode === 'live' && session.sessionId) {
    // Attempt live data retrieval
    try {
      let rawProfile = session.profile;
      if (!rawProfile) {
        const pResult = await etlabFetchProfile(session.sessionId);
        if (pResult.success && pResult.profile) {
          rawProfile = pResult.profile;
        }
      }

      const profile = normalizeStudentProfile(rawProfile || {
        ...DEMO_PROFILE,
        name: session.displayName || session.username,
        registerNo: session.username,
      });

      const attResult = await etlabFetchAttendance(session.sessionId, profile.semester || 3);
      const subjects = attResult.success && attResult.subjects && attResult.subjects.length > 0
        ? attResult.subjects.map(normalizeSubjectAttendance)
        : DEMO_SUBJECTS; // Graceful fallback if semester attendance table format differs

      const attendance = calculateAttendanceSummary(subjects, effectiveTarget);

      const asgSync = await getSynchronizedAssignments(session);
      const assignments = asgSync.assignments;
      const assignmentError = asgSync.error;
      const upcomingAssignmentsCount = asgSync.upcomingCount;

      const resResult = await etlabFetchResults(session.sessionId);
      const assessmentRecords = resResult.success && resResult.records && resResult.records.length > 0
        ? resResult.records
        : DEMO_ASSESSMENT_RECORDS;

      const cohortAnnouncements = await getCohortAnnouncements();
      const sharedMaterials = await getSharedMaterials();
      const announcements = await getCombinedAnnouncements(DEMO_ANNOUNCEMENTS);
      const notifications = await generateDynamicNotifications({
        username: session.username,
        subjects: attendance.subjects,
        assignments,
        cohortAnnouncements,
        sharedMaterials,
        targetPercentage: effectiveTarget,
      });

      return {
        mode: 'live',
        profile,
        attendance,
        timetable: DEMO_TIMETABLE,
        dayHistory: DEMO_DAY_HISTORY,
        assignments,
        assignmentSyncResult: asgSync,
        assignmentError,
        upcomingAssignmentsCount,
        materials: [],   // In live mode, strictly return verified semester materials (no silent demo fallback)
        results: DEMO_RESULTS,
        assessmentRecords,
        announcements,
        notifications,
        lastSynced: now,
        targetPercentage: effectiveTarget,
      };
    } catch {
      // In case of upstream parsing failure, return session-linked normalized state
      const profile = normalizeStudentProfile(session.profile || {
        ...DEMO_PROFILE,
        name: session.displayName || session.username,
        registerNo: session.username,
      });
      const attendance = calculateAttendanceSummary(DEMO_SUBJECTS, effectiveTarget);
      const cohortAnnouncements = await getCohortAnnouncements();
      const sharedMaterials = await getSharedMaterials();
      const announcements = await getCombinedAnnouncements(DEMO_ANNOUNCEMENTS);
      const notifications = await generateDynamicNotifications({
        username: session.username,
        subjects: attendance.subjects,
        assignments: [],
        cohortAnnouncements,
        sharedMaterials,
        targetPercentage: effectiveTarget,
      });

      return {
        mode: 'live',
        profile,
        attendance,
        timetable: DEMO_TIMETABLE,
        dayHistory: DEMO_DAY_HISTORY,
        assignments: [], // In live mode, never return synthetic demo assignments on error
        assignmentError: 'Unable to synchronize assignments from ETLAB portal.',
        upcomingAssignmentsCount: 0,
        materials: [],
        results: DEMO_RESULTS,
        assessmentRecords: DEMO_ASSESSMENT_RECORDS,
        announcements,
        notifications,
        lastSynced: now,
        targetPercentage: effectiveTarget,
      };
    }
  }

  // Demo mode
  const profile = normalizeStudentProfile(DEMO_PROFILE);
  const attendance = calculateAttendanceSummary(DEMO_SUBJECTS, effectiveTarget);
  const asgSync = await getSynchronizedAssignments(session);
  const assignments = asgSync.assignments;
  const upcomingAssignmentsCount = asgSync.upcomingCount;

  const cohortAnnouncements = await getCohortAnnouncements();
  const sharedMaterials = await getSharedMaterials();
  const announcements = await getCombinedAnnouncements(DEMO_ANNOUNCEMENTS);
  const notifications = await generateDynamicNotifications({
    username: session.username,
    subjects: attendance.subjects,
    assignments,
    cohortAnnouncements,
    sharedMaterials,
    targetPercentage: effectiveTarget,
  });

  return {
    mode: 'demo',
    profile,
    attendance,
    timetable: DEMO_TIMETABLE,
    dayHistory: DEMO_DAY_HISTORY,
    assignments,
    assignmentSyncResult: asgSync,
    upcomingAssignmentsCount,
    materials: DEMO_MATERIALS,
    results: DEMO_RESULTS,
    assessmentRecords: DEMO_ASSESSMENT_RECORDS,
    announcements,
    notifications,
    lastSynced: now,
    targetPercentage: effectiveTarget,
  };
}
