import type {
  StudentProfile,
  SubjectAttendanceData,
  AttendanceSummary,
  EtlabAssessmentRecord,
  SemesterResult,
  AcademicStanding,
  AcademicSourceHealth,
  AcademicSourceType,
} from '../types/index.ts';
import { etlabFetchProfile, etlabFetchAttendance, etlabFetchResults } from './etlab-client.ts';
import {
  fetchStudentsEtlabProfile,
  fetchStudentsEtlabAttendance,
  fetchStudentsEtlabInternalMarks,
  fetchStudentsEtlabKtuResults,
} from './students-etlab-client.ts';
import { normalizeSubjectAttendance, matchApprovedCourse } from './course-catalog.ts';
import { calculateAttendanceSummary } from './attendance-calculator.ts';
import { DEFAULT_INSTITUTION } from './institution-config.ts';

export interface UnifiedResultsOutput {
  assessmentRecords: EtlabAssessmentRecord[];
  semesterResults: SemesterResult[];
  academicStanding?: AcademicStanding;
  sourceHealth: AcademicSourceHealth;
  resultsError?: string;
}

export interface UnifiedAttendanceOutput {
  attendance: AttendanceSummary;
  sourceHealth: AcademicSourceHealth;
  attendanceError?: string;
  authoritativeSource: AcademicSourceType;
}

/**
 * Validates that two student identities match before merging.
 * If identities conflict (e.g. different admission numbers), merging is stopped
 * to strictly prevent cross-student record contamination.
 */
export function verifyIdentityConsistency(
  profile1?: StudentProfile | null,
  profile2?: StudentProfile | null
): boolean {
  if (!profile1 || !profile2) return true;

  const adm1 = (profile1.admissionNo || '').trim().toLowerCase();
  const adm2 = (profile2.admissionNo || '').trim().toLowerCase();

  if (adm1 && adm2 && adm1 !== adm2) {
    return false; // Mismatch detected!
  }

  return true;
}

/**
 * Consolidates results from Source 1 (ETLAB Classic) and Source 2 (Students ETLAB).
 * - Source 1: Series Exams, Lab Internal Evaluations, Sessional exams.
 * - Source 2: Continuous Assessment (CIA / Internal Marks) and KTU university SGPA/CGPA.
 * - Conflict resolution: deduplicates records by normalized subject code and exam category.
 * - Bounded timeouts: if one source fails, the other source provides partial data with attribution.
 */
