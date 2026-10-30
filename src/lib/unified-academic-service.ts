import type {
  StudentProfile,
  SubjectAttendanceData,
  AttendanceSummary,
  EtlabAssessmentRecord,
  SemesterResult,
  AcademicStanding,
  AcademicSourceHealth,
  AcademicSourceType,
  AuthSession,
} from '../types/index.ts';
import { etlabFetchProfile, etlabFetchAttendance, etlabFetchResults } from './etlab-client.ts';
import {
  fetchStudentsEtlabProfile,
  fetchStudentsEtlabAttendance,
  fetchStudentsEtlabAcademicAnalysis,
  fetchStudentsEtlabPreviousResults,
  formatSemesterName,
} from './students-etlab-client.ts';
import { getSynchronizedAssignments } from './assignment-service.ts';
import {
  normalizeSubjectAttendance,
  matchApprovedCourse,
  isLabCourse,
  stripLabSuffix,
  LAB_COURSE_SUFFIX_REGEX,
  classifyAssessmentRecord,
  type AssessmentCategory,
  type ClassifiedAssessment,
} from './course-catalog.ts';
import { calculateAttendanceSummary } from './attendance-calculator.ts';
import { DEFAULT_INSTITUTION } from './institution-config.ts';

export {
  classifyAssessmentRecord,
  type AssessmentCategory,
  type ClassifiedAssessment,
};

export interface CategorizedAssessmentRecords {
  seriesExam1: EtlabAssessmentRecord[];
  seriesExam2: EtlabAssessmentRecord[];
  internalMarks: EtlabAssessmentRecord[];
  theoryInternalMarks?: EtlabAssessmentRecord[];
  practicalInternalMarks?: EtlabAssessmentRecord[];
  assignmentResults: EtlabAssessmentRecord[];
  labResults: EtlabAssessmentRecord[];
}

export interface UnifiedResultsOutput {
  assessmentRecords: EtlabAssessmentRecord[];
  semesterResults: SemesterResult[];
  academicStanding?: AcademicStanding;
  sourceHealth: AcademicSourceHealth;
  resultsError?: string;
  categorizedRecords?: CategorizedAssessmentRecords;
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
 * Consolidates results strictly enforcing authoritative sources:
 * - Classic ETLAB ONLY: Authoritative for Series Exam 1, Series Exam 2, Internal Marks, and Lab Results.
 * - Assignment Service ONLY: Authoritative for genuine Assignment Results (excluding series exams).
 * - Students ETLAB ONLY: Authoritative for CGPA, Earned Credits, and KTU University SGPA/CGPA history.
 * - Strict Separation: Students ETLAB records are NEVER merged, appended, or used as fallback for
 *   Series Exam 1, Series Exam 2, Internal Marks, or Lab Results.
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

  // Helper to upsert a record cleanly with deterministic deduplication
  const upsertRecord = (
    rec: EtlabAssessmentRecord,
    source: AcademicSourceType,
    sourceLabel: string
  ) => {
    const sem = formatSemesterName(rec.semester || session.semester || 3);
    const classified = classifyAssessmentRecord(
      rec.subjectCode,
      rec.subjectName,
      rec.examName,
      rec.category
    );

    // Stable composite deduplication key: username::semester::courseCode::category::normalizedExamName
    const dedupeKey = `${session.username}::${sem}::${classified.canonicalCode}::${classified.category}::${classified.normalizedExamName}`.toLowerCase();
    const existing = recordsMap.get(dedupeKey);

    const hasNewMarks = rec.obtainedMarks !== undefined && rec.obtainedMarks !== null;
    const hasOldMarks = existing && existing.obtainedMarks !== undefined && existing.obtainedMarks !== null;
    const obtainedMarks = hasNewMarks
      ? rec.obtainedMarks
      : (hasOldMarks ? existing!.obtainedMarks : undefined);

    // Authoritative maximum marks: strictly preserve genuine maxMarks from upstream assessment record
    // Never default to 40 or 20 when maxMarks is not specified
    const maxMarks = typeof rec.maxMarks === 'number' && rec.maxMarks > 0
      ? rec.maxMarks
      : (existing && typeof existing.maxMarks === 'number' && existing.maxMarks > 0
          ? existing.maxMarks
          : undefined);
    const status = obtainedMarks !== undefined ? 'Published' : 'Awaiting marks';

    if (!existing) {
      recordsMap.set(dedupeKey, {
        ...rec,
        id: rec.id || `rec-${classified.canonicalCode}-${classified.category.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substring(2, 7)}`,
        subjectCode: classified.canonicalCode,
        subjectName: classified.canonicalName,
        semester: sem,
        category: classified.category,
        examName: classified.normalizedExamName,
        maxMarks,
        obtainedMarks,
        isLab: classified.isLab,
        status,
        source,
        sourceLabel,
      });
    } else {
      // Deterministic merge: preserve valid marks, max marks, view response URL
      recordsMap.set(dedupeKey, {
        ...existing,
        ...rec,
        subjectCode: classified.canonicalCode,
        subjectName: classified.canonicalName,
        semester: sem,
        category: classified.category,
        examName: classified.normalizedExamName,
        maxMarks,
        obtainedMarks,
        isLab: classified.isLab,
        status,
        viewResponseUrl: rec.viewResponseUrl || existing.viewResponseUrl,
        source,
        sourceLabel,
      });
    }
  };

