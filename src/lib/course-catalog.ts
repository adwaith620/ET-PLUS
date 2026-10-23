import type { StudentProfile, SubjectAttendanceData, TimetableSlot, TeacherRecord } from '../types/index.ts';

export interface CourseDefinition {
  code: string;
  name: string;
  faculty: string;
  credits: number;
  category: 'Theory' | 'Lab' | 'Elective';
  room?: string;
}

/**
 * Verified Third-Semester Curriculum Course Catalog for B.Tech Computer Science (AI)
 * at TKM College of Engineering, Kollam.
 */
export const SEMESTER_3_COURSES: Record<string, CourseDefinition> = {
  '24CSP304': {
    code: '24CSP304',
    name: 'Data Structures and Algorithms',
    faculty: 'Mrs. ASWATHY GANDHI S',
    credits: 4,
    category: 'Theory',
    room: 'Not specified',
  },
  '24AIJ303': {
    code: '24AIJ303',
    name: 'Introduction to Machine Learning',
    faculty: 'Prof. NISA A K',
    credits: 4,
    category: 'Theory',
    room: 'Not specified',
  },
  '24AIP305': {
    code: '24AIP305',
    name: 'Computing Systems and Organization',
    faculty: 'AMINA M',
    credits: 4,
    category: 'Theory',
    room: 'Not specified',
  },
  '24MAP300': {
    code: '24MAP300',
    name: 'Advanced Linear Algebra and Transforms',
    faculty: 'Mr. FAYIS THAZHETHE PALLIYALI & Dr. DEEPAK D.',
    credits: 4,
    category: 'Theory',
    room: 'Not specified',
  },
  '24EST382': {
    code: '24EST382',
    name: 'Discrete Mathematics',
    faculty: 'Dr. MANU J PILLAI',
    credits: 4,
    category: 'Theory',
    room: 'Not specified',
  },
  '24HUT310': {
    code: '24HUT310',
    name: 'Life Skills and Professional Ethics',
    faculty: 'Prof. ANUMOD B',
    credits: 2,
    category: 'Theory',
    room: 'Not specified',
  },
  '24EST372': {
    code: '24EST372',
    name: 'Optimization Techniques',
    faculty: 'Dr. ASIF NAVAS K R',
    credits: 3,
    category: 'Theory',
    room: 'Not specified',
  },
  '24CSM3XX': {
    code: '24CSM3XX',
    name: 'MINOR/REMEDIAL',
    faculty: 'Department Faculty',
    credits: 4,
    category: 'Elective',
    room: 'Not specified',
  },
};

export interface DepartmentFacultyCourse {
  courseCode: string;
  courseName: string;
  facultyName: string;
}

/**
 * Approved Department Faculty & Course Mappings for the Timetable Section.
 * Strictly limited to the seven approved courses without practical (B) entries.
 */
export const APPROVED_DEPARTMENT_FACULTY: DepartmentFacultyCourse[] = [
  {
    courseCode: '24MAP300',
    courseName: 'Advanced Linear Algebra and Transforms',
    facultyName: 'Mr. FAYIS THAZHETHE PALLIYALI & Dr. DEEPAK D.',
  },
  {
    courseCode: '24EST382',
    courseName: 'Discrete Mathematics',
    facultyName: 'Dr. MANU J PILLAI',
  },
  {
    courseCode: '24EST372',
    courseName: 'Optimization Techniques',
    facultyName: 'Dr. ASIF NAVAS K R',
  },
  {
    courseCode: '24AIJ303',
    courseName: 'Introduction to Machine Learning',
    facultyName: 'Prof. NISA A K',
  },
  {
    courseCode: '24CSP304',
    courseName: 'Data Structures and Algorithms',
    facultyName: 'Mrs. ASWATHY GANDHI S',
  },
  {
    courseCode: '24AIP305',
    courseName: 'Computing Systems and Organization',
    facultyName: 'AMINA M',
  },
  {
    courseCode: '24HUT310',
    courseName: 'Life Skills and Professional Ethics',
    facultyName: 'Prof. ANUMOD B',
  },
];

/**
 * Match a raw code, title, or alias against the approved Semester 3 course catalog.
 */