export async function getUnifiedResults(
  session: {
    sessionId?: string;
    studentsToken?: string;
    username: string;
    instituteId?: string;
  }
): Promise<UnifiedResultsOutput> {
  const instituteId = session.instituteId || DEFAULT_INSTITUTION.id;
  const sourceHealth: AcademicSourceHealth = {
    etlabClassic: { connected: false },
    studentsEtlab: { connected: false },
    primarySource: 'unified',
    lastUpdated: new Date().toLocaleTimeString('en-IN'),
  };

  const recordsMap = new Map<string, EtlabAssessmentRecord>();
  let semesterResults: SemesterResult[] = [];
  let academicStanding: AcademicStanding | undefined = undefined;
  const errors: string[] = [];

  // Parallel fetch from both sources
  const [s1Result, s2InternalResult, s2KtuResult] = await Promise.allSettled([
    session.sessionId ? etlabFetchResults(session.sessionId) : Promise.resolve(null),
    session.studentsToken ? fetchStudentsEtlabInternalMarks(session.studentsToken, undefined, instituteId) : Promise.resolve([]),
    session.studentsToken
      ? fetchStudentsEtlabKtuResults(session.studentsToken, undefined, instituteId)
      : Promise.resolve<{ standing?: AcademicStanding; semesterResults: SemesterResult[] }>({ semesterResults: [] }),
  ]);

  // Process Source 1 (ETLAB Classic)
  if (s1Result.status === 'fulfilled' && s1Result.value) {
    const val = s1Result.value;
    if (val.success && val.records) {
      sourceHealth.etlabClassic.connected = true;
      for (const rec of val.records) {
        const canonical = matchApprovedCourse(rec.subjectCode) || matchApprovedCourse(rec.subjectName);
        const code = canonical ? canonical.courseCode : rec.subjectCode;
        const key = `${code}_${rec.category}_${rec.examName}`.toLowerCase();
        recordsMap.set(key, {
          ...rec,
          subjectCode: code,
          subjectName: canonical ? canonical.courseName : rec.subjectName,
          source: 'etlab_classic',
          sourceLabel: 'ETLAB Classic',
        });
      }
    } else if (val.error) {
      sourceHealth.etlabClassic.error = val.error;
      errors.push(`ETLAB Classic: ${val.error}`);
    }
  } else if (s1Result.status === 'rejected') {
    sourceHealth.etlabClassic.error = 'Connection to ETLAB Classic failed.';
  }

  // Process Source 2 (Students ETLAB - Internal Marks)
  if (s2InternalResult.status === 'fulfilled') {
    const internalRecords = s2InternalResult.value || [];
    if (internalRecords.length > 0) {
      sourceHealth.studentsEtlab.connected = true;
      for (const rec of internalRecords) {
        const canonical = matchApprovedCourse(rec.subjectCode) || matchApprovedCourse(rec.subjectName);
        const code = canonical ? canonical.courseCode : rec.subjectCode;
        const key = `${code}_${rec.category}_${rec.examName}`.toLowerCase();
        // Do not overwrite an existing record if already provided with higher fidelity,
        // but add new internal marks
        if (!recordsMap.has(key)) {
          recordsMap.set(key, {
            ...rec,
            subjectCode: code,
            subjectName: canonical ? canonical.courseName : rec.subjectName,
            source: 'students_etlab',
            sourceLabel: 'Students ETLAB',
          });
        }
      }
    }
  }

  // Process Source 2 (Students ETLAB - KTU University Results & CGPA)
  if (s2KtuResult.status === 'fulfilled') {
    const ktuData = s2KtuResult.value;
    if (ktuData) {
      sourceHealth.studentsEtlab.connected = true;
      if ('standing' in ktuData && ktuData.standing) {
        academicStanding = ktuData.standing;
      }
      if ('semesterResults' in ktuData && ktuData.semesterResults && ktuData.semesterResults.length > 0) {
        semesterResults = ktuData.semesterResults;
      }
    }
  }

  // Determine overall primary source
  if (sourceHealth.etlabClassic.connected && sourceHealth.studentsEtlab.connected) {
    sourceHealth.primarySource = 'unified';
  } else if (sourceHealth.studentsEtlab.connected) {
    sourceHealth.primarySource = 'students_etlab';
  } else if (sourceHealth.etlabClassic.connected) {
    sourceHealth.primarySource = 'etlab_classic';
  }

  const assessmentRecords = Array.from(recordsMap.values());
  const hasData = assessmentRecords.length > 0 || semesterResults.length > 0 || academicStanding !== undefined;
  const resultsError = !hasData && errors.length > 0 ? errors.join(' • ') : undefined;

  return {
    assessmentRecords,
    semesterResults,
    academicStanding,
    sourceHealth,
    resultsError,
  };
}

/**
 * Consolidates attendance from Source 1 and Source 2.
 * - Checks both sources independently.
 * - Avoids double-counting hours.
 * - Prevents conflicting data by using Source 1 as authoritative for raw attended/total hours,
 *   with fallback to Source 2 when Source 1 is unavailable.
 */
