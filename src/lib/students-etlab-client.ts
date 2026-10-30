import { DEFAULT_INSTITUTION } from './institution-config.ts';
import type {
  StudentsEtlabLoginResult,
  StudentProfile,
  EtlabAssessmentRecord,
  SemesterResult,
  AssessmentMarkItem,
  AcademicStanding,
  SubjectAttendanceData,
  Assignment,
} from '../types/index.ts';
import {
  normalizeStudentProfile,
  normalizeSubjectAttendance,
  matchApprovedCourse,
  isLabCourse,
} from './course-catalog.ts';

export function formatSemesterName(sem?: number | string): string {
  if (!sem) return 'IIIrd Semester';
  const s = String(sem).toLowerCase().trim();
  if (s.includes('iii') || s === '3' || s === 's3') return 'IIIrd Semester';
  if (s.includes('ii') || s === '2' || s === 's2') return 'IInd Semester';
  if (s.includes('i') || s === '1' || s === 's1') return 'Ist Semester';
  if (s.includes('iv') || s === '4' || s === 's4') return 'IVth Semester';
  const num = parseInt(s.replace(/[^0-9]/g, ''), 10);
  if (num === 1) return 'Ist Semester';
  if (num === 2) return 'IInd Semester';
  if (num === 3) return 'IIIrd Semester';
  if (num === 4) return 'IVth Semester';
  if (num === 5) return 'Vth Semester';
  if (num === 6) return 'VIth Semester';
  if (num === 7) return 'VIIth Semester';
  if (num === 8) return 'VIIIth Semester';
  return 'IIIrd Semester';
}

/**
 * Safely parses marks value from upstream payload.
 * Distinguishes legitimate 0 from missing/unreleased values.
 */
export function parseMarksValue(rawVal: unknown): number | undefined {
  if (rawVal === null || rawVal === undefined) return undefined;
  if (typeof rawVal === 'number') {
    return isNaN(rawVal) ? undefined : rawVal;
  }
  const s = String(rawVal).trim();
  if (
    s === '' ||
    s.toLowerCase() === 'awaited' ||
    s.toLowerCase() === 'pending' ||
    s.toLowerCase() === 'n/a' ||
    s.toLowerCase() === '-' ||
    s.toLowerCase() === '--'
  ) {
    return undefined;
  }
  const num = Number(s);
  return isNaN(num) ? undefined : num;
}

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
      const isLab = isLabCourse(code, name);

      // Internal marks assessment record
      const maxMarks = typeof item.max_marks === 'number' ? item.max_marks : 50;
      const obtained = parseMarksValue(
        item.marks !== undefined ? item.marks :
        item.internal_mark !== undefined ? item.internal_mark :
        item.cia
      );

      records.push({
        id: `se-int-${code}-${i}`,
        subjectCode: code,
        subjectName: name,
        semester: formatSemesterName(item.semester || semId),
        category: isLab ? 'Lab Evaluation' : 'Internal Marks',
        examName: item.exam_name || 'Continuous Assessment (CIA)',
        maxMarks,
        obtainedMarks: obtained,
        source: 'students_etlab',
        sourceLabel: 'Students ETLAB',
        isLab,
      });
    }

    return records;
  } catch {
    return [];
  }
}

export interface StudentsEtlabEvaluationsResult {
  records: EtlabAssessmentRecord[];
  assignments: Assignment[];
}

/**
 * Fetches evaluations (assignments, series exams, module tests, etc.) from Students ETLAB
 * GET /api/v1/evaluations?sem_id={semId}
 */