export function matchApprovedCourse(identifier?: string): DepartmentFacultyCourse | undefined {
  if (!identifier) return undefined;
  const raw = identifier.trim();
  if (!raw || raw === '–' || raw === '-' || raw.toLowerCase().includes('free')) return undefined;

  const clean = raw.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Direct code matching (e.g. 24MAP300, MAP300)
  for (const item of APPROVED_DEPARTMENT_FACULTY) {
    const itemCodeClean = item.courseCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const itemSuffix = itemCodeClean.replace(/^24/, '');
    if (clean === itemCodeClean || clean.includes(itemCodeClean) || (itemSuffix && clean.includes(itemSuffix))) {
      return item;
    }
  }

  // 2. Full or partial course title matching
  const lower = raw.toLowerCase();
  for (const item of APPROVED_DEPARTMENT_FACULTY) {
    const nameLower = item.courseName.toLowerCase();
    if (lower === nameLower || lower.includes(nameLower) || nameLower.includes(lower)) {
      return item;
    }
  }

  // 3. Keyword-based matching for specific subjects
  if (lower.includes('machine learning') || lower.includes('aij303') || lower.includes('intro to ml')) {
    return APPROVED_DEPARTMENT_FACULTY.find((f) => f.courseCode === '24AIJ303');
  }
  if (lower.includes('data structures') || lower.includes('algorithms') || lower.includes('csp304') || lower.includes('dsa')) {
    return APPROVED_DEPARTMENT_FACULTY.find((f) => f.courseCode === '24CSP304');
  }
  if (lower.includes('computing systems') || lower.includes('organization') || lower.includes('aip305') || lower.includes('cso')) {
    return APPROVED_DEPARTMENT_FACULTY.find((f) => f.courseCode === '24AIP305');
  }
  if (lower.includes('linear algebra') || lower.includes('transforms') || lower.includes('map300')) {
    return APPROVED_DEPARTMENT_FACULTY.find((f) => f.courseCode === '24MAP300');
  }
  if (lower.includes('discrete') || lower.includes('est382')) {
    return APPROVED_DEPARTMENT_FACULTY.find((f) => f.courseCode === '24EST382');
  }
  if (lower.includes('optimization') || lower.includes('est372')) {
    return APPROVED_DEPARTMENT_FACULTY.find((f) => f.courseCode === '24EST372');
  }
  if (lower.includes('life skills') || lower.includes('ethics') || lower.includes('hut310')) {
    return APPROVED_DEPARTMENT_FACULTY.find((f) => f.courseCode === '24HUT310');
  }

  return undefined;
}

/**
 * Returns the approved faculty name for a given course code or name if found.
 */
export function getApprovedFaculty(code?: string, name?: string): string | undefined {
  const match = matchApprovedCourse(code) || matchApprovedCourse(name);
  return match?.facultyName;
}

/**
 * Normalizes a timetable slot so that:
 * 1. Codes like "Introduction to Machine Learning" become "24AIJ303"
 * 2. Faculty names like "Department Faculty" become the approved faculty names
 * 3. Free periods are strictly formatted
 */
export function normalizeTimetableSlot(slot: TimetableSlot): TimetableSlot {
  if (slot.type === 'Free' || slot.subjectCode === 'FREE') {
    return {
      ...slot,
      subjectCode: 'FREE',
      subjectName: 'Free Period / Gap',
      faculty: slot.faculty || 'No Class Scheduled',
      type: 'Free',
    };
  }

  const match = matchApprovedCourse(slot.subjectCode) || matchApprovedCourse(slot.subjectName);
  if (match) {
    return {
      ...slot,
      subjectCode: match.courseCode,
      subjectName: match.courseName,
      faculty: match.facultyName,
    };
  }

  const def = getCourseDefinition(slot.subjectCode);
  const faculty = (slot.faculty && slot.faculty !== 'Department Faculty' && slot.faculty !== 'Faculty')
    ? slot.faculty
    : (def?.faculty || slot.faculty || 'Department Faculty');

  return {
    ...slot,
    subjectCode: def?.code || slot.subjectCode,
    subjectName: def?.name || getCourseFullName(slot.subjectCode, slot.subjectName),
    faculty,
  };
}

/**
 * Returns full verified course name for a given course code or alias.
 */
export function getCourseFullName(code: string, fallbackName?: string): string {
  if (!code) return fallbackName || 'Unknown Course';
  const cleanCode = code.trim().toUpperCase();

  // Check approved course match first
  const approved = matchApprovedCourse(code) || matchApprovedCourse(fallbackName);
  if (approved) {
    return approved.courseName;
  }

  // Direct lookup
  if (SEMESTER_3_COURSES[cleanCode]) {
    return SEMESTER_3_COURSES[cleanCode].name;
  }

  // Lookup without leading '24' or partial match
  for (const [key, course] of Object.entries(SEMESTER_3_COURSES)) {
    if (cleanCode === key || cleanCode.includes(key) || key.includes(cleanCode)) {
      return course.name;
    }
    const suffix = key.replace(/^24/, '');
    if (cleanCode.includes(suffix)) {
      return course.name;
    }
  }

  return fallbackName && fallbackName.trim() ? fallbackName.trim() : code;
}

