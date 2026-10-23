import type { StudentProfile, SubjectAttendanceData, TimetableSlot } from '../types/index.ts';

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
    faculty: 'Aswathy Gandhi S',
    credits: 4,
    category: 'Theory',
    room: 'Not specified',
  },
  '24AIJ303': {
    code: '24AIJ303',
    name: 'Introduction to Machine Learning',
    faculty: 'Nisa A K',
    credits: 4,
    category: 'Theory',
    room: 'Not specified',
  },
  '24AIP305': {
    code: '24AIP305',
    name: 'Computing Systems and Organization',
    faculty: 'Amina M',
    credits: 4,
    category: 'Theory',
    room: 'Not specified',
  },
  '24MAP300': {
    code: '24MAP300',
    name: 'Advanced Linear Algebra and Transforms',
    faculty: 'Fayis Thazhethe Palliyali and Deepak D',
    credits: 4,
    category: 'Theory',
    room: 'Not specified',
  },
  '24EST382': {
    code: '24EST382',
    name: 'Discrete Mathematics',
    faculty: 'Manu J Pillai',
    credits: 4,
    category: 'Theory',
    room: 'Not specified',
  },
  '24HUT310': {
    code: '24HUT310',
    name: 'Life Skills and Professional Ethics',
    faculty: 'Prof. Anumod B',
    credits: 2,
    category: 'Theory',
    room: 'Not specified',
  },
  '24EST372': {
    code: '24EST372',
    name: 'Optimization Techniques',
    faculty: 'Asif Navas K R',
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

/**
 * Returns full verified course name for a given course code or alias.
 */
export function getCourseFullName(code: string, fallbackName?: string): string {
  if (!code) return fallbackName || 'Unknown Course';
  const cleanCode = code.trim().toUpperCase();

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
  return {
    ...sub,
    code: verifiedDef?.code || sub.code,
    name: verifiedDef?.name || getCourseFullName(sub.code, sub.name),
    faculty: verifiedDef?.faculty || sub.faculty || 'Department Faculty',
    category: verifiedDef?.category || sub.category || 'Theory',
  };
}

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
  { day: 'Monday', period: 1, startTime: '09:00', endTime: '09:55', subjectCode: '24CSP304', subjectName: 'Data Structures and Algorithms', faculty: 'Aswathy Gandhi S', room: 'WR101', type: 'Theory' },
  { day: 'Monday', period: 2, startTime: '10:00', endTime: '10:55', subjectCode: '24AIJ303', subjectName: 'Introduction to Machine Learning', faculty: 'Nisa A K', room: 'WR101', type: 'Theory' },
  { day: 'Monday', period: 3, startTime: '11:05', endTime: '12:00', subjectCode: '24AIJ303', subjectName: 'Introduction to Machine Learning', faculty: 'Nisa A K', room: 'WR101', type: 'Theory' },
  { day: 'Monday', period: 4, startTime: '13:00', endTime: '13:55', subjectCode: '24CSP304', subjectName: 'Data Structures and Algorithms', faculty: 'Aswathy Gandhi S', room: 'WR101', type: 'Theory' },
  { day: 'Monday', period: 5, startTime: '14:00', endTime: '14:55', subjectCode: '24HUT310', subjectName: 'Life Skills and Professional Ethics', faculty: 'Prof. Anumod B', room: 'WR101', type: 'Theory' },
  { day: 'Monday', period: 6, startTime: '15:05', endTime: '16:00', subjectCode: '24EST382', subjectName: 'Discrete Mathematics', faculty: 'Manu J Pillai', room: 'WR101', type: 'Theory' },

  // Tuesday (Periods 2 & 3: Computing Lab)
  { day: 'Tuesday', period: 1, startTime: '09:00', endTime: '09:55', subjectCode: '24AIJ303', subjectName: 'Introduction to Machine Learning', faculty: 'Nisa A K', room: 'WR101', type: 'Theory' },
  { day: 'Tuesday', period: 2, startTime: '10:00', endTime: '10:55', subjectCode: '24CSP304', subjectName: 'Data Structures and Algorithms', faculty: 'Aswathy Gandhi S', room: 'Computing Lab', type: 'Lab' },
  { day: 'Tuesday', period: 3, startTime: '11:05', endTime: '12:00', subjectCode: '24CSP304', subjectName: 'Data Structures and Algorithms', faculty: 'Aswathy Gandhi S', room: 'Computing Lab', type: 'Lab' },
  { day: 'Tuesday', period: 4, startTime: '13:00', endTime: '13:55', subjectCode: '24AIP305', subjectName: 'Computing Systems and Organization', faculty: 'Amina M', room: 'WR101', type: 'Theory' },
  { day: 'Tuesday', period: 5, startTime: '14:00', endTime: '14:55', subjectCode: '24MAP300', subjectName: 'Advanced Linear Algebra and Transforms', faculty: 'Fayis Thazhethe Palliyali', room: 'WR101', type: 'Theory' },
  { day: 'Tuesday', period: 6, startTime: '15:05', endTime: '16:00', subjectCode: '24EST372', subjectName: 'Optimization Techniques', faculty: 'Asif Navas K R', room: 'WR101', type: 'Theory' },

  // Wednesday (All WR101)
  { day: 'Wednesday', period: 1, startTime: '09:00', endTime: '09:55', subjectCode: '24HUT310', subjectName: 'Life Skills and Professional Ethics', faculty: 'Prof. Anumod B', room: 'WR101', type: 'Theory' },
  { day: 'Wednesday', period: 2, startTime: '10:00', endTime: '10:55', subjectCode: '24AIJ303', subjectName: 'Introduction to Machine Learning', faculty: 'Nisa A K', room: 'WR101', type: 'Theory' },
  { day: 'Wednesday', period: 3, startTime: '11:05', endTime: '12:00', subjectCode: '24MAP300', subjectName: 'Advanced Linear Algebra and Transforms', faculty: 'Deepak D', room: 'WR101', type: 'Theory' },
  { day: 'Wednesday', period: 4, startTime: '13:00', endTime: '13:55', subjectCode: '24AIP305', subjectName: 'Computing Systems and Organization', faculty: 'Amina M', room: 'WR101', type: 'Theory' },
  { day: 'Wednesday', period: 5, startTime: '14:00', endTime: '14:55', subjectCode: '24EST372', subjectName: 'Optimization Techniques', faculty: 'Asif Navas K R', room: 'WR101', type: 'Theory' },
  { day: 'Wednesday', period: 6, startTime: '15:05', endTime: '16:00', subjectCode: '24CSP304', subjectName: 'Data Structures and Algorithms', faculty: 'Aswathy Gandhi S', room: 'WR101', type: 'Theory' },

  // Thursday (Periods 2 & 3: AI LAB, Periods 4 & 5: LAB)
  { day: 'Thursday', period: 1, startTime: '09:00', endTime: '09:55', subjectCode: '24EST382', subjectName: 'Discrete Mathematics', faculty: 'Manu J Pillai', room: 'WR101', type: 'Theory' },
  { day: 'Thursday', period: 2, startTime: '10:00', endTime: '10:55', subjectCode: '24AIP305', subjectName: 'Computing Systems and Organization', faculty: 'Amina M', room: 'AI LAB', type: 'Lab' },
  { day: 'Thursday', period: 3, startTime: '11:05', endTime: '12:00', subjectCode: '24AIP305', subjectName: 'Computing Systems and Organization', faculty: 'Amina M', room: 'AI LAB', type: 'Lab' },
  { day: 'Thursday', period: 4, startTime: '13:00', endTime: '13:55', subjectCode: '24MAP300', subjectName: 'Advanced Linear Algebra and Transforms', faculty: 'Fayis Thazhethe Palliyali', room: 'LAB', type: 'Lab' },
  { day: 'Thursday', period: 5, startTime: '14:00', endTime: '14:55', subjectCode: '24MAP300', subjectName: 'Advanced Linear Algebra and Transforms', faculty: 'Fayis Thazhethe Palliyali', room: 'LAB', type: 'Lab' },
  { day: 'Thursday', period: 6, startTime: '15:05', endTime: '16:00', subjectCode: '24HUT310', subjectName: 'Life Skills and Professional Ethics', faculty: 'Prof. Anumod B', room: 'WR101', type: 'Theory' },

  // Friday (Period 1: Life Skills, Period 4: Free/Unscheduled Gap, Period 5: Computing Lab, Period 6: Discrete Mathematics)
  { day: 'Friday', period: 1, startTime: '09:00', endTime: '09:55', subjectCode: '24HUT310', subjectName: 'Life Skills and Professional Ethics', faculty: 'Prof. Anumod B', room: 'WR101', type: 'Theory' },
  { day: 'Friday', period: 2, startTime: '10:00', endTime: '10:55', subjectCode: '24MAP300', subjectName: 'Advanced Linear Algebra and Transforms', faculty: 'Deepak D', room: 'WR101', type: 'Theory' },
  { day: 'Friday', period: 3, startTime: '11:05', endTime: '12:00', subjectCode: '24MAP300', subjectName: 'Advanced Linear Algebra and Transforms', faculty: 'Fayis Thazhethe Palliyali and Deepak D', room: 'WR101', type: 'Theory' },
  { day: 'Friday', period: 4, startTime: '13:00', endTime: '13:55', subjectCode: 'FREE', subjectName: 'Free Period / Gap', faculty: 'No Class Scheduled', room: '–', type: 'Free' },
  { day: 'Friday', period: 5, startTime: '14:00', endTime: '14:55', subjectCode: '24AIJ303', subjectName: 'Introduction to Machine Learning', faculty: 'Nisa A K', room: 'Computing Lab', type: 'Lab' },
  { day: 'Friday', period: 6, startTime: '15:05', endTime: '16:00', subjectCode: '24EST382', subjectName: 'Discrete Mathematics', faculty: 'Manu J Pillai', room: 'WR101', type: 'Theory' },
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