export async function fetchStudentsEtlabEvaluations(
  token: string,
  semId?: number | string,
  filter?: string,
  instituteId: string = DEFAULT_INSTITUTION.id
): Promise<StudentsEtlabEvaluationsResult> {
  if (!token) return { records: [], assignments: [] };

  try {
    const params = new URLSearchParams();
    if (semId) params.set('sem_id', String(semId));
    if (filter) params.set('filter', filter);
    const qs = params.toString();
    const url = qs ? `${API_BASE}/evaluations?${qs}` : `${API_BASE}/evaluations`;

    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token, instituteId),
      cache: 'no-store',
      signal: AbortSignal.timeout(STUDENTS_ETLAB_RESULTS_TIMEOUT_MS),
    });

    if (!res.ok) return { records: [], assignments: [] };

    const data = await res.json().catch(() => null);
    if (!data) return { records: [], assignments: [] };

    const records: EtlabAssessmentRecord[] = [];
    const assignments: Assignment[] = [];

    const processItem = (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      item: Record<string, any>,
      defaultCategory: string,
      evalKind: 'assignment' | 'series' | 'module' | 'other'
    ) => {
      const subjectCode = String(item.subject_code || item.code || '').trim();
      const rawSubjectName = String(item.subject_name || item.subject || item.name || '').trim();
      const canonical = matchApprovedCourse(subjectCode) || matchApprovedCourse(rawSubjectName);
      const code = canonical ? canonical.courseCode : subjectCode;
      const name = canonical ? canonical.courseName : (rawSubjectName || 'Subject');
      const title = String(item.name || item.title || item.evaluation_name || item.assignment_name || defaultCategory).trim();

      const maxMarks = typeof item.max_marks === 'number'
        ? item.max_marks
        : typeof item.total_marks === 'number'
        ? item.total_marks
        : Number(item.max_marks || item.total_marks || 0) || 0;

      const obtained = parseMarksValue(
        item.mark !== undefined ? item.mark :
        item.marks !== undefined ? item.marks :
        item.obtained_marks !== undefined ? item.obtained_marks :
        item.score
      );

      const isLab = isLabCourse(code, name);
      const semStr = formatSemesterName(item.sem_id || item.semester || semId);
      const rawStatus = String(item.status || item.submission_status || '').trim();
      const isSubmitted = item.submitted === true || item.submitted === 1 || String(item.submitted).toLowerCase() === 'true';

      let finalCategory = defaultCategory;
      let examName = title;

      if (evalKind === 'assignment') {
        if (isLab) {
          finalCategory = 'Lab Evaluation';
        } else {
          finalCategory = 'Assignments';
        }
      } else if (evalKind === 'series') {
        finalCategory = 'Sessional Exams';
        const titleLower = title.toLowerCase();
        if (titleLower.includes('2') || titleLower.includes('second')) {
          examName = 'Series Exam 2';
        } else if (titleLower.includes('1') || titleLower.includes('first')) {
          examName = 'Series Exam 1';
        }
      }

      const id = String(item.id || `eval-${code}-${evalKind}-${Math.random().toString(36).substring(2, 7)}`);

      records.push({
        id: `se-eval-${id}`,
        subjectCode: code,
        subjectName: name,
        semester: semStr,
        category: finalCategory,
        examName,
        maxMarks: maxMarks > 0 ? maxMarks : 0,
        obtainedMarks: obtained,
        source: 'students_etlab',
        sourceLabel: 'Students ETLAB',
        isLab,
        evaluationTitle: title,
        submissionStatus: rawStatus || (isSubmitted ? 'Submitted' : undefined),
        deadline: String(item.due_date || item.deadline || ''),
        feedback: String(item.feedback || item.remarks || ''),
        status: obtained !== undefined ? 'Published' : 'Awaiting marks',
      });

      // Construct corresponding Assignment object
      if (evalKind === 'assignment' || defaultCategory.toLowerCase().includes('assignment')) {
        let submissionStatus: Assignment['submissionStatus'] = 'Pending';
        let asgStatus: Assignment['status'] = 'pending';

        if (obtained !== undefined) {
          submissionStatus = 'Evaluated';
          asgStatus = 'completed';
        } else if (isSubmitted || rawStatus.toLowerCase().includes('submitted')) {
          submissionStatus = 'Submitted';
          asgStatus = 'submitted';
        } else if (rawStatus.toLowerCase().includes('not submitted')) {
          submissionStatus = 'Not Submitted';
          asgStatus = 'pending';
        } else if (rawStatus.toLowerCase().includes('awaiting')) {
          submissionStatus = 'Awaiting Marks';
          asgStatus = 'submitted';
        }

        const dueDate = String(item.due_date || item.deadline || 'Not specified');

        assignments.push({
          id: `asg-eval-${id}`,
          title,
          subject: name,
          subjectCode: code,
          faculty: String(item.faculty || item.teacher || 'Faculty'),
          publishDate: String(item.date || item.eval_date || 'Not specified'),
          dueDate,
          status: asgStatus,
          submissionStatus,
          maxMarks: maxMarks > 0 ? maxMarks : undefined,
          obtainedMarks: obtained,
          description: String(item.description || item.remarks || `Evaluation coursework for ${name}`),
          submissionMode: 'Online',
          semester: semStr,
          feedback: String(item.feedback || ''),
          evaluationType: defaultCategory,
        });
      }
    };

    if (typeof data === 'object' && !Array.isArray(data)) {
      if (Array.isArray(data.assignments)) {
        for (const item of data.assignments) processItem(item, 'Assignments', 'assignment');
      }
      if (Array.isArray(data.series_exams)) {
        for (const item of data.series_exams) processItem(item, 'Sessional Exams', 'series');
      }
      if (Array.isArray(data.module_tests)) {
        for (const item of data.module_tests) processItem(item, 'Internal Marks', 'module');
      }
      if (Array.isArray(data.tutorials)) {
        for (const item of data.tutorials) processItem(item, 'Internal Marks', 'other');
      }
      if (Array.isArray(data.class_projects)) {
        for (const item of data.class_projects) processItem(item, 'Internal Marks', 'other');
      }
      if (Array.isArray(data.seminars)) {
        for (const item of data.seminars) processItem(item, 'Internal Marks', 'other');
      }
      if (Array.isArray(data.homeworks)) {
        for (const item of data.homeworks) processItem(item, 'Assignments', 'assignment');
      }
      if (Array.isArray(data.self_studies)) {
        for (const item of data.self_studies) processItem(item, 'Assignments', 'assignment');
      }
      if (Array.isArray(data.term_works)) {
        for (const item of data.term_works) processItem(item, 'Internal Marks', 'other');
      }
      if (Array.isArray(data.evaluations)) {
        for (const item of data.evaluations) {
          const type = String(item.type || item.eval_type || '').toLowerCase();
          if (type.includes('assign') || type.includes('homework')) {
            processItem(item, 'Assignments', 'assignment');
          } else if (type.includes('series') || type.includes('sessional')) {
            processItem(item, 'Sessional Exams', 'series');
          } else {
            processItem(item, 'Internal Marks', 'other');
          }
        }
      }
    } else if (Array.isArray(data)) {
      for (const item of data) {
        const type = String(item.type || item.eval_type || item.category || '').toLowerCase();
        if (type.includes('assign') || type.includes('homework')) {
          processItem(item, 'Assignments', 'assignment');
        } else if (type.includes('series') || type.includes('sessional')) {
          processItem(item, 'Sessional Exams', 'series');
        } else {
          processItem(item, 'Internal Marks', 'other');
        }
      }
    }

    return { records, assignments };
  } catch {
    return { records: [], assignments: [] };
  }
}

