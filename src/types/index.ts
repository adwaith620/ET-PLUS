export interface StudentProfile {
  name: string;
  admissionNo: string;
  registerNo: string;
  rollNo?: string;
  dob?: string;
  gender?: string;
  department: string;
  programme: string;
  semester: number;
  batch: string;
  academicYear: string;
  institution: string;
  photoUrl?: string;
  email?: string;
  mobile?: string;
}

export interface SubjectAttendanceData {
  code: string;
  name: string;
  faculty: string;
  facultyEmail?: string;
  attendedHours: number;
  totalHours: number;
  category?: 'Theory' | 'Lab' | 'Elective';
  source?: AcademicSourceType;
  sourceLabel?: string;
}

export interface TeacherRecord {
  name: string;
  subjectCode: string;
  subjectName: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
}

export interface SubjectAttendance extends SubjectAttendanceData {
  percentage: number;
  status: 'safe' | 'warning' | 'critical';
  safeBunks: number;
  classesToRecover: number;
}

export interface AttendanceSummary {
  totalAttended: number;
  totalConducted: number;
  overallPercentage: number;
  targetPercentage: number;
  status: 'safe' | 'warning' | 'critical';
  safeBunks: number;
  classesToRecover: number;
  subjects: SubjectAttendance[];
  isAvailable?: boolean;
}

export interface PeriodAttendanceRecord {
  period: number;
  time?: string;
  subjectCode: string;
  subjectName: string;
  status: 'present' | 'absent' | 'not_conducted';
}

export interface DayAttendanceHistory {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  periods: PeriodAttendanceRecord[];
  totalPresent: number;
  totalConducted: number;
}

export interface TimetableSlot {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  period: number;
  startTime: string;
  endTime: string;
  subjectCode: string;
  subjectName: string;
  faculty: string;
  room?: string;
  type?: 'Theory' | 'Lab' | 'Tutorial' | 'Elective' | 'Free';
}

export interface EtlabAssessmentRecord {
  id: string;
  subjectCode: string;
  subjectName: string;
  semester: string; // 'IIIrd Semester' | 'IInd Semester' | 'Ist Semester'
  category: string; // 'Sessional Exams' | 'Module Test' | 'Class Projects' | 'Assignments' | 'Tutorials' | 'Seminars' | 'Internal Marks' | 'Lab Evaluation' | 'Lab Internal Test'
  examName: string; // e.g. 'Series Exam 1', 'Series Exam 2'
  maxMarks: number;
  obtainedMarks?: number;
  viewResponseUrl?: string;
  source?: AcademicSourceType;
  sourceLabel?: string;
  isLab?: boolean;
  evaluationTitle?: string;
  submissionStatus?: string;
  evaluationDate?: string;
  deadline?: string;
  feedback?: string;
  status?: string;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  subjectCode: string;
  faculty: string;
  publishDate: string;
  dueDate: string;
  status: 'upcoming' | 'pending' | 'submitted' | 'completed' | 'graded' | 'overdue';
  description: string;
  submissionMode?: 'Online' | 'Offline' | 'Submission mode not specified';
  maxMarks?: number;
  obtainedMarks?: number;
  attachmentName?: string;
  attachmentUrl?: string;
  externalUrl?: string;
  announcementId?: string;
  deadlineDate?: string;
  deadlineTime?: string;
  semester?: string | number;
  evaluationType?: string;
  feedback?: string;
  submissionStatus?: 'Pending' | 'Not Submitted' | 'Submitted' | 'Evaluated' | 'Awaiting Marks' | 'Overdue';
}

export interface StudyMaterial {
  id: string;
  title: string;
  subject: string;
  subjectCode: string;
  faculty: string;
  uploadedDate: string;
  fileType: 'pdf' | 'ppt' | 'pptx' | 'doc' | 'docx' | 'zip' | 'link' | string;
  fileSize?: string;
  downloadUrl: string;
  topic?: string;
  category?: 'courseware' | 'pyq' | 'notes' | 'cheatsheet' | 'slides' | 'lab' | 'assignment' | 'question_bank' | 'other' | string;
  description?: string;
  uploadedBy?: string;
  uploaderUsername?: string;
  isShared?: boolean;
  semester?: number | string;
  unit?: string;
  tags?: string[];
}

