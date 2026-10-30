import { DEFAULT_INSTITUTION } from './institution-config.ts';
import type {
  StudentsEtlabLoginResult,
  StudentProfile,
  EtlabAssessmentRecord,
  SemesterResult,
  AssessmentMarkItem,
  AcademicStanding,
  SubjectAttendanceData,
} from '../types/index.ts';
import { normalizeStudentProfile, normalizeSubjectAttendance, matchApprovedCourse } from './course-catalog.ts';

interface RawInternalMarkItem {
  subject_code?: string;
  code?: string;
  subject_name?: string;
  name?: string;
  max_marks?: number;
  marks?: number;
  internal_mark?: number;
  cia?: number;
  semester?: number | string;
  exam_name?: string;
}

interface RawSubjectAttendanceItem {
  subject_code?: string;
  code?: string;
  subject_name?: string;
  name?: string;
  attended_hours?: number | string;
  attended?: number | string;
  total_hours?: number | string;
  total?: number | string;
  faculty_name?: string;
  faculty?: string;
  teacher?: string;
  type?: string;
  category?: string;
}

const API_BASE = process.env.STUDENTS_ETLAB_API_BASE || DEFAULT_INSTITUTION.apiBaseUrl || 'https://api.students.etlab.app/api/v1';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export const STUDENTS_ETLAB_TIMEOUT_MS = 15000;
export const STUDENTS_ETLAB_RESULTS_TIMEOUT_MS = 20000;

/**
 * Standard headers required by Students ETLAB API.
 */
function getHeaders(token?: string, instituteId: string = DEFAULT_INSTITUTION.id): HeadersInit {
  const headers: Record<string, string> = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
    'X-Institute-ID': instituteId,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Normalizes network or HTTP errors into safe, student-actionable messages.
 */
export function classifyStudentsEtlabError(err: unknown): {
  error: string;
  errorCategory: 'TIMEOUT' | 'UPSTREAM_UNAVAILABLE' | 'INVALID_CREDENTIALS';
  statusCode: number;
} {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    const name = err.name.toLowerCase();

    if (name === 'timeouterror' || name === 'aborterror' || msg.includes('timeout') || msg.includes('aborted')) {
      return {
        error: 'Students ETLAB is taking too long to respond. Please try again.',
        errorCategory: 'TIMEOUT',
        statusCode: 504,
      };
    }
  }

  return {
    error: 'Students ETLAB is temporarily unavailable. Please try again later.',
    errorCategory: 'UPSTREAM_UNAVAILABLE',
    statusCode: 503,
  };
}

/**
 * Authenticates against Students ETLAB (Source 2)
 * POST /api/v1/login
 */
export async function studentsEtlabLogin(
  username: string,
  password: string,
  instituteId: string = DEFAULT_INSTITUTION.id
): Promise<StudentsEtlabLoginResult> {
  const cleanUsername = username ? username.trim() : '';

  if (!cleanUsername || !password) {
    return {
      success: false,
      error: 'Username and password are required.',
      errorCategory: 'VALIDATION',
      statusCode: 400,
    };
  }

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: getHeaders(undefined, instituteId),
      body: JSON.stringify({
        username: cleanUsername,
        password,
        institute_id: instituteId,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(STUDENTS_ETLAB_TIMEOUT_MS),
    });

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: 'Incorrect username or password for Students ETLAB.',
        errorCategory: 'INVALID_CREDENTIALS',
        statusCode: 401,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `Students ETLAB returned an unexpected status (${response.status}).`,
        errorCategory: 'UPSTREAM_UNAVAILABLE',
        statusCode: response.status >= 500 ? 503 : response.status,
      };
    }

    const data = await response.json().catch(() => null);

    if (!data) {
      return {
        success: false,
        error: 'Invalid response from Students ETLAB.',
        errorCategory: 'MALFORMED_RESPONSE',
        statusCode: 502,
      };
    }

    // Students ETLAB returns { login: true, token, userData } or { login: false, error }
    if (data.login === false || (!data.token && data.error)) {
      return {
        success: false,
        error: data.error || 'Incorrect username or password.',
        errorCategory: 'INVALID_CREDENTIALS',
        statusCode: 401,
      };
    }

    if (!data.token) {
      return {
        success: false,
        error: 'Authentication failed: No session token received from Students ETLAB.',
        errorCategory: 'MALFORMED_RESPONSE',
        statusCode: 502,
      };
    }

    return {
      success: true,
      token: data.token,
      userData: data.userData,
    };
  } catch (err) {
    const classified = classifyStudentsEtlabError(err);
    return {
      success: false,
      error: classified.error,
      errorCategory: classified.errorCategory,
      statusCode: classified.statusCode,
    };
  }
}

