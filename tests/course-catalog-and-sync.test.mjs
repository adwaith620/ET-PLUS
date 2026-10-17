import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEMESTER_3_COURSES,
  getCourseFullName,
  normalizeStudentProfile,
  normalizeSubjectAttendance,
} from '../src/lib/course-catalog.ts';
import { calculatePercentage, calculateSafeBunks, calculateClassesToRecover } from '../src/lib/attendance-calculator.ts';

test('Course Catalog - verifies canonical mappings for Semester 3 curriculum', () => {
  const expectedMappings = {
    '24MAP300': 'Advanced Linear Algebra and Transforms',
    '24EST382': 'Discrete Mathematics',
    '24AIJ303': 'Introduction to Machine Learning',
    '24CSP304': 'Data Structures and Algorithms',
    '24AIP305': 'Computing Systems and Organization',
    '24HUT310': 'Life Skills and Professional Ethics',
    '24EST372': 'Optimization Techniques',
    '24CSM3XX': 'MINOR/REMEDIAL',
  };

  for (const [code, name] of Object.entries(expectedMappings)) {
    assert.equal(getCourseFullName(code), name, `Course ${code} should map to ${name}`);
  }

  // Fallback for unlisted course
  assert.equal(getCourseFullName('UNKNOWN101', 'Fallback Title'), 'Fallback Title');
  assert.equal(getCourseFullName('UNKNOWN101'), 'UNKNOWN101');
});

test('normalizeStudentProfile - corrects identity to Semester 3 Computer Science (AI)', () => {
  const dirtyProfile = {
    name: 'Student Name',
    registerNo: 'TKM25AI012',
    admissionNo: '25B012',
    rollNo: 'S6-OLD',
    department: 'Cherumkuzhi', // Stale address pollution
    programme: 'B.Tech Computer Science and Engineering',
    semester: 6, // Stale semester
    batch: '2022–2026', // Stale batch
    academicYear: '2025–2026',
    institution: 'TKM College of Engineering',
    email: 'old.email@gmail.com',
  };

  const normalized = normalizeStudentProfile(dirtyProfile);

  assert.equal(normalized.department, 'Computer Science (AI)');
  assert.equal(normalized.rollNo, 'B25CTA12');
  assert.equal(normalized.batch, '2025–2029');
  assert.equal(normalized.semester, 3);
  assert.equal(normalized.institution, 'TKM College of Engineering, Kollam');
  assert.equal(normalized.email, '25B012@tkmce.ac.in');
  assert.ok(!normalized.department.includes('Cherumkuzhi'));
});

test('normalizeSubjectAttendance - canonicalizes subject title while preserving hours', () => {
  const rawSubject = {
    code: '24AIJ303',
    name: 'ML Int', // Short/abbreviated ETLAB label
    faculty: 'Dr. Jane Doe',
    attendedHours: 26,
    totalHours: 35,
    category: 'Theory',
  };

  const normalized = normalizeSubjectAttendance(rawSubject);
  assert.equal(normalized.code, '24AIJ303');
  assert.equal(normalized.name, 'Introduction to Machine Learning');
  assert.equal(normalized.attendedHours, 26);
  assert.equal(normalized.totalHours, 35);
});

test('Multi-Subject Hypothetical Scenarios - mathematical consistency', () => {
  // Baseline: two courses
  // Course 1: 20/25 (80%)
  // Course 2: 15/25 (60%)
  // Overall baseline: 35/50 (70%)
  const subjects = [
    { code: '24AIJ303', attended: 20, total: 25 },
    { code: '24CSP304', attended: 15, total: 25 },
  ];

  const totalAttended = 35;
  const totalConducted = 50;
  const target = 75;

  assert.equal(calculatePercentage(totalAttended, totalConducted), 70);
  assert.equal(calculateClassesToRecover(totalAttended, totalConducted, target), 10);

  // Scenario: Attend 4 in Course 1, Attend 6 in Course 2
  // Course 1: (20+4)/(25+4) = 24/29 = 82.76%
  // Course 2: (15+6)/(25+6) = 21/31 = 67.74%
  // Overall projected: (35 + 4 + 6) / (50 + 4 + 6) = 45 / 60 = 75.0%
  const projAtt = totalAttended + 4 + 6;
  const projCond = totalConducted + 4 + 6;
  const projPct = calculatePercentage(projAtt, projCond);

  assert.equal(projPct, 75.0);
  assert.equal(calculateClassesToRecover(projAtt, projCond, target), 0);
  assert.equal(calculateSafeBunks(projAtt, projCond, target), 0);
});
