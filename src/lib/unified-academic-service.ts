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
  fetchStudentsEtlabEvaluations,
  fetchStudentsEtlabAcademicAnalysis,
  fetchStudentsEtlabLabEvals,
  fetchStudentsEtlabPreviousResults,
} from './students-etlab-client.ts';
import { normalizeSubjectAttendance, matchApprovedCourse, isLabCourse } from './course-catalog.ts';
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
    semester?: number | string;
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
  const semesterResults: SemesterResult[] = [];
  let academicStanding: AcademicStanding | undefined = undefined;
  const errors: string[] = [];

  // Parallel fetch from both sources
  const [
    s1Result,
    s2EvalsResult,
    s2InternalResult,
    s2AnalysisResult,
    s2KtuResult,
    s2LabResult,
    s2PrevResult,
  ] = await Promise.allSettled([
    session.sessionId ? etlabFetchResults(session.sessionId) : Promise.resolve(null),
    session.studentsToken ? fetchStudentsEtlabEvaluations(session.studentsToken, session.semester, undefined, instituteId) : Promise.resolve({ records: [], assignments: [] }),
    session.studentsToken ? fetchStudentsEtlabInternalMarks(session.studentsToken, session.semester, instituteId) : Promise.resolve([]),
    session.studentsToken ? fetchStudentsEtlabAcademicAnalysis(session.studentsToken, instituteId) : Promise.resolve(null),
    session.studentsToken ? fetchStudentsEtlabKtuResults(session.studentsToken, undefined, instituteId) : Promise.resolve<{ standing?: AcademicStanding; semesterResults: SemesterResult[] }>({ semesterResults: [] }),
    session.studentsToken ? fetchStudentsEtlabLabEvals(session.studentsToken, session.semester, instituteId) : Promise.resolve([]),
    session.studentsToken ? fetchStudentsEtlabPreviousResults(session.studentsToken, session.semester, instituteId) : Promise.resolve({ records: [], semesterResults: [] }),
  ]);

  // Helper to upsert a record cleanly
  const upsertRecord = (rec: EtlabAssessmentRecord) => {
    const canonical = matchApprovedCourse(rec.subjectCode) || matchApprovedCourse(rec.subjectName);
    const code = canonical ? canonical.courseCode : rec.subjectCode;
    const name = canonical ? canonical.courseName : rec.subjectName;
    const isLab = isLabCourse(code, name) || rec.isLab === true;

    let category = rec.category;
    if (isLab && (category.toLowerCase().includes('assignment') || category === 'Assignments')) {
      category = 'Lab Evaluation';
    }

    const key = `${code}_${rec.semester || 'IIIrd Semester'}_${category}_${rec.examName}`.toLowerCase();
    const existing = recordsMap.get(key);

    if (!existing) {
      recordsMap.set(key, {
        ...rec,
        subjectCode: code,
        subjectName: name,
        category,
        isLab,
      });
    } else {
      // Merge: prefer one with marks or response URL
      const hasNewMarks = rec.obtainedMarks !== undefined && rec.obtainedMarks !== null;
      const hasOldMarks = existing.obtainedMarks !== undefined && existing.obtainedMarks !== null;

      recordsMap.set(key, {
        ...existing,
        ...rec,
        subjectCode: code,
        subjectName: name,
        category,
        isLab,
        obtainedMarks: hasNewMarks ? rec.obtainedMarks : (hasOldMarks ? existing.obtainedMarks : undefined),
        viewResponseUrl: rec.viewResponseUrl || existing.viewResponseUrl,
        source: existing.source === 'etlab_classic' && rec.source === 'students_etlab' ? 'unified' : (rec.source || existing.source),
        sourceLabel: existing.sourceLabel === 'ETLAB Classic' && rec.sourceLabel === 'Students ETLAB' ? 'Unified (ETLAB Classic + Students ETLAB)' : (rec.sourceLabel || existing.sourceLabel),
      });
    }
  };

  // 1. Process Source 1 (ETLAB Classic)
  if (s1Result.status === 'fulfilled' && s1Result.value) {
    const val = s1Result.value;
    if (val.success && val.records) {
      sourceHealth.etlabClassic.connected = true;
      for (const rec of val.records) {
        upsertRecord({
          ...rec,
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

  // 2. Process Source 2 (Students ETLAB - Evaluations: assignments, series, module tests)
  if (s2EvalsResult.status === 'fulfilled' && s2EvalsResult.value) {
    const evalsData = s2EvalsResult.value;
    if (evalsData.records.length > 0) {
      sourceHealth.studentsEtlab.connected = true;
      for (const rec of evalsData.records) {
        upsertRecord(rec);
      }
    }
  }

  // 3. Process Source 2 (Students ETLAB - Internal Marks)
  if (s2InternalResult.status === 'fulfilled' && s2InternalResult.value) {
    const internalRecords = s2InternalResult.value;
    if (internalRecords.length > 0) {
      sourceHealth.studentsEtlab.connected = true;
      for (const rec of internalRecords) {
        upsertRecord(rec);
      }
    }
  }

  // 4. Process Source 2 (Students ETLAB - Lab Evaluations)
  if (s2LabResult.status === 'fulfilled' && s2LabResult.value) {
    const labRecords = s2LabResult.value;
    if (labRecords.length > 0) {
      sourceHealth.studentsEtlab.connected = true;
      for (const rec of labRecords) {
        upsertRecord(rec);
      }
    }
  }

  // 5. Process Source 2 (Students ETLAB - Previous Results)
  if (s2PrevResult.status === 'fulfilled' && s2PrevResult.value) {
    const prevData = s2PrevResult.value;
    if (prevData.records.length > 0) {
      sourceHealth.studentsEtlab.connected = true;
      for (const rec of prevData.records) {
        upsertRecord(rec);
      }
    }
    if (prevData.semesterResults.length > 0) {
      sourceHealth.studentsEtlab.connected = true;
      for (const sr of prevData.semesterResults) {
        const existingSrIndex = semesterResults.findIndex((s) => s.semester === sr.semester);
        if (existingSrIndex === -1) {
          semesterResults.push(sr);
        } else {
          semesterResults[existingSrIndex] = {
            ...semesterResults[existingSrIndex],
            ...sr,
            subjects: sr.subjects.length > 0 ? sr.subjects : semesterResults[existingSrIndex].subjects,
          };
        }
      }
    }
  }

  // 6. Process Source 2 (Students ETLAB - KTU University Results)
  if (s2KtuResult.status === 'fulfilled' && s2KtuResult.value) {
    const ktuData = s2KtuResult.value;
    if (ktuData) {
      sourceHealth.studentsEtlab.connected = true;
      if (ktuData.standing) {
        academicStanding = ktuData.standing;
      }
      if (ktuData.semesterResults && ktuData.semesterResults.length > 0) {
        for (const sr of ktuData.semesterResults) {
          const existingSrIndex = semesterResults.findIndex((s) => s.semester === sr.semester);
          if (existingSrIndex === -1) {
            semesterResults.push(sr);
          } else {
            semesterResults[existingSrIndex] = {
              ...semesterResults[existingSrIndex],
              ...sr,
              subjects: sr.subjects.length > 0 ? sr.subjects : semesterResults[existingSrIndex].subjects,
            };
          }
        }
      }
    }
  }

  // 7. Process Source 2 (Students ETLAB - Academic Analysis: CGPA, SGPA, earned/total credits, passed/failed)
  if (s2AnalysisResult.status === 'fulfilled' && s2AnalysisResult.value) {
    const analysis = s2AnalysisResult.value;
    sourceHealth.studentsEtlab.connected = true;
    academicStanding = {
      cgpa: analysis.cgpa ?? academicStanding?.cgpa,
      sgpa: analysis.sgpa ?? academicStanding?.sgpa,
      creditsEarned: analysis.earnedCredit ?? academicStanding?.creditsEarned,
      totalCredits: analysis.totalCredit ?? academicStanding?.totalCredits,
      totalPassed: analysis.totalPassed ?? academicStanding?.totalPassed,
      totalFailed: analysis.totalFailed ?? academicStanding?.totalFailed,
      status: analysis.academicStatus || academicStanding?.status || 'In Good Standing',
      source: 'students_etlab',
      lastUpdated: new Date().toLocaleDateString('en-IN'),
      publishedResults: semesterResults.map((r) => ({
        semester: r.semester,
        sgpa: r.sgpa,
        cgpa: r.cgpa,
        creditsEarned: r.creditsEarned,
        totalCredits: r.totalCredits,
        status: r.status,
        academicYear: r.academicYear,
        subjects: r.subjects,
      })),
    };
  } else if (academicStanding && semesterResults.length > 0 && !academicStanding.publishedResults) {
    academicStanding.publishedResults = semesterResults.map((r) => ({
      semester: r.semester,
      sgpa: r.sgpa,
      cgpa: r.cgpa,
      creditsEarned: r.creditsEarned,
      totalCredits: r.totalCredits,
      status: r.status,
      academicYear: r.academicYear,
      subjects: r.subjects,
    }));
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