/**
 * Resolves verified course definition.
 */
export function getCourseDefinition(code: string): CourseDefinition | undefined {
  if (!code) return undefined;
  const approved = matchApprovedCourse(code);
  if (approved && SEMESTER_3_COURSES[approved.courseCode]) {
    return SEMESTER_3_COURSES[approved.courseCode];
  }

  const cleanCode = code.trim().toUpperCase();
  if (SEMESTER_3_COURSES[cleanCode]) return SEMESTER_3_COURSES[cleanCode];

  for (const [key, course] of Object.entries(SEMESTER_3_COURSES)) {
    if (cleanCode === key || cleanCode.includes(key)) return course;
    const suffix = key.replace(/^24/, '');
    if (cleanCode.includes(suffix)) return course;
  }
  return undefined;
}

/**
 * Normalizes subject attendance record so full course names are always prominent and verified.
 */
export function normalizeSubjectAttendance(sub: SubjectAttendanceData): SubjectAttendanceData {
  const verifiedDef = getCourseDefinition(sub.code);
  const approved = APPROVED_DEPARTMENT_FACULTY.find((f) => f.courseCode === (verifiedDef?.code || sub.code));
  const facultyName = approved?.facultyName || (sub.faculty && sub.faculty !== 'Department Faculty' ? sub.faculty : (verifiedDef?.faculty || 'Department Faculty'));
  return {
    ...sub,
    code: verifiedDef?.code || approved?.courseCode || sub.code,
    name: verifiedDef?.name || approved?.courseName || getCourseFullName(sub.code, sub.name),
    faculty: facultyName,
    facultyEmail: sub.facultyEmail,
    category: verifiedDef?.category || sub.category || 'Theory',
  };
}

/**
 * Verified Third-Semester Faculty and Teacher Mappings for Account A (25CTA12)
 */
export const DEMO_TEACHERS_A: TeacherRecord[] = [
  { name: 'Fayis Thazhethe Palliyali', subjectCode: '24MAP300', subjectName: 'Advanced Linear Algebra and Transforms', email: 'fayis@tkmce.ac.in', department: 'Mathematics' },
  { name: 'Deepak D', subjectCode: '24MAP300', subjectName: 'Advanced Linear Algebra and Transforms', email: 'deepak@tkmce.ac.in', department: 'Mathematics' },
  { name: 'Manu J Pillai', subjectCode: '24EST382', subjectName: 'Discrete Mathematics', email: 'manujpillai@tkmce.ac.in', department: 'Mathematics' },
  { name: 'Nisa A K', subjectCode: '24AIJ303', subjectName: 'Introduction to Machine Learning', email: 'nisa@tkmce.ac.in', department: 'Computer Science' },
  { name: 'Aswathy Gandhi S', subjectCode: '24CSP304', subjectName: 'Data Structures and Algorithms', email: 'aswathygandhi@tkmce.ac.in', department: 'Computer Science' },
  { name: 'Amina M', subjectCode: '24AIP305', subjectName: 'Computing Systems and Organization', email: 'amina@tkmce.ac.in', department: 'Computer Science' },
  { name: 'Prof. Anumod B', subjectCode: '24HUT310', subjectName: 'Life Skills and Professional Ethics', email: 'anumod@tkmce.ac.in', department: 'Humanities' },
  { name: 'Asif Navas K R', subjectCode: '24EST372', subjectName: 'Optimization Techniques', email: 'asifnavas@tkmce.ac.in', department: 'Mathematics' },
];

/**
 * Isolated First-Semester Faculty and Teacher Mappings for Account B (25CTA99)
 */