/**
 * Fetches student profile from Students ETLAB
 * GET /api/v1/profile
 */
export async function fetchStudentsEtlabProfile(
  token: string,
  instituteId: string = DEFAULT_INSTITUTION.id
): Promise<StudentProfile | null> {
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'GET',
      headers: getHeaders(token, instituteId),
      cache: 'no-store',
      signal: AbortSignal.timeout(STUDENTS_ETLAB_TIMEOUT_MS),
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    if (!data || typeof data !== 'object') return null;

    const raw = data.profile || data.userData || data;

    const rawProfile: Partial<StudentProfile> = {
      name: raw.name || raw.profile_name || raw.student_name || '',
      admissionNo: raw.admission_no || raw.admissionNo || raw.username || '',
      registerNo: raw.register_no || raw.reg_no || raw.ktuid || '',
      rollNo: raw.roll_no || raw.rollNo || '',
      dob: raw.dob || raw.date_of_birth,
      gender: raw.gender,
      department: raw.department || raw.dept_name || 'Computer Science (AI)',
      programme: raw.programme || raw.course_name || 'B.Tech',
      semester: Number(raw.semester || raw.current_sem || 3),
      batch: raw.batch || raw.admission_year || '2025-29',
      academicYear: raw.academic_year || '2025 - 2026',
      institution: DEFAULT_INSTITUTION.name,
      email: raw.email,
      mobile: raw.mobile || raw.phone,
    };

    return normalizeStudentProfile(rawProfile);
  } catch {
    return null;
  }
}

/**
 * Fetches internal marks from Students ETLAB
 * GET /api/v1/resultinternal?sem_id={semId}
 */
export async function fetchStudentsEtlabInternalMarks(
  token: string,
  semId?: number | string,
  instituteId: string = DEFAULT_INSTITUTION.id
): Promise<EtlabAssessmentRecord[]> {
  if (!token) return [];

  try {
    const url = semId
      ? `${API_BASE}/resultinternal?sem_id=${encodeURIComponent(semId)}`
      : `${API_BASE}/resultinternal`;

    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token, instituteId),
      cache: 'no-store',
      signal: AbortSignal.timeout(STUDENTS_ETLAB_RESULTS_TIMEOUT_MS),
    });

    if (!res.ok) return [];

    const data = await res.json().catch(() => null);
    if (!data) return [];

    const rawList: RawInternalMarkItem[] = Array.isArray(data)
      ? data
      : Array.isArray(data.results)
      ? data.results
      : Array.isArray(data.items)
      ? data.items
      : [];

    const records: EtlabAssessmentRecord[] = [];

    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      const subjectCode = item.subject_code || item.code || '';
      const canonical = matchApprovedCourse(subjectCode) || matchApprovedCourse(item.subject_name || item.name);
      const code = canonical ? canonical.courseCode : subjectCode;
      const name = canonical ? canonical.courseName : (item.subject_name || item.name || 'Subject');

      // Internal marks assessment record
      const maxMarks = typeof item.max_marks === 'number' ? item.max_marks : 50;
      const obtained = typeof item.marks === 'number'
        ? item.marks
        : typeof item.internal_mark === 'number'
        ? item.internal_mark
        : typeof item.cia === 'number'
        ? item.cia
        : undefined;

      // Do not treat missing marks as 0!
      if (typeof obtained === 'number') {
        records.push({
          id: `se-int-${code}-${i}`,
          subjectCode: code,
          subjectName: name,
          semester: item.semester ? `${item.semester}th Semester` : 'IIIrd Semester',
          category: 'Internal Marks',
          examName: item.exam_name || 'Continuous Assessment (CIA)',
          maxMarks,
          obtainedMarks: obtained,
          source: 'students_etlab',
          sourceLabel: 'Students ETLAB',
        });
      }
    }

    return records;
  } catch {
    return [];
  }
}