export async function getUnifiedAttendance(
  session: {
    sessionId?: string;
    studentsToken?: string;
    username: string;
    instituteId?: string;
    semester?: number;
  },
  targetPercentage: number = 75
): Promise<UnifiedAttendanceOutput> {
  const instituteId = session.instituteId || DEFAULT_INSTITUTION.id;
  const semester = session.semester || 3;

  const sourceHealth: AcademicSourceHealth = {
    etlabClassic: { connected: false },
    studentsEtlab: { connected: false },
    primarySource: 'unified',
    lastUpdated: new Date().toLocaleTimeString('en-IN'),
  };

  const [s1Result, s2Result] = await Promise.allSettled([
    session.sessionId ? etlabFetchAttendance(session.sessionId, semester) : Promise.resolve(null),
    session.studentsToken ? fetchStudentsEtlabAttendance(session.studentsToken, semester, instituteId) : Promise.resolve([]),
  ]);

  let authoritativeSource: AcademicSourceType = 'etlab_classic';
  let subjects: SubjectAttendanceData[] = [];
  let attendanceError: string | undefined = undefined;

  // Prefer Source 1 (ETLAB Classic) as primary for institutional attendance
  if (s1Result.status === 'fulfilled' && s1Result.value && s1Result.value.success) {
    sourceHealth.etlabClassic.connected = true;
    authoritativeSource = 'etlab_classic';
    subjects = (s1Result.value.subjects || []).map((s) => ({
      ...normalizeSubjectAttendance(s),
      source: 'etlab_classic' as const,
      sourceLabel: 'ETLAB Classic',
    }));
  } else {
    if (s1Result.status === 'fulfilled' && s1Result.value && s1Result.value.error) {
      sourceHealth.etlabClassic.error = s1Result.value.error;
    }

    // Fallback to Source 2 (Students ETLAB)
    if (s2Result.status === 'fulfilled' && s2Result.value && s2Result.value.length > 0) {
      sourceHealth.studentsEtlab.connected = true;
      authoritativeSource = 'students_etlab';
      subjects = s2Result.value.map((s) => ({
        ...normalizeSubjectAttendance(s),
        source: 'students_etlab' as const,
        sourceLabel: 'Students ETLAB',
      }));
    } else {
      attendanceError = 'Unable to synchronize attendance from ETLAB portals.';
    }
  }

  // Update source health
  if (s2Result.status === 'fulfilled' && s2Result.value && s2Result.value.length > 0) {
    sourceHealth.studentsEtlab.connected = true;
  }

  if (sourceHealth.etlabClassic.connected && sourceHealth.studentsEtlab.connected) {
    sourceHealth.primarySource = 'unified';
  } else if (sourceHealth.studentsEtlab.connected) {
    sourceHealth.primarySource = 'students_etlab';
  } else {
    sourceHealth.primarySource = 'etlab_classic';
  }

  const attendance = calculateAttendanceSummary(subjects, targetPercentage);

  return {
    attendance,
    sourceHealth,
    attendanceError,
    authoritativeSource,
  };
}

/**
 * Consolidates student profile from both sources.
 * Validates identity consistency before combining fields.
 */
export async function getUnifiedProfile(
  session: {
    sessionId?: string;
    studentsToken?: string;
    username: string;
    instituteId?: string;
    existingProfile?: StudentProfile;
  }
): Promise<{ profile: StudentProfile; sourceHealth: AcademicSourceHealth }> {
  const instituteId = session.instituteId || DEFAULT_INSTITUTION.id;
  const sourceHealth: AcademicSourceHealth = {
    etlabClassic: { connected: false },
    studentsEtlab: { connected: false },
    primarySource: 'unified',
  };

  let p1: StudentProfile | null = session.existingProfile || null;
  let p2: StudentProfile | null = null;

  const [s1Result, s2Result] = await Promise.allSettled([
    !p1 && session.sessionId ? etlabFetchProfile(session.sessionId) : Promise.resolve(p1 ? { success: true, profile: p1 } : null),
    session.studentsToken ? fetchStudentsEtlabProfile(session.studentsToken, instituteId) : Promise.resolve(null),
  ]);

  if (s1Result.status === 'fulfilled' && s1Result.value && s1Result.value.success && s1Result.value.profile) {
    sourceHealth.etlabClassic.connected = true;
    p1 = s1Result.value.profile;
  }

  if (s2Result.status === 'fulfilled' && s2Result.value) {
    sourceHealth.studentsEtlab.connected = true;
    p2 = s2Result.value;
  }

  // Verify identity consistency: do not merge if different students!
  const isConsistent = verifyIdentityConsistency(p1, p2);
  let finalProfile: StudentProfile;

  if (p1 && p2 && isConsistent) {
    // Merge: Source 1 has official KTU registerNo/rollNo; Source 2 has email/mobile/batch
    finalProfile = {
      ...p1,
      email: p1.email || p2.email,
      mobile: p1.mobile || p2.mobile,
      dob: p1.dob || p2.dob,
      gender: p1.gender || p2.gender,
      institution: DEFAULT_INSTITUTION.name,
    };
    sourceHealth.primarySource = 'unified';
  } else if (p1) {
    finalProfile = p1;
    sourceHealth.primarySource = 'etlab_classic';
  } else if (p2) {
    finalProfile = p2;
    sourceHealth.primarySource = 'students_etlab';
  } else {
    // Fallback minimal profile
    finalProfile = {
      name: session.username,
      admissionNo: session.username,
      registerNo: session.username,
      department: 'Computer Science (AI)',
      programme: 'B.Tech',
      semester: 3,
      batch: '2025-29',
      academicYear: '2025 - 2026',
      institution: DEFAULT_INSTITUTION.name,
    };
  }

  return { profile: finalProfile, sourceHealth };
}