export const DEMO_TEACHERS_B: TeacherRecord[] = [
  { name: 'Dr. Reji R', subjectCode: '24MAT101', subjectName: 'Linear Algebra and Calculus', email: 'rejir@tkmce.ac.in', department: 'Mathematics' },
  { name: 'Dr. Sreeja P', subjectCode: '24CYT100', subjectName: 'Engineering Chemistry', email: 'sreejap@tkmce.ac.in', department: 'Chemistry' },
  { name: 'Prof. Mathew K', subjectCode: '24EST104', subjectName: 'Basics of Civil & Mechanical Engineering', email: 'mathewk@tkmce.ac.in', department: 'Mechanical Engineering' },
  { name: 'Dr. Lekshmi M', subjectCode: '24EST102', subjectName: 'Basics of Electrical & Electronics Engineering', email: 'lekshmim@tkmce.ac.in', department: 'Electrical Engineering' },
  { name: 'Prof. Anumod B', subjectCode: '24HUT101', subjectName: 'Life Skills', email: 'anumod@tkmce.ac.in', department: 'Humanities' },
  { name: 'Dr. Sreeja P', subjectCode: '24CYL100', subjectName: 'Engineering Chemistry Lab', email: 'sreejap@tkmce.ac.in', department: 'Chemistry' },
  { name: 'Dr. Lekshmi M', subjectCode: '24ESL102', subjectName: 'Electrical & Electronics Workshop', email: 'lekshmim@tkmce.ac.in', department: 'Electrical Engineering' },
  { name: 'Prof. Mathew K', subjectCode: '24ESL104', subjectName: 'Civil & Mechanical Workshop', email: 'mathewk@tkmce.ac.in', department: 'Mechanical Engineering' },
];

/**
 * Known address keywords to detect and prevent address fields from polluting academic profile fields
 */
const ADDRESS_KEYWORDS = [
  'cherumkuzhi',
  'house',
  'po',
  'p.o',
  'post',
  'road',
  'street',
  'lane',
  'district',
  'pin',
  'kerala',
  'kollam',
  'taluk',
  'village',
];

function isLikelyAddressArtifact(value: string | undefined): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  return ADDRESS_KEYWORDS.some((kw) => lower.includes(kw));
}

export const DEFAULT_DEPARTMENT = 'Computer Science (AI)';
export const DEFAULT_BATCH = '2025-29';

/**
 * Normalizes an authenticated or retrieved student profile according to verified Semester 3 identity.
 * Rule: Institutional email is strictly `[admissionNo]@tkmce.ac.in`.
 */
export function normalizeStudentProfile(rawProfile: Partial<StudentProfile>): StudentProfile {
  // 1. Admission Number: preserve authenticated student's admission number
  const admissionNo = (rawProfile.admissionNo || rawProfile.registerNo || '').trim();

  // 2. Department: Centralized default for all students across Overview and Profile
  const department = DEFAULT_DEPARTMENT;

  // 3. Roll number: Retain student's verified roll number in data model without cross-account contamination
  let rollNo = '';
  if (rawProfile.rollNo && !isLikelyAddressArtifact(rawProfile.rollNo)) {
    rollNo = rawProfile.rollNo.trim();
  } else if (admissionNo) {
    rollNo = admissionNo.startsWith('B') ? admissionNo : `B${admissionNo}`;
  }

  // 4. Semester: Must strictly be 3 (Third Semester)
  const semester = rawProfile.semester || 3;

  // 5. Batch & Academic Year: Centralized default 2025-29 across Overview and Profile
  const batch = DEFAULT_BATCH;
  const academicYear = rawProfile.academicYear || '2025 - 2026';

  // 6. Institutional Email: Authenticated admission number followed by @tkmce.ac.in
  const cleanAdmForEmail = admissionNo.replace(/[^a-zA-Z0-9]/g, '');
  const email = cleanAdmForEmail
    ? `${cleanAdmForEmail}@tkmce.ac.in`
    : (rawProfile.email || 'student@tkmce.ac.in');

  // 7. Student Name
  let name = 'Student';
  if (rawProfile.name && !isLikelyAddressArtifact(rawProfile.name)) {
    name = rawProfile.name.trim();
  } else if (admissionNo) {
    name = admissionNo;
  }

  return {
    name,
    admissionNo,
    registerNo: rawProfile.registerNo || admissionNo || 'TKM25CSAI012',
    rollNo,
    dob: rawProfile.dob || '2005-08-22',
    gender: rawProfile.gender || 'Male',
    department,
    programme: rawProfile.programme || 'B.Tech in Computer Science and Engineering (Artificial Intelligence)',
    semester,
    batch,
    academicYear,
    institution: 'TKM College of Engineering, Kollam',
    photoUrl: rawProfile.photoUrl,
    email,
    mobile: rawProfile.mobile || '+91 98470 12345',
  };
}

/**
 * Official Third-Semester Timetable extracted directly from uploaded Time Table.pdf
 * for B.Tech Computer Science (AI), TKM College of Engineering.
 * Default location: WR101. Practical sessions placed in specified laboratories.
 * Friday 4th period has no scheduled class.
 */