export interface AssessmentMarkItem {
  code: string;
  name: string;
  credits: number;
  series1?: number; // Series Test 1 out of 50
  series2?: number; // Series Test 2 out of 50
  internalTest1?: number; // alias for series1
  internalTest2?: number; // alias for series2
  assignmentMarks?: number; // out of 15
  attendanceMarks?: number; // out of 10
  ciaMarks?: number; // Continuous Internal Assessment (out of 50)
  totalInternal?: number; // alias for ciaMarks
  endSemMarks?: number; // End-Semester Exam mark out of 100
  grade?: string; // O, A+, A, B+, B, C, P, F
  gradePoints?: number; // 10.0, 9.0, 8.5, etc.
  resultStatus?: string; // 'Passed' | 'Failed' | 'In Progress' | 'Awaited'
}

export interface SemesterResult {
  semester: number;
  academicYear: string;
  sgpa: number;
  cgpa: number;
  creditsEarned: number;
  totalCredits: number;
  status: 'Passed' | 'Result Published' | 'In Progress' | 'Awaited';
  subjects: AssessmentMarkItem[];
  source?: AcademicSourceType;
  sourceLabel?: string;
}

export interface Announcement {
  id: string;
  title: string;
  date: string;
  author: string;
  authorUsername?: string;
  category: 'Academic' | 'Exam' | 'Hostel' | 'Placement' | 'General' | 'Cohort' | 'Project' | 'Assignment' | string;
  content: string;
  pinned?: boolean;
  link?: string;
  isCohortShared?: boolean;
  cohort?: string;
  isAssignment?: boolean;
  deadlineDate?: string;
  deadlineTime?: string;
  subjectCode?: string;
  subject?: string;
  status?: 'published' | 'draft';
}

export interface NotificationItem {
  id: string;
  type: 'assignment' | 'attendance' | 'material' | 'announcement' | 'timetable';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  isSystemWarning?: boolean;
}

export interface AuthSession {
  mode: 'live' | 'demo';
  username: string;
  displayName: string;
  sessionId?: string; // Source 1: ETLAB classic TKMSESSIONID
  studentsToken?: string; // Source 2: Students ETLAB bearer token
  instituteId?: string; // Default: 'tkmce'
  sourcesConnected?: {
    etlab: boolean;
    studentsEtlab: boolean;
  };
  expiresAt: number;
}

export type AcademicSourceType =
  | 'etlab_classic'
  | 'etlab-classic'
  | 'students_etlab'
  | 'students-etlab'
  | 'unified'
  | 'demo';

export interface InstitutionConfig {
  id: string; // e.g. 'tkmce'
  name: string; // e.g. 'TKM College of Engineering, Kollam'
  shortName: string; // e.g. 'TKMCE'
  apiBaseUrl?: string; // defaults to 'https://api.students.etlab.app/api/v1'
  portalDomain?: string; // 'tkmce.etlab.in'
}

export interface StudentsEtlabLoginResult {
  success: boolean;
  token?: string;
  userData?: {
    id?: number | string;
    uname?: string;
    username?: string;
    profile_name?: string;
    user_type?: string;
    admission_no?: string;
    batch?: string;
    semester?: number | string;
    department?: string;
    institution?: string;
    [key: string]: unknown;
  };
  error?: string;
  errorCategory?: 'TIMEOUT' | 'UPSTREAM_UNAVAILABLE' | 'INVALID_CREDENTIALS' | 'MALFORMED_RESPONSE' | 'VALIDATION';
  statusCode?: number;
}

export interface AcademicSourceHealth {
  etlabClassic: {
    connected: boolean;
    latencyMs?: number;
    lastSynced?: string;
    error?: string;
  };
  studentsEtlab: {
    connected: boolean;
    latencyMs?: number;
    lastSynced?: string;
    error?: string;
  };
  primarySource: AcademicSourceType;
  lastUpdated?: string;
}

export interface AcademicStanding {
  cgpa?: number;
  sgpa?: number;
  creditsEarned?: number;
  totalCredits?: number;
  totalPassed?: number;
  totalFailed?: number;
  academicStatus?: string;
  semester?: number;
  status?: string;
  source: AcademicSourceType;
  lastUpdated?: string;
  academicYear?: string;
  publishedResults?: {
    semester: number;
    sgpa?: number;
    cgpa?: number;
    creditsEarned?: number;
    totalCredits?: number;
    status: string;
    academicYear?: string;
    subjects?: AssessmentMarkItem[];
  }[];
}
