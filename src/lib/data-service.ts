import { cookies } from 'next/headers';
import { getSession } from './auth';
import {
  DEMO_PROFILE,
  DEMO_PROFILE_B,
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
  SubjectAttendanceData,
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
        name: session.displayName || session.username,
        admissionNo: session.username,
        registerNo: session.username,
      });

      const attResult = await etlabFetchAttendance(session.sessionId, profile.semester || 3);
      let subjects: SubjectAttendanceData[] = [];
      let attendanceError: string | undefined;

      if (attResult.success && attResult.subjects && attResult.subjects.length > 0) {
        subjects = attResult.subjects.map(normalizeSubjectAttendance);
      } else if (!attResult.success) {
        attendanceError = attResult.error || 'Attendance records unavailable or not yet published on ETLAB.';
      }
      const attendance = calculateAttendanceSummary(subjects, effectiveTarget);

      const asgSync = await getSynchronizedAssignments(session);
      const assignments = asgSync.assignments;
      const assignmentError = asgSync.error;
      const upcomingAssignmentsCount = asgSync.upcomingCount;

      const resResult = await etlabFetchResults(session.sessionId);
      let assessmentRecords: EtlabAssessmentRecord[] = [];
      let resultsError: string | undefined;

      if (resResult.success && resResult.records) {
        assessmentRecords = resResult.records;
      } else if (!resResult.success) {
        resultsError = resResult.error || 'Unable to retrieve examination results from ETLAB.';
      }

      // Live semester results: strictly isolated to currently authenticated student (never return DEMO_RESULTS)
      const results: SemesterResult[] = [];

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
        attendanceError,
        timetable: DEMO_TIMETABLE,
        dayHistory: DEMO_DAY_HISTORY,
        assignments,
        assignmentSyncResult: asgSync,
        assignmentError,
        upcomingAssignmentsCount,
        materials: [],   // In live mode, strictly return verified semester materials (no silent demo fallback)
        results,
        assessmentRecords,
        resultsError,
        announcements,
        notifications,
        lastSynced: now,
        targetPercentage: effectiveTarget,
      };
    } catch {
      // In case of upstream parsing failure, return session-linked isolated state
      const profile = normalizeStudentProfile(session.profile || {
        name: session.displayName || session.username,
        admissionNo: session.username,
        registerNo: session.username,
      });
      const attendance = calculateAttendanceSummary([], effectiveTarget);
      const cohortAnnouncements = await getCohortAnnouncements();
      const sharedMaterials = await getSharedMaterials();
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
        lastSynced: now,
        targetPercentage: effectiveTarget,
      };
    }
  }

  // Demo mode: Strict isolation between Account A (Primary Demo) and Account B (Controlled Test Fixture)
  const isStudentB =
    session.username === '25CTA99' ||
    session.username === 'demo-b' ||
    session.username === 'student-b' ||
    session.displayName?.toLowerCase().includes('kavya');

  const activeProfile = isStudentB ? DEMO_PROFILE_B : DEMO_PROFILE;
  const profile = normalizeStudentProfile(session.profile || activeProfile);

  const demoSubjects = isStudentB ? [] : DEMO_SUBJECTS;
  const attendance = calculateAttendanceSummary(demoSubjects, effectiveTarget);

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

  // Account B has zero Account A results (isolated test fixture)
  const demoResults = isStudentB ? [] : DEMO_RESULTS;
  const demoAssessmentRecords = isStudentB ? [] : DEMO_ASSESSMENT_RECORDS;

  return {
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
}
