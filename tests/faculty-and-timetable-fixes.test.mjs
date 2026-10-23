import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { classifyTimetableSession } from '../src/lib/etlab-client.ts';
import { applyTeachersToSubjects, applyTeachersToTimetable, DEMO_TEACHERS_A, DEMO_TEACHERS_B } from '../src/lib/course-catalog.ts';

test('1. classifyTimetableSession - Session-specific Theory vs Lab classification', () => {
  // Test practical batch indicators: (B), (P), [B], [P], Batch B
  assert.equal(
    classifyTimetableSession('24AIP305 (B)', '24AIP305', 'Design Project', '<td>24AIP305 (B)<br>Batch B</td>'),
    'Lab'
  );
  assert.equal(
    classifyTimetableSession('24MAP300 (P)', '24MAP300', 'Mathematics Tutorial/Lab', '<td>24MAP300 (P)</td>'),
    'Lab'
  );
  assert.equal(
    classifyTimetableSession('24CST302 [B]', '24CST302', 'Operating Systems', '<td>24CST302 [B]</td>'),
    'Lab'
  );

  // Test KTU lab course codes (24CYL..., 24ESL..., 24CSP..., CSL...)
  assert.equal(
    classifyTimetableSession('24CSP304', '24CSP304', 'Data Structures Lab', '<td>24CSP304</td>'),
    'Lab'
  );
  assert.equal(
    classifyTimetableSession('24CYL100', '24CYL100', 'Engineering Chemistry Lab', '<td>24CYL100</td>'),
    'Lab'
  );
  assert.equal(
    classifyTimetableSession('24ESL120', '24ESL120', 'Civil & Mechanical Workshop', '<td>24ESL120</td>'),
    'Lab'
  );

  // Test standard theory lectures
  assert.equal(
    classifyTimetableSession('24MAT101', '24MAT101', 'Linear Algebra and Calculus', '<td>24MAT101</td>'),
    'Theory'
  );
  assert.equal(
    classifyTimetableSession('24CST301', '24CST301', 'Formal Languages and Automata', '<td>24CST301</td>'),
    'Theory'
  );

  // CRITICAL: Room names containing "LAB" must NEVER classify a session as Lab!
  assert.equal(
    classifyTimetableSession('24CST301', '24CST301', 'Formal Languages and Automata', '<td>24CST301<br>Room: AI-LAB-204</td>'),
    'Theory',
    'A theory class held in a room with LAB in its name must still be classified as Theory'
  );

  // Session-specific classification for the same course:
  // Session 1 is a theory lecture
  assert.equal(
    classifyTimetableSession('24AIJ303', '24AIJ303', 'Object Oriented Programming', '<td>24AIJ303<br>Dr. John Doe</td>'),
    'Theory'
  );
  // Session 2 is a practical batch session
  assert.equal(
    classifyTimetableSession('24AIJ303 (B)', '24AIJ303', 'Object Oriented Programming', '<td>24AIJ303 (B)<br>Dr. John Doe</td>'),
    'Lab'
  );
});

test('2. Faculty restoration - preserves multiple teachers and maps contact info', () => {
  const teachers = [
    {
      name: 'Fayis Thazhethe Palliyali',
      subjectCode: '24MAP300',
      subjectName: 'Combinatorics and Graph Theory',
      email: 'fayis@tkmce.ac.in',
      phone: '9847000001',
    },
    {
      name: 'Deepak D',
      subjectCode: '24MAP300',
      subjectName: 'Combinatorics and Graph Theory',
      email: 'deepak@tkmce.ac.in',
      phone: '9847000002',
    },
    {
      name: 'Dr. Sabeena K',
      subjectCode: '24CSP304',
      subjectName: 'Artificial Intelligence and Search Methods',
      email: 'sabeena@tkmce.ac.in',
    },
  ];

  const subjects = [
    {
      code: '24MAP300',
      name: 'Combinatorics and Graph Theory',
      attendedHours: 20,
      totalHours: 24,
      percentage: 83.3,
      status: 'safe',
      faculty: 'Department Faculty',
    },
    {
      code: '24CSP304',
      name: 'Artificial Intelligence and Search Methods',
      attendedHours: 22,
      totalHours: 24,
      percentage: 91.6,
      status: 'safe',
      faculty: 'Department Faculty',
    },
    {
      code: '24UNKNOWN',
      name: 'Independent Study',
      attendedHours: 10,
      totalHours: 10,
      percentage: 100,
      status: 'safe',
      faculty: 'Staff Advisor',
    },
  ];

  const updatedSubjects = applyTeachersToSubjects(subjects, teachers);

  // 24MAP300 has two teachers: both must be retained without arbitrary dropping
  const mapSubject = updatedSubjects.find((s) => s.code === '24MAP300');
  assert.ok(mapSubject);
  assert.equal(mapSubject.faculty, 'Fayis Thazhethe Palliyali and Deepak D');
  assert.equal(mapSubject.facultyEmail, 'fayis@tkmce.ac.in, deepak@tkmce.ac.in');

  // 24CSP304 has single teacher
  const csSubject = updatedSubjects.find((s) => s.code === '24CSP304');
  assert.ok(csSubject);
  assert.equal(csSubject.faculty, 'Dr. Sabeena K');
  assert.equal(csSubject.facultyEmail, 'sabeena@tkmce.ac.in');

  // 24UNKNOWN has no matching teacher, preserves original faculty
  const unkSubject = updatedSubjects.find((s) => s.code === '24UNKNOWN');
  assert.ok(unkSubject);
  assert.equal(unkSubject.faculty, 'Staff Advisor');

  // Timetable slots mapping
  const slots = [
    {
      day: 'Monday',
      period: 1,
      subjectCode: '24MAP300',
      subjectName: 'Combinatorics',
      faculty: 'Department Faculty',
      startTime: '09:00 AM',
      endTime: '09:55 AM',
      type: 'Theory',
    },
    {
      day: 'Friday',
      period: 4,
      subjectCode: 'FREE',
      subjectName: 'Free Period',
      faculty: 'Free',
      startTime: '12:05 PM',
      endTime: '01:00 PM',
      type: 'Free',
    },
  ];

  const updatedSlots = applyTeachersToTimetable(slots, teachers);
  assert.equal(updatedSlots[0].faculty, 'Fayis Thazhethe Palliyali and Deepak D');
  assert.equal(updatedSlots[1].faculty, 'Free'); // Free period untouched
});