export const SEMESTER_3_OFFICIAL_TIMETABLE: TimetableSlot[] = [
  // Monday (All WR101, Theory)
  { day: 'Monday', period: 1, startTime: '09:00', endTime: '09:55', subjectCode: '24CSP304', subjectName: 'Data Structures and Algorithms', faculty: 'Mrs. ASWATHY GANDHI S', room: 'WR101', type: 'Theory' },
  { day: 'Monday', period: 2, startTime: '10:00', endTime: '10:55', subjectCode: '24AIJ303', subjectName: 'Introduction to Machine Learning', faculty: 'Prof. NISA A K', room: 'WR101', type: 'Theory' },
  { day: 'Monday', period: 3, startTime: '11:05', endTime: '12:00', subjectCode: '24AIJ303', subjectName: 'Introduction to Machine Learning', faculty: 'Prof. NISA A K', room: 'WR101', type: 'Theory' },
  { day: 'Monday', period: 4, startTime: '13:00', endTime: '13:55', subjectCode: '24CSP304', subjectName: 'Data Structures and Algorithms', faculty: 'Mrs. ASWATHY GANDHI S', room: 'WR101', type: 'Theory' },
  { day: 'Monday', period: 5, startTime: '14:00', endTime: '14:55', subjectCode: '24HUT310', subjectName: 'Life Skills and Professional Ethics', faculty: 'Prof. ANUMOD B', room: 'WR101', type: 'Theory' },
  { day: 'Monday', period: 6, startTime: '15:05', endTime: '16:00', subjectCode: '24EST382', subjectName: 'Discrete Mathematics', faculty: 'Dr. MANU J PILLAI', room: 'WR101', type: 'Theory' },

  // Tuesday (Periods 2 & 3: Computing Lab)
  { day: 'Tuesday', period: 1, startTime: '09:00', endTime: '09:55', subjectCode: '24AIJ303', subjectName: 'Introduction to Machine Learning', faculty: 'Prof. NISA A K', room: 'WR101', type: 'Theory' },
  { day: 'Tuesday', period: 2, startTime: '10:00', endTime: '10:55', subjectCode: '24CSP304', subjectName: 'Data Structures and Algorithms', faculty: 'Mrs. ASWATHY GANDHI S', room: 'Computing Lab', type: 'Lab' },
  { day: 'Tuesday', period: 3, startTime: '11:05', endTime: '12:00', subjectCode: '24CSP304', subjectName: 'Data Structures and Algorithms', faculty: 'Mrs. ASWATHY GANDHI S', room: 'Computing Lab', type: 'Lab' },
  { day: 'Tuesday', period: 4, startTime: '13:00', endTime: '13:55', subjectCode: '24AIP305', subjectName: 'Computing Systems and Organization', faculty: 'AMINA M', room: 'WR101', type: 'Theory' },
  { day: 'Tuesday', period: 5, startTime: '14:00', endTime: '14:55', subjectCode: '24MAP300', subjectName: 'Advanced Linear Algebra and Transforms', faculty: 'Mr. FAYIS THAZHETHE PALLIYALI & Dr. DEEPAK D.', room: 'WR101', type: 'Theory' },
  { day: 'Tuesday', period: 6, startTime: '15:05', endTime: '16:00', subjectCode: '24EST372', subjectName: 'Optimization Techniques', faculty: 'Dr. ASIF NAVAS K R', room: 'WR101', type: 'Theory' },

  // Wednesday (All WR101)
  { day: 'Wednesday', period: 1, startTime: '09:00', endTime: '09:55', subjectCode: '24HUT310', subjectName: 'Life Skills and Professional Ethics', faculty: 'Prof. ANUMOD B', room: 'WR101', type: 'Theory' },
  { day: 'Wednesday', period: 2, startTime: '10:00', endTime: '10:55', subjectCode: '24AIJ303', subjectName: 'Introduction to Machine Learning', faculty: 'Prof. NISA A K', room: 'WR101', type: 'Theory' },
  { day: 'Wednesday', period: 3, startTime: '11:05', endTime: '12:00', subjectCode: '24MAP300', subjectName: 'Advanced Linear Algebra and Transforms', faculty: 'Mr. FAYIS THAZHETHE PALLIYALI & Dr. DEEPAK D.', room: 'WR101', type: 'Theory' },
  { day: 'Wednesday', period: 4, startTime: '13:00', endTime: '13:55', subjectCode: '24AIP305', subjectName: 'Computing Systems and Organization', faculty: 'AMINA M', room: 'WR101', type: 'Theory' },
  { day: 'Wednesday', period: 5, startTime: '14:00', endTime: '14:55', subjectCode: '24EST372', subjectName: 'Optimization Techniques', faculty: 'Dr. ASIF NAVAS K R', room: 'WR101', type: 'Theory' },
  { day: 'Wednesday', period: 6, startTime: '15:05', endTime: '16:00', subjectCode: '24CSP304', subjectName: 'Data Structures and Algorithms', faculty: 'Mrs. ASWATHY GANDHI S', room: 'WR101', type: 'Theory' },

  // Thursday (Periods 2 & 3: AI LAB, Periods 4 & 5: LAB)
  { day: 'Thursday', period: 1, startTime: '09:00', endTime: '09:55', subjectCode: '24EST382', subjectName: 'Discrete Mathematics', faculty: 'Dr. MANU J PILLAI', room: 'WR101', type: 'Theory' },
  { day: 'Thursday', period: 2, startTime: '10:00', endTime: '10:55', subjectCode: '24AIP305', subjectName: 'Computing Systems and Organization', faculty: 'AMINA M', room: 'AI LAB', type: 'Lab' },
  { day: 'Thursday', period: 3, startTime: '11:05', endTime: '12:00', subjectCode: '24AIP305', subjectName: 'Computing Systems and Organization', faculty: 'AMINA M', room: 'AI LAB', type: 'Lab' },
  { day: 'Thursday', period: 4, startTime: '13:00', endTime: '13:55', subjectCode: '24MAP300', subjectName: 'Advanced Linear Algebra and Transforms', faculty: 'Mr. FAYIS THAZHETHE PALLIYALI & Dr. DEEPAK D.', room: 'LAB', type: 'Lab' },
  { day: 'Thursday', period: 5, startTime: '14:00', endTime: '14:55', subjectCode: '24MAP300', subjectName: 'Advanced Linear Algebra and Transforms', faculty: 'Mr. FAYIS THAZHETHE PALLIYALI & Dr. DEEPAK D.', room: 'LAB', type: 'Lab' },
  { day: 'Thursday', period: 6, startTime: '15:05', endTime: '16:00', subjectCode: '24HUT310', subjectName: 'Life Skills and Professional Ethics', faculty: 'Prof. ANUMOD B', room: 'WR101', type: 'Theory' },

  // Friday (Period 1: Life Skills, Period 4: Free/Unscheduled Gap, Period 5: Computing Lab, Period 6: Discrete Mathematics)
  { day: 'Friday', period: 1, startTime: '09:00', endTime: '09:55', subjectCode: '24HUT310', subjectName: 'Life Skills and Professional Ethics', faculty: 'Prof. ANUMOD B', room: 'WR101', type: 'Theory' },
  { day: 'Friday', period: 2, startTime: '10:00', endTime: '10:55', subjectCode: '24MAP300', subjectName: 'Advanced Linear Algebra and Transforms', faculty: 'Mr. FAYIS THAZHETHE PALLIYALI & Dr. DEEPAK D.', room: 'WR101', type: 'Theory' },
  { day: 'Friday', period: 3, startTime: '11:05', endTime: '12:00', subjectCode: '24MAP300', subjectName: 'Advanced Linear Algebra and Transforms', faculty: 'Mr. FAYIS THAZHETHE PALLIYALI & Dr. DEEPAK D.', room: 'WR101', type: 'Theory' },
  { day: 'Friday', period: 4, startTime: '13:00', endTime: '13:55', subjectCode: 'FREE', subjectName: 'Free Period / Gap', faculty: 'No Class Scheduled', room: '–', type: 'Free' },
  { day: 'Friday', period: 5, startTime: '14:00', endTime: '14:55', subjectCode: '24AIJ303', subjectName: 'Introduction to Machine Learning', faculty: 'Prof. NISA A K', room: 'Computing Lab', type: 'Lab' },
  { day: 'Friday', period: 6, startTime: '15:05', endTime: '16:00', subjectCode: '24EST382', subjectName: 'Discrete Mathematics', faculty: 'Dr. MANU J PILLAI', room: 'WR101', type: 'Theory' },
];

