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
  attendedHours: number;
  totalHours: number;
  category?: 'Theory' | 'Lab' | 'Elective';
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
  type?: 'Theory' | 'Lab' | 'Tutorial';
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  subjectCode: string;
  faculty: string;
  publishDate: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded' | 'overdue';
  description: string;
  maxMarks?: number;
  obtainedMarks?: number;
  attachmentName?: string;
  attachmentUrl?: string;
  externalUrl?: string;
}

export interface StudyMaterial {
  id: string;
  title: string;
  subject: string;
  subjectCode: string;
  faculty: string;
  uploadedDate: string;
  fileType: 'pdf' | 'ppt' | 'doc' | 'zip' | 'link';
  fileSize?: string;
  downloadUrl: string;
  topic?: string;
}

export interface AssessmentMarkItem {
  code: string;
  name: string;
  credits: number;
  internalTest1?: number; // out of 50
  internalTest2?: number; // out of 50
  assignmentMarks?: number; // out of 15
  attendanceMarks?: number; // out of 10
  totalInternal?: number; // out of 50
  grade?: string;
  gradePoints?: number;
}

export interface SemesterResult {
  semester: number;
  academicYear: string;
  sgpa: number;
  cgpa: number;
  creditsEarned: number;
  totalCredits: number;
  status: 'Passed' | 'Result Published' | 'In Progress';
  subjects: AssessmentMarkItem[];
}

export interface Announcement {
  id: string;
  title: string;
  date: string;
  author: string;
  category: 'Academic' | 'Exam' | 'Hostel' | 'Placement' | 'General';
  content: string;
  pinned?: boolean;
  link?: string;
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
  sessionId?: string; // ETLAB TKMSESSIONID for live session
  expiresAt: number;
}