  // 1. Authoritative Source: Classic ETLAB for Series Exam 1, Series Exam 2, Internal Marks, and Lab Results
  // 2. Authoritative Source: Students ETLAB for CGPA, Earned Credits (/academicanalysis), and KTU previous semester results
  // 3. Authoritative Source: Assignment Service for genuine Assignment Results
  const [
    classicResult,
    studentsAnalysisResult,
    studentsPrevResult,
    assignmentsResult,
  ] = await Promise.allSettled([
    session.sessionId ? etlabFetchResults(session.sessionId) : Promise.resolve(null),
    session.studentsToken ? fetchStudentsEtlabAcademicAnalysis(session.studentsToken, instituteId) : Promise.resolve(null),
    session.studentsToken ? fetchStudentsEtlabPreviousResults(session.studentsToken, session.semester, instituteId) : Promise.resolve({ records: [], semesterResults: [] }),
    getSynchronizedAssignments(
      {
        username: session.username,
        mode: session.sessionId ? 'live' : 'demo',
        sessionId: session.sessionId,
        studentsToken: session.studentsToken,
        instituteId: session.instituteId,
      } as unknown as AuthSession,
      false
    ),
  ]);

  // Process Classic ETLAB (Exclusive authoritative source for Series 1, Series 2, Internal Marks, Lab Results)
  if (classicResult.status === 'fulfilled' && classicResult.value) {
    const val = classicResult.value;
    if (val.success && val.records) {
      sourceHealth.etlabClassic.connected = true;
      for (const rec of val.records) {
        upsertRecord(rec, 'etlab_classic', 'Classic ETLAB');
      }
    } else if (val.error) {
      sourceHealth.etlabClassic.error = val.error;
      errors.push(`Classic ETLAB: ${val.error}`);
    }
  } else if (classicResult.status === 'rejected') {
    sourceHealth.etlabClassic.error = 'Connection to Classic ETLAB failed.';
  }