/**
 * Isolated First-Semester Timetable for Account B (25CTA99 / Circuit Branch)
 * Ensuring student schedules are never cross-pollinated or shared across different student accounts.
 */
export const STUDENT_B_TIMETABLE: TimetableSlot[] = [
  // Monday
  { day: 'Monday', period: 1, startTime: '09:00', endTime: '09:55', subjectCode: '24MAT101', subjectName: 'Linear Algebra and Calculus', faculty: 'Dr. Reji R', type: 'Theory' },
  { day: 'Monday', period: 2, startTime: '10:00', endTime: '10:55', subjectCode: '24CYT100', subjectName: 'Engineering Chemistry', faculty: 'Dr. Sreeja P', type: 'Theory' },
  { day: 'Monday', period: 3, startTime: '11:05', endTime: '12:00', subjectCode: '24EST104', subjectName: 'Basics of Civil & Mechanical Engineering', faculty: 'Prof. Mathew K', type: 'Theory' },
  { day: 'Monday', period: 4, startTime: '13:00', endTime: '13:55', subjectCode: '24EST102', subjectName: 'Basics of Electrical & Electronics Engineering', faculty: 'Dr. Lekshmi M', type: 'Theory' },
  { day: 'Monday', period: 5, startTime: '14:00', endTime: '14:55', subjectCode: '24CYL100', subjectName: 'Engineering Chemistry Lab', faculty: 'Dr. Sreeja P', type: 'Lab' },
  { day: 'Monday', period: 6, startTime: '15:05', endTime: '16:00', subjectCode: '24CYL100', subjectName: 'Engineering Chemistry Lab', faculty: 'Dr. Sreeja P', type: 'Lab' },

  // Tuesday
  { day: 'Tuesday', period: 1, startTime: '09:00', endTime: '09:55', subjectCode: '24CYT100', subjectName: 'Engineering Chemistry', faculty: 'Dr. Sreeja P', type: 'Theory' },
  { day: 'Tuesday', period: 2, startTime: '10:00', endTime: '10:55', subjectCode: '24MAT101', subjectName: 'Linear Algebra and Calculus', faculty: 'Dr. Reji R', type: 'Theory' },
  { day: 'Tuesday', period: 3, startTime: '11:05', endTime: '12:00', subjectCode: '24EST102', subjectName: 'Basics of Electrical & Electronics Engineering', faculty: 'Dr. Lekshmi M', type: 'Theory' },
  { day: 'Tuesday', period: 4, startTime: '13:00', endTime: '13:55', subjectCode: '24EST104', subjectName: 'Basics of Civil & Mechanical Engineering', faculty: 'Prof. Mathew K', type: 'Theory' },
  { day: 'Tuesday', period: 5, startTime: '14:00', endTime: '14:55', subjectCode: '24HUT101', subjectName: 'Life Skills', faculty: 'Prof. Anumod B', type: 'Theory' },
  { day: 'Tuesday', period: 6, startTime: '15:05', endTime: '16:00', subjectCode: 'FREE', subjectName: 'Free Period / Gap', faculty: 'No Class Scheduled', type: 'Free' },

  // Wednesday
  { day: 'Wednesday', period: 1, startTime: '09:00', endTime: '09:55', subjectCode: '24MAT101', subjectName: 'Linear Algebra and Calculus', faculty: 'Dr. Reji R', type: 'Theory' },
  { day: 'Wednesday', period: 2, startTime: '10:00', endTime: '10:55', subjectCode: '24EST104', subjectName: 'Basics of Civil & Mechanical Engineering', faculty: 'Prof. Mathew K', type: 'Theory' },
  { day: 'Wednesday', period: 3, startTime: '11:05', endTime: '12:00', subjectCode: '24CYT100', subjectName: 'Engineering Chemistry', faculty: 'Dr. Sreeja P', type: 'Theory' },
  { day: 'Wednesday', period: 4, startTime: '13:00', endTime: '13:55', subjectCode: '24EST102', subjectName: 'Basics of Electrical & Electronics Engineering', faculty: 'Dr. Lekshmi M', type: 'Theory' },
  { day: 'Wednesday', period: 5, startTime: '14:00', endTime: '14:55', subjectCode: '24ESL102', subjectName: 'Electrical & Electronics Workshop', faculty: 'Dr. Lekshmi M', type: 'Lab' },
  { day: 'Wednesday', period: 6, startTime: '15:05', endTime: '16:00', subjectCode: '24ESL102', subjectName: 'Electrical & Electronics Workshop', faculty: 'Dr. Lekshmi M', type: 'Lab' },

  // Thursday
  { day: 'Thursday', period: 1, startTime: '09:00', endTime: '09:55', subjectCode: '24EST102', subjectName: 'Basics of Electrical & Electronics Engineering', faculty: 'Dr. Lekshmi M', type: 'Theory' },
  { day: 'Thursday', period: 2, startTime: '10:00', endTime: '10:55', subjectCode: '24MAT101', subjectName: 'Linear Algebra and Calculus', faculty: 'Dr. Reji R', type: 'Theory' },
  { day: 'Thursday', period: 3, startTime: '11:05', endTime: '12:00', subjectCode: '24HUT101', subjectName: 'Life Skills', faculty: 'Prof. Anumod B', type: 'Theory' },
  { day: 'Thursday', period: 4, startTime: '13:00', endTime: '13:55', subjectCode: '24CYT100', subjectName: 'Engineering Chemistry', faculty: 'Dr. Sreeja P', type: 'Theory' },
  { day: 'Thursday', period: 5, startTime: '14:00', endTime: '14:55', subjectCode: '24EST104', subjectName: 'Basics of Civil & Mechanical Engineering', faculty: 'Prof. Mathew K', type: 'Theory' },
  { day: 'Thursday', period: 6, startTime: '15:05', endTime: '16:00', subjectCode: 'FREE', subjectName: 'Free Period / Gap', faculty: 'No Class Scheduled', type: 'Free' },

  // Friday
  { day: 'Friday', period: 1, startTime: '09:00', endTime: '09:55', subjectCode: '24CYT100', subjectName: 'Engineering Chemistry', faculty: 'Dr. Sreeja P', type: 'Theory' },
  { day: 'Friday', period: 2, startTime: '10:00', endTime: '10:55', subjectCode: '24MAT101', subjectName: 'Linear Algebra and Calculus', faculty: 'Dr. Reji R', type: 'Theory' },
  { day: 'Friday', period: 3, startTime: '11:05', endTime: '12:00', subjectCode: '24EST104', subjectName: 'Basics of Civil & Mechanical Engineering', faculty: 'Prof. Mathew K', type: 'Theory' },
  { day: 'Friday', period: 4, startTime: '13:00', endTime: '13:55', subjectCode: 'FREE', subjectName: 'Free Period / Gap', faculty: 'No Class Scheduled', type: 'Free' },
  { day: 'Friday', period: 5, startTime: '14:00', endTime: '14:55', subjectCode: '24ESL104', subjectName: 'Civil & Mechanical Workshop', faculty: 'Prof. Mathew K', type: 'Lab' },
  { day: 'Friday', period: 6, startTime: '15:05', endTime: '16:00', subjectCode: '24ESL104', subjectName: 'Civil & Mechanical Workshop', faculty: 'Prof. Mathew K', type: 'Lab' },
];