/**
 * Fetches KTU university results (CGPA, SGPA, grades) from Students ETLAB
 * GET /api/v1/resultsuniversity/ktu
 */
export async function fetchStudentsEtlabKtuResults(
  token: string,
  semPosition?: number | string,
  instituteId: string = DEFAULT_INSTITUTION.id
): Promise<{
  standing?: AcademicStanding;
  semesterResults: SemesterResult[];
}> {
  if (!token) return { semesterResults: [] };

  try {
    const url = semPosition
      ? `${API_BASE}/resultsuniversity/ktu?sem_position=${encodeURIComponent(semPosition)}`
      : `${API_BASE}/resultsuniversity/ktu`;

    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token, instituteId),
      cache: 'no-store',
      signal: AbortSignal.timeout(STUDENTS_ETLAB_RESULTS_TIMEOUT_MS),
    });

    if (!res.ok) return { semesterResults: [] };

    const data = await res.json().catch(() => null);
    if (!data) return { semesterResults: [] };

    const semesterResults: SemesterResult[] = [];
    let officialCgpa: number | undefined = undefined;
    let officialSgpa: number | undefined = undefined;
    let officialCreditsEarned: number | undefined = undefined;
    let officialTotalCredits: number | undefined = undefined;

    // Check top-level CGPA / SGPA fields if published
    if (typeof data.cgpa === 'number' && data.cgpa > 0) officialCgpa = data.cgpa;
    if (typeof data.sgpa === 'number' && data.sgpa > 0) officialSgpa = data.sgpa;
    if (typeof data.credits_earned === 'number') officialCreditsEarned = data.credits_earned;
    if (typeof data.total_credits === 'number') officialTotalCredits = data.total_credits;

    const semestersData = Array.isArray(data.semesters)
      ? data.semesters
      : Array.isArray(data.results)
      ? data.results
      : Array.isArray(data)
      ? data
      : [];

    for (const sem of semestersData) {
      const semNum = Number(sem.semester || sem.sem_id || sem.sem_position || 1);
      const semSgpa = typeof sem.sgpa === 'number' ? sem.sgpa : 0;
      const semCgpa = typeof sem.cgpa === 'number' ? sem.cgpa : (officialCgpa || 0);

      if (!officialCgpa && typeof sem.cgpa === 'number' && sem.cgpa > 0) {
        officialCgpa = sem.cgpa;
      }
      if (!officialSgpa && typeof sem.sgpa === 'number' && sem.sgpa > 0) {
        officialSgpa = sem.sgpa;
      }

      const subjects: AssessmentMarkItem[] = [];
      const rawSubjects = Array.isArray(sem.subjects) ? sem.subjects : [];

      for (const sub of rawSubjects) {
        const canonical =
          matchApprovedCourse(sub.code || sub.subject_code) ||
          matchApprovedCourse(sub.name || sub.subject_name);
        subjects.push({
          code: canonical ? canonical.courseCode : (sub.code || sub.subject_code || ''),
          name: canonical ? canonical.courseName : (sub.name || sub.subject_name || 'Subject'),
          credits: Number(sub.credits || 0),
          grade: sub.grade,
          gradePoints: typeof sub.grade_points === 'number' ? sub.grade_points : undefined,
          series1: typeof sub.series1 === 'number' ? sub.series1 : undefined,
          series2: typeof sub.series2 === 'number' ? sub.series2 : undefined,
          assignmentMarks: typeof sub.assignment_marks === 'number' ? sub.assignment_marks : undefined,
          ciaMarks: typeof sub.cia_marks === 'number' ? sub.cia_marks : undefined,
          endSemMarks: typeof sub.end_sem_marks === 'number' ? sub.end_sem_marks : undefined,
          resultStatus: sub.status || (sub.grade && sub.grade !== 'F' ? 'Passed' : 'Awaited'),
        });
      }

      semesterResults.push({
        semester: semNum,
        academicYear: sem.academic_year || '2024 - 2025',
        sgpa: semSgpa,
        cgpa: semCgpa,
        creditsEarned: Number(sem.credits_earned || sem.earned_credits || 0),
        totalCredits: Number(sem.total_credits || 0),
        status: sem.status || 'Passed',
        subjects,
        source: 'students_etlab',
        sourceLabel: 'Students ETLAB (KTU Portal)',
      });
    }

    const standing: AcademicStanding | undefined = (officialCgpa || officialSgpa)
      ? {
          cgpa: officialCgpa,
          sgpa: officialSgpa,
          creditsEarned: officialCreditsEarned,
          totalCredits: officialTotalCredits,
          source: 'students_etlab',
          status: 'Published',
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
        }
      : undefined;

    return { standing, semesterResults };
  } catch {
    return { semesterResults: [] };
  }
}