/**
 * Fetches academic analysis metrics (CGPA, SGPA, earned/total credits, total passed/failed)
 * GET /api/v1/academicanalysis
 */
export async function fetchStudentsEtlabAcademicAnalysis(
  token: string,
  instituteId: string = DEFAULT_INSTITUTION.id
): Promise<{
  cgpa?: number;
  sgpa?: number;
  earnedCredit?: number;
  totalCredit?: number;
  totalPassed?: number;
  totalFailed?: number;
  academicStatus?: string;
} | null> {
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/academicanalysis`, {
      method: 'GET',
      headers: getHeaders(token, instituteId),
      cache: 'no-store',
      signal: AbortSignal.timeout(STUDENTS_ETLAB_TIMEOUT_MS),
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    if (!data || typeof data !== 'object') return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: Record<string, any> = data.analysis || data.data || data;

    const cgpa = typeof raw.cgpa === 'number'
      ? raw.cgpa
      : typeof raw.cgpa === 'string' && !isNaN(parseFloat(raw.cgpa))
      ? parseFloat(raw.cgpa)
      : undefined;

    const sgpa = typeof raw.sgpa === 'number'
      ? raw.sgpa
      : typeof raw.sgpa === 'string' && !isNaN(parseFloat(raw.sgpa))
      ? parseFloat(raw.sgpa)
      : undefined;

    const earnedCredit = typeof raw.earned_credit === 'number'
      ? raw.earned_credit
      : typeof raw.credits_earned === 'number'
      ? raw.credits_earned
      : typeof raw.earned_credits === 'number'
      ? raw.earned_credits
      : typeof raw.earned_credit === 'string' && !isNaN(parseInt(raw.earned_credit, 10))
      ? parseInt(raw.earned_credit, 10)
      : undefined;

    const totalCredit = typeof raw.total_credit === 'number'
      ? raw.total_credit
      : typeof raw.total_credits === 'number'
      ? raw.total_credits
      : typeof raw.total_credit === 'string' && !isNaN(parseInt(raw.total_credit, 10))
      ? parseInt(raw.total_credit, 10)
      : undefined;

    const totalPassed = typeof raw.total_passed === 'number'
      ? raw.total_passed
      : typeof raw.passed_subjects === 'number'
      ? raw.passed_subjects
      : typeof raw.total_passed === 'string' && !isNaN(parseInt(raw.total_passed, 10))
      ? parseInt(raw.total_passed, 10)
      : undefined;

    const totalFailed = typeof raw.total_failed === 'number'
      ? raw.total_failed
      : typeof raw.failed_subjects === 'number'
      ? raw.failed_subjects
      : typeof raw.total_failed === 'string' && !isNaN(parseInt(raw.total_failed, 10))
      ? parseInt(raw.total_failed, 10)
      : undefined;

    const academicStatus = typeof raw.academic_status === 'string'
      ? raw.academic_status
      : typeof raw.status === 'string'
      ? raw.status
      : undefined;

    return {
      cgpa,
      sgpa,
      earnedCredit,
      totalCredit,
      totalPassed,
      totalFailed,
      academicStatus,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches lab evaluations from Students ETLAB
 * GET /api/v1/labevals?sem_id={semId}
 */
export async function fetchStudentsEtlabLabEvals(
  token: string,
  semId?: number | string,
  instituteId: string = DEFAULT_INSTITUTION.id
): Promise<EtlabAssessmentRecord[]> {
  if (!token) return [];

  try {
    const url = semId ? `${API_BASE}/labevals?sem_id=${encodeURIComponent(semId)}` : `${API_BASE}/labevals`;

    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token, instituteId),
      cache: 'no-store',
      signal: AbortSignal.timeout(STUDENTS_ETLAB_RESULTS_TIMEOUT_MS),
    });

    if (!res.ok) return [];

    const data = await res.json().catch(() => null);
    if (!data) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawList: Record<string, any>[] = Array.isArray(data)
      ? data
      : Array.isArray(data.evaluations)
      ? data.evaluations
      : Array.isArray(data.items)
      ? data.items
      : [];

    const records: EtlabAssessmentRecord[] = [];

    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      const subjectCode = item.subject_code || item.code || '';
      const rawSubjectName = item.subject_name || item.name || '';
      const canonical = matchApprovedCourse(subjectCode) || matchApprovedCourse(rawSubjectName);
      const code = canonical ? canonical.courseCode : subjectCode;
      const name = canonical ? canonical.courseName : (rawSubjectName || 'Subject');
      const maxMarks = typeof item.max_marks === 'number' ? item.max_marks : 20;
      const obtained = parseMarksValue(
        item.marks !== undefined ? item.marks :
        item.mark !== undefined ? item.mark :
        item.obtained_marks
      );

      records.push({
        id: `se-lab-${code}-${i}`,
        subjectCode: code,
        subjectName: name,
        semester: formatSemesterName(item.semester || semId),
        category: 'Lab Evaluation',
        examName: item.exam_name || item.title || item.name || 'Lab Evaluation',
        maxMarks,
        obtainedMarks: obtained,
        source: 'students_etlab',
        sourceLabel: 'Students ETLAB',
        isLab: true,
        status: obtained !== undefined ? 'Published' : 'Awaiting marks',
      });
    }

    return records;
  } catch {
    return [];
  }
}

/**
 * Fetches historical semester results from Students ETLAB
 * GET /api/v1/results?sem_id={semId}
 */
export async function fetchStudentsEtlabPreviousResults(
  token: string,
  semId?: number | string,
  instituteId: string = DEFAULT_INSTITUTION.id
): Promise<{
  records: EtlabAssessmentRecord[];
  semesterResults: SemesterResult[];
}> {
  if (!token) return { records: [], semesterResults: [] };

  try {
    const url = semId ? `${API_BASE}/results?sem_id=${encodeURIComponent(semId)}` : `${API_BASE}/results`;

    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token, instituteId),
      cache: 'no-store',
      signal: AbortSignal.timeout(STUDENTS_ETLAB_RESULTS_TIMEOUT_MS),
    });

    if (!res.ok) return { records: [], semesterResults: [] };

    const data = await res.json().catch(() => null);
    if (!data) return { records: [], semesterResults: [] };

    const records: EtlabAssessmentRecord[] = [];
    const semesterResults: SemesterResult[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawSemesters: Record<string, any>[] = Array.isArray(data)
      ? data
      : Array.isArray(data.results)
      ? data.results
      : Array.isArray(data.semesters)
      ? data.semesters
      : [data];

    for (const sem of rawSemesters) {
      if (!sem || typeof sem !== 'object') continue;
      const semNum = Number(sem.semester || sem.sem_id || semId || 3);
      const semStr = formatSemesterName(semNum);
      const rawSubjects = Array.isArray(sem.subjects) ? sem.subjects : Array.isArray(sem.items) ? sem.items : [];

      const markItems: AssessmentMarkItem[] = [];

      for (let i = 0; i < rawSubjects.length; i++) {
        const sub = rawSubjects[i];
        const subjectCode = sub.code || sub.subject_code || '';
        const subjectName = sub.name || sub.subject_name || '';
        const canonical = matchApprovedCourse(subjectCode) || matchApprovedCourse(subjectName);
        const code = canonical ? canonical.courseCode : subjectCode;
        const name = canonical ? canonical.courseName : (subjectName || 'Subject');
        const isLab = isLabCourse(code, name);

        if (sub.series1 !== undefined || sub.series_1 !== undefined) {
          records.push({
            id: `se-hist-${code}-s1-${semNum}`,
            subjectCode: code,
            subjectName: name,
            semester: semStr,
            category: 'Sessional Exams',
            examName: 'Series Exam 1',
            maxMarks: 50,
            obtainedMarks: parseMarksValue(sub.series1 !== undefined ? sub.series1 : sub.series_1),
            source: 'students_etlab',
            sourceLabel: 'Students ETLAB',
            isLab,
            status: sub.series1 !== undefined || sub.series_1 !== undefined ? 'Published' : 'Awaiting marks',
          });
        }

        if (sub.series2 !== undefined || sub.series_2 !== undefined) {
          records.push({
            id: `se-hist-${code}-s2-${semNum}`,
            subjectCode: code,
            subjectName: name,
            semester: semStr,
            category: 'Sessional Exams',
            examName: 'Series Exam 2',
            maxMarks: 50,
            obtainedMarks: parseMarksValue(sub.series2 !== undefined ? sub.series2 : sub.series_2),
            source: 'students_etlab',
            sourceLabel: 'Students ETLAB',
            isLab,
            status: sub.series2 !== undefined || sub.series_2 !== undefined ? 'Published' : 'Awaiting marks',
          });
        }

        if (sub.internal_marks !== undefined || sub.cia !== undefined || sub.internal !== undefined) {
          records.push({
            id: `se-hist-${code}-cia-${semNum}`,
            subjectCode: code,
            subjectName: name,
            semester: semStr,
            category: isLab ? 'Lab Evaluation' : 'Internal Marks',
            examName: 'Continuous Assessment (CIA)',
            maxMarks: 50,
            obtainedMarks: parseMarksValue(sub.internal_marks !== undefined ? sub.internal_marks : sub.cia !== undefined ? sub.cia : sub.internal),
            source: 'students_etlab',
            sourceLabel: 'Students ETLAB',
            isLab,
            status: 'Published',
          });
        }

        markItems.push({
          code,
          name,
          credits: Number(sub.credits || 0),
          grade: sub.grade,
          gradePoints: typeof sub.grade_points === 'number' ? sub.grade_points : undefined,
          series1: parseMarksValue(sub.series1 !== undefined ? sub.series1 : sub.series_1),
          series2: parseMarksValue(sub.series2 !== undefined ? sub.series2 : sub.series_2),
          ciaMarks: parseMarksValue(sub.internal_marks !== undefined ? sub.internal_marks : sub.cia),
          endSemMarks: parseMarksValue(sub.end_sem_marks !== undefined ? sub.end_sem_marks : sub.ese),
          resultStatus: sub.status || (sub.grade && sub.grade !== 'F' ? 'Passed' : 'Awaited'),
        });
      }

      if (markItems.length > 0 || sem.sgpa || sem.cgpa) {
        semesterResults.push({
          semester: semNum,
          academicYear: sem.academic_year || '2024 - 2025',
          sgpa: typeof sem.sgpa === 'number' ? sem.sgpa : 0,
          cgpa: typeof sem.cgpa === 'number' ? sem.cgpa : 0,
          creditsEarned: Number(sem.credits_earned || sem.earned_credits || 0),
          totalCredits: Number(sem.total_credits || 0),
          status: sem.status || 'Passed',
          subjects: markItems,
          source: 'students_etlab',
          sourceLabel: 'Students ETLAB',
        });
      }
    }

    return { records, semesterResults };
  } catch {
    return { records: [], semesterResults: [] };
  }
}

/**
 * Fetches student semester list from Students ETLAB
 * GET /api/v1/semesterlist
 */
export async function fetchStudentsEtlabSemesterList(
  token: string,
  instituteId: string = DEFAULT_INSTITUTION.id
): Promise<{ id: number; name: string }[]> {
  if (!token) return [];

  try {
    const res = await fetch(`${API_BASE}/semesterlist`, {
      method: 'GET',
      headers: getHeaders(token, instituteId),
      cache: 'no-store',
      signal: AbortSignal.timeout(STUDENTS_ETLAB_TIMEOUT_MS),
    });

    if (!res.ok) return [];

    const data = await res.json().catch(() => null);
    if (!data) return [];

    const list = Array.isArray(data) ? data : Array.isArray(data.semesters) ? data.semesters : [];
    return list.map((item: { id?: number | string; name?: string; semester?: number | string }) => ({
      id: Number(item.id || item.semester || 1),
      name: String(item.name || `Semester ${item.id || item.semester || 1}`),
    }));
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