/**
 * Maps authoritative faculty and teacher records to subject attendance items.
 * Preserves all valid teacher names and email addresses.
 */
export function applyTeachersToSubjects(subjects: SubjectAttendanceData[], teachers?: TeacherRecord[]): SubjectAttendanceData[] {
  if (!teachers || teachers.length === 0) return subjects;

  return subjects.map((sub) => {
    const cleanSubCode = sub.code.trim().toUpperCase();
    const matchingTeachers = teachers.filter((t) => {
      const tCode = t.subjectCode.trim().toUpperCase();
      return tCode === cleanSubCode || cleanSubCode.includes(tCode) || tCode.includes(cleanSubCode);
    });

    if (matchingTeachers.length > 0) {
      const facultyNames = Array.from(new Set(matchingTeachers.map((t) => t.name))).join(' and ');
      const facultyEmails = Array.from(new Set(matchingTeachers.map((t) => t.email).filter(Boolean))).join(', ');
      return {
        ...sub,
        faculty: facultyNames || sub.faculty,
        facultyEmail: facultyEmails || sub.facultyEmail,
      };
    }
    return sub;
  });
}

/**
 * Maps authoritative faculty and teacher records to timetable slots.
 */
export function applyTeachersToTimetable(slots: TimetableSlot[], teachers?: TeacherRecord[]): TimetableSlot[] {
  if (!slots) return [];

  return slots.map((rawSlot) => {
    const slot = normalizeTimetableSlot(rawSlot);
    if (slot.type === 'Free' || slot.subjectCode === 'FREE') return slot;

    // 1. If explicit teachers array is provided and contains a match for this slot:
    if (teachers && teachers.length > 0) {
      const cleanCode = slot.subjectCode.trim().toUpperCase();
      const matchingTeachers = teachers.filter((t) => {
        const tCode = t.subjectCode.trim().toUpperCase();
        return tCode === cleanCode || cleanCode.includes(tCode) || tCode.includes(cleanCode);
      });

      if (matchingTeachers.length > 0) {
        const names = Array.from(new Set(matchingTeachers.map((t) => t.name))).join(' and ');
        return {
          ...slot,
          faculty: names,
        };
      }
    }

    // 2. Check approved department faculty catalog
    const approved = matchApprovedCourse(slot.subjectCode) || matchApprovedCourse(slot.subjectName);
    if (approved) {
      return {
        ...slot,
        subjectCode: approved.courseCode,
        subjectName: approved.courseName,
        faculty: approved.facultyName,
      };
    }

    return slot;
  });
}