/**
 * Fetches attendance by subject from Students ETLAB
 * GET /api/v1/attendancebysubject?sem_id={semId}
 */
export async function fetchStudentsEtlabAttendance(
  token: string,
  semId?: number | string,
  instituteId: string = DEFAULT_INSTITUTION.id
): Promise<SubjectAttendanceData[]> {
  if (!token) return [];

  try {
    const url = semId
      ? `${API_BASE}/attendancebysubject?sem_id=${encodeURIComponent(semId)}`
      : `${API_BASE}/attendancebysubject`;

    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token, instituteId),
      cache: 'no-store',
      signal: AbortSignal.timeout(STUDENTS_ETLAB_TIMEOUT_MS),
    });

    if (!res.ok) return [];

    const data = await res.json().catch(() => null);
    if (!data) return [];

    const rawList: RawSubjectAttendanceItem[] = Array.isArray(data)
      ? data
      : Array.isArray(data.subjects)
      ? data.subjects
      : Array.isArray(data.items)
      ? data.items
      : [];

    const subjects: SubjectAttendanceData[] = [];

    for (const item of rawList) {
      const code = item.subject_code || item.code || '';
      const name = item.subject_name || item.name || '';
      const attended = Number(item.attended_hours || item.attended || 0);
      const total = Number(item.total_hours || item.total || 0);
      const faculty = item.faculty_name || item.faculty || item.teacher || 'Faculty';

      const subject: SubjectAttendanceData = {
        code,
        name,
        faculty,
        attendedHours: attended,
        totalHours: total,
        category: (item.type || item.category || 'Theory').toLowerCase().includes('lab') ? 'Lab' : 'Theory',
        source: 'students_etlab',
        sourceLabel: 'Students ETLAB',
      };

      subjects.push(normalizeSubjectAttendance(subject));
    }

    return subjects;
  } catch {
    return [];
  }
}

/**
 * Fetches institution directory from Students ETLAB
 * GET /api/v1/institutes
 */
export async function fetchStudentsEtlabInstitutes(): Promise<{ id: string; name: string }[]> {
  try {
    const res = await fetch(`${API_BASE}/institutes`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': USER_AGENT,
      },
      cache: 'force-cache',
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [DEFAULT_INSTITUTION];
    const data = await res.json().catch(() => null);
    return Array.isArray(data) ? data : [DEFAULT_INSTITUTION];
  } catch {
    return [DEFAULT_INSTITUTION];
  }
}