test('3. Timetable bounds - Strictly Monday–Friday and Periods 1–6', () => {
  const timetableClientPath = path.resolve('src/app/dashboard/timetable/timetable-client.tsx');
  const timetableClientCode = fs.readFileSync(timetableClientPath, 'utf8');

  // Days array must only contain Monday to Friday
  assert.ok(
    timetableClientCode.includes("['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']"),
    'Timetable client must strictly define days as Monday to Friday'
  );
  assert.ok(
    !timetableClientCode.includes("'Saturday'"),
    'Saturday must not appear anywhere in timetable-client'
  );

  // Periods array must only contain 1 to 6
  assert.ok(
    timetableClientCode.includes('const periods = [1, 2, 3, 4, 5, 6];'),
    'Timetable client must strictly define periods as 1 to 6'
  );
  assert.ok(
    !timetableClientCode.includes('Period 7') && !timetableClientCode.includes('Period 8'),
    'Periods 7 and 8 must not appear in timetable-client'
  );

  // Overview schedule in page.tsx must also filter to periods 1-6
  const dashboardPagePath = path.resolve('src/app/dashboard/page.tsx');
  const dashboardPageCode = fs.readFileSync(dashboardPagePath, 'utf8');
  assert.ok(
    dashboardPageCode.includes('slot.period >= 1 && slot.period <= 6'),
    'Overview schedule in dashboard page must strictly filter to periods 1 to 6'
  );
});

test('4. Dedicated Faculty & Course Teachers Section in Profile Page', () => {
  const profilePagePath = path.resolve('src/app/dashboard/profile/page.tsx');
  const profilePageCode = fs.readFileSync(profilePagePath, 'utf8');

  // Verify section title
  assert.ok(
    profilePageCode.includes('Department Faculty & Course Teachers'),
    'Profile page must have Department Faculty & Course Teachers section'
  );

  // Verify authoritative ETLAB link
  assert.ok(
    profilePageCode.includes('https://tkmce.etlab.in/ktuacademics/student/teacher'),
    'Profile page must reference official ETLAB teacher URL'
  );

  // Verify email mailto link
  assert.ok(
    profilePageCode.includes('href={`mailto:${t.email}`}'),
    'Profile page must include mailto link for faculty email'
  );
});

test('5. Verified Department Faculty Data for Account A and Account B', () => {
  // Account A (Semester 3 AI)
  assert.ok(DEMO_TEACHERS_A.length >= 8);
  const mathTeachers = DEMO_TEACHERS_A.filter((t) => t.subjectCode === '24MAP300');
  assert.equal(mathTeachers.length, 2, '24MAP300 must have 2 teachers (Fayis and Deepak)');
  assert.ok(mathTeachers.some((t) => t.name === 'Fayis Thazhethe Palliyali'));
  assert.ok(mathTeachers.some((t) => t.name === 'Deepak D'));

  // Account B (Semester 1)
  assert.ok(DEMO_TEACHERS_B.length >= 8);
  const bCodes = new Set(DEMO_TEACHERS_B.map((t) => t.subjectCode));
  assert.ok(bCodes.has('24MAT101'));
  assert.ok(bCodes.has('24CYT100'));
});

test('6. API Endpoint for Teachers (/api/teachers)', () => {
  const routePath = path.resolve('src/app/api/teachers/route.ts');
  assert.ok(fs.existsSync(routePath), 'src/app/api/teachers/route.ts must exist');

  const routeCode = fs.readFileSync(routePath, 'utf8');
  assert.ok(routeCode.includes('export async function GET'), 'API route must export GET handler');
  assert.ok(
    routeCode.includes('getProfilePageData') || routeCode.includes('etlabFetchTeachers'),
    'API route must retrieve teachers data via authoritative data provider'
  );
});