  // Process Assignments (Display only assignments with published marks on Classic ETLAB student results page)
  if (assignmentsResult.status === 'fulfilled' && assignmentsResult.value) {
    const asgData = assignmentsResult.value;
    if (asgData.assignments && asgData.assignments.length > 0) {
      for (const asg of asgData.assignments) {
        // Strict requirement: Only display assignments whose marks are published
        if (asg.obtainedMarks === undefined || asg.obtainedMarks === null) {
          continue;
        }

        const title = (asg.title || 'Assignment').trim();
        const titleLower = title.toLowerCase();
        // Strict guard: Series exams and internal exams must NEVER be converted into assignments!
        if (titleLower.includes('series') || titleLower.includes('sessional')) {
          continue;
        }

        const codeRaw = (asg.subjectCode || '').trim();
        const nameRaw = (asg.subject || codeRaw).trim();
        const isLab = isLabCourse(codeRaw, nameRaw);

        // Include Practical in the displayed assessment name whenever source identifies it as practical
        let examName = title;
        if (isLab && !examName.toLowerCase().includes('practical') && !examName.toLowerCase().includes('lab')) {
          examName = `${examName} (Practical)`;
        }

        const strippedCode = stripLabSuffix(codeRaw.toUpperCase());
        const strippedName = stripLabSuffix(nameRaw);
        const canonical = matchApprovedCourse(strippedCode) || matchApprovedCourse(strippedName);

        let code = codeRaw.toUpperCase();
        let name = nameRaw;

        if (isLab) {
          if (LAB_COURSE_SUFFIX_REGEX.test(codeRaw) || /[\(\[]\s*b\s*[\)\]]/i.test(codeRaw)) {
            code = `${strippedCode}(B)`;
          } else if (canonical) {
            code = `${canonical.courseCode}(B)`;
          }
          if (nameRaw.toLowerCase().includes('practical')) {
            name = nameRaw;
          } else if (canonical) {
            name = `${canonical.courseName} (Practical)`;
          }
        } else if (canonical) {
          code = canonical.courseCode;
          name = canonical.courseName;
        }

        const semStr = formatSemesterName(asg.semester || session.semester || 3);

        // Authoritative maximum marks: fetch from Classic ETLAB results page assignments tab
        const classicAsgMatch = classicResult.status === 'fulfilled' && classicResult.value?.records
          ? classicResult.value.records.find((r) => {
              if (r.category !== 'Assignments' && !(isLab && r.category === 'Lab')) return false;
              const rCode = stripLabSuffix(r.subjectCode).toUpperCase();
              const aCode = strippedCode;
              if (rCode !== aCode) return false;
              const rTitle = r.examName.toLowerCase();
              return rTitle.includes(titleLower) || titleLower.includes(rTitle);
            })
          : undefined;

        const maxMarks = typeof asg.maxMarks === 'number' && asg.maxMarks > 0
          ? asg.maxMarks
          : (classicAsgMatch && typeof classicAsgMatch.maxMarks === 'number' && classicAsgMatch.maxMarks > 0
              ? classicAsgMatch.maxMarks
              : undefined);

        upsertRecord(
          {
            id: `rec-asg-${asg.id}`,
            subjectCode: code,
            subjectName: name,
            semester: semStr,
            category: isLab ? 'Lab' : 'Assignments',
            examName,
            maxMarks,
            obtainedMarks: asg.obtainedMarks,
            isLab,
            status: 'Published',
            submissionStatus: asg.submissionStatus,
            deadline: asg.dueDate,
            viewResponseUrl: asg.externalUrl,
          },
          'etlab_classic',
          'Classic ETLAB'
        );
      }
    }
  }

  // Process Students ETLAB - Previous KTU Results (Historical semester results ONLY, no assessment records added)
  if (studentsPrevResult.status === 'fulfilled' && studentsPrevResult.value) {
    const prevData = studentsPrevResult.value;
    if (prevData.semesterResults && prevData.semesterResults.length > 0) {
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

  // Process Students ETLAB - Academic Analysis (CGPA, SGPA, earned/total credits, passed/failed)
  // Authoritative ONLY for Academic Standing
  if (studentsAnalysisResult.status === 'fulfilled' && studentsAnalysisResult.value) {
    const analysis = studentsAnalysisResult.value;
    sourceHealth.studentsEtlab.connected = true;
    academicStanding = {
      cgpa: analysis.cgpa,
      sgpa: analysis.sgpa,
      creditsEarned: analysis.earnedCredit,
      totalCredits: analysis.totalCredit,
      totalPassed: analysis.totalPassed,
      totalFailed: analysis.totalFailed,
      status: analysis.academicStatus || 'In Good Standing',
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
  } else if (semesterResults.length > 0) {
    academicStanding = {
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

  // Build categorized records buckets for consumers requiring pre-separated lists
  const internalRecords = assessmentRecords.filter((r) => r.category === 'Internal Marks');
  const categorizedRecords: CategorizedAssessmentRecords = {
    seriesExam1: assessmentRecords.filter((r) => !r.isLab && r.category === 'Series Exam 1'),
    seriesExam2: assessmentRecords.filter((r) => !r.isLab && r.category === 'Series Exam 2'),
    internalMarks: internalRecords,
    theoryInternalMarks: internalRecords.filter((r) => !r.isLab && !isLabCourse(r.subjectCode, r.subjectName)),
    practicalInternalMarks: internalRecords.filter((r) => r.isLab === true || isLabCourse(r.subjectCode, r.subjectName)),
    assignmentResults: assessmentRecords.filter((r) => !r.isLab && r.category === 'Assignments'),
    labResults: assessmentRecords.filter((r) => r.isLab || r.category === 'Lab'),
  };

  const hasData = assessmentRecords.length > 0 || semesterResults.length > 0 || academicStanding !== undefined;
  const resultsError = !hasData && errors.length > 0 ? errors.join(' • ') : undefined;

  return {
    assessmentRecords,
    semesterResults,
    academicStanding,
    sourceHealth,
    resultsError,
    categorizedRecords,
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
