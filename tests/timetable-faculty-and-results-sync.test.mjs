import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  APPROVED_DEPARTMENT_FACULTY,
  SEMESTER_3_OFFICIAL_TIMETABLE,
  matchApprovedCourse,
  getApprovedFaculty,
  normalizeTimetableSlot,
  applyTeachersToTimetable,
} from '../src/lib/course-catalog.ts';

test('1. matchApprovedCourse - Normalizes raw course codes and course names to canonical approved entries', () => {
  // Test code matches
  const m1 = matchApprovedCourse('24MAP300');
  assert.ok(m1);
  assert.equal(m1.courseCode, '24MAP300');
  assert.equal(m1.facultyName, 'Mr. FAYIS THAZHETHE PALLIYALI & Dr. DEEPAK D.');

  const m2 = matchApprovedCourse('24AIJ303');
  assert.ok(m2);
  assert.equal(m2.courseCode, '24AIJ303');
  assert.equal(m2.facultyName, 'Prof. NISA A K');

  // getApprovedFaculty helper tests
  assert.equal(getApprovedFaculty('24MAP300'), 'Mr. FAYIS THAZHETHE PALLIYALI & Dr. DEEPAK D.');
  assert.equal(getApprovedFaculty(undefined, 'Introduction to Machine Learning'), 'Prof. NISA A K');

  // Test course title matches when code is missing (as seen in ETLAB cells)
  const mTitle1 = matchApprovedCourse('Introduction to Machine Learning');
  assert.ok(mTitle1);
  assert.equal(mTitle1.courseCode, '24AIJ303');
  assert.equal(mTitle1.facultyName, 'Prof. NISA A K');

  const mTitle2 = matchApprovedCourse('Computing Systems and Organization');
  assert.ok(mTitle2);
  assert.equal(mTitle2.courseCode, '24AIP305');
  assert.equal(mTitle2.facultyName, 'AMINA M');

  const mTitle3 = matchApprovedCourse('Advanced Linear Algebra and Transforms');
  assert.ok(mTitle3);
  assert.equal(mTitle3.courseCode, '24MAP300');
  assert.equal(mTitle3.facultyName, 'Mr. FAYIS THAZHETHE PALLIYALI & Dr. DEEPAK D.');

  const mTitle4 = matchApprovedCourse('Data Structures and Algorithms');
  assert.ok(mTitle4);
  assert.equal(mTitle4.courseCode, '24CSP304');
  assert.equal(mTitle4.facultyName, 'Mrs. ASWATHY GANDHI S');

  const mTitle5 = matchApprovedCourse('Discrete Mathematics');
  assert.ok(mTitle5);
  assert.equal(mTitle5.courseCode, '24EST382');
  assert.equal(mTitle5.facultyName, 'Dr. MANU J PILLAI');

  const mTitle6 = matchApprovedCourse('Optimization Techniques');
  assert.ok(mTitle6);
  assert.equal(mTitle6.courseCode, '24EST372');
  assert.equal(mTitle6.facultyName, 'Dr. ASIF NAVAS K R');

  const mTitle7 = matchApprovedCourse('Life Skills and Professional Ethics');
  assert.ok(mTitle7);
  assert.equal(mTitle7.courseCode, '24HUT310');
  assert.equal(mTitle7.facultyName, 'Prof. ANUMOD B');
});

test('2. normalizeTimetableSlot - Replaces "Department Faculty" and raw course names with canonical values', () => {
  // Slot with raw title as code and "Department Faculty" as faculty
  const rawSlot = {
    day: 'Wednesday',
    period: 2,
    startTime: '10:00',
    endTime: '10:55',
    subjectCode: 'Introduction to Machine Learning',
    subjectName: 'Introduction to Machine Learning',
    faculty: 'Department Faculty',
    type: 'Theory',
  };

  const normalized = normalizeTimetableSlot(rawSlot);
  assert.equal(normalized.subjectCode, '24AIJ303', 'Must resolve subjectCode to 24AIJ303');
  assert.equal(normalized.subjectName, 'Introduction to Machine Learning');
  assert.equal(normalized.faculty, 'Prof. NISA A K', 'Must replace Department Faculty with Prof. NISA A K');

  // Slot with valid code but generic faculty
  const mathSlot = {
    day: 'Wednesday',
    period: 3,
    startTime: '11:05',
    endTime: '12:00',
    subjectCode: '24MAP300',
    subjectName: 'Advanced Linear Algebra and Transforms',
    faculty: 'Department Faculty',
    type: 'Theory',
  };

  const normMath = normalizeTimetableSlot(mathSlot);
  assert.equal(normMath.faculty, 'Mr. FAYIS THAZHETHE PALLIYALI & Dr. DEEPAK D.');

  // applyTeachersToTimetable fallback check
  const mapped = applyTeachersToTimetable([rawSlot, mathSlot]);
  assert.equal(mapped[0].faculty, 'Prof. NISA A K');
  assert.equal(mapped[1].faculty, 'Mr. FAYIS THAZHETHE PALLIYALI & Dr. DEEPAK D.');

  // Free period slot
  const freeSlot = {
    day: 'Friday',
    period: 4,
    startTime: '13:00',
    endTime: '13:55',
    subjectCode: 'FREE',
    subjectName: 'Free Period',
    faculty: 'No Class Scheduled',
    type: 'Free',
  };
  const normFree = normalizeTimetableSlot(freeSlot);
  assert.equal(normFree.subjectCode, 'FREE');
  assert.equal(normFree.type, 'Free');
});

test('3. SEMESTER_3_OFFICIAL_TIMETABLE - Zero "Department Faculty" occurrences across all slots', () => {
  assert.ok(SEMESTER_3_OFFICIAL_TIMETABLE.length > 0);

  SEMESTER_3_OFFICIAL_TIMETABLE.forEach((slot) => {
    if (slot.type === 'Free' || slot.subjectCode === 'FREE') {
      return;
    }
    assert.notEqual(
      slot.faculty,
      'Department Faculty',
      `Slot ${slot.day} P${slot.period} (${slot.subjectCode}) must not have generic 'Department Faculty'`
    );

    // Verify all 7 canonical courses have their approved faculty
    const approved = APPROVED_DEPARTMENT_FACULTY.find((f) => f.courseCode === slot.subjectCode);
    if (approved) {
      assert.equal(
        slot.faculty,
        approved.facultyName,
        `Slot ${slot.day} P${slot.period} (${slot.subjectCode}) faculty must match approved faculty ${approved.facultyName}`
      );
    }
  });
});

test('4. Overview Dashboard & Timetable Client Integration', () => {
  const dashboardPagePath = path.resolve('src/app/dashboard/page.tsx');
  const dashboardPageCode = fs.readFileSync(dashboardPagePath, 'utf8');

  // Verify normalizeTimetableSlot is applied to todayClasses in Overview
  assert.ok(
    dashboardPageCode.includes('normalizeTimetableSlot'),
    'Overview page must normalize todayClasses with normalizeTimetableSlot'
  );

  const timetableClientPath = path.resolve('src/app/dashboard/timetable/timetable-client.tsx');
  const timetableClientCode = fs.readFileSync(timetableClientPath, 'utf8');

  // Verify normalizedSlots is used in Timetable client
  assert.ok(
    timetableClientCode.includes('normalizedSlots'),
    'Timetable client must compute normalizedSlots'
  );
  assert.ok(
    timetableClientCode.includes('normalizeTimetableSlot'),
    'Timetable client must import and use normalizeTimetableSlot'
  );
});

test('5. Results Loading Screen (src/app/dashboard/results/loading.tsx)', () => {
  const loadingPath = path.resolve('src/app/dashboard/results/loading.tsx');
  assert.ok(fs.existsSync(loadingPath), 'loading.tsx must exist for Results page');

  const loadingCode = fs.readFileSync(loadingPath, 'utf8');
  assert.ok(loadingCode.includes('Connecting to ETLAB...'), 'Loading screen must show connecting message');
  assert.ok(loadingCode.includes('animate-spin'), 'Loading screen must render spinning indicator');
});

test('6. Results Sync API Route (/api/results)', () => {
  const routePath = path.resolve('src/app/api/results/route.ts');
  assert.ok(fs.existsSync(routePath), 'src/app/api/results/route.ts must exist');

  const routeCode = fs.readFileSync(routePath, 'utf8');
  assert.ok(routeCode.includes('export async function GET'), 'API route must export GET handler');
  assert.ok(routeCode.includes('getResultsPageData'), 'API route must call getResultsPageData');
  assert.ok(routeCode.includes('forceRefresh'), 'API route must support forceRefresh');
});

test('7. Results Client Interactive Synchronization & Connecting Circle', () => {
  const resultsClientPath = path.resolve('src/app/dashboard/results/results-client.tsx');
  const resultsClientCode = fs.readFileSync(resultsClientPath, 'utf8');

  // Verify sync button and connecting state
  assert.ok(resultsClientCode.includes('Sync ETLAB'), 'Results client must have Sync ETLAB button');
  assert.ok(resultsClientCode.includes('handleSync'), 'Results client must have handleSync function');
  assert.ok(resultsClientCode.includes('/api/results?refresh=true'), 'Results client must call /api/results endpoint');
  assert.ok(resultsClientCode.includes('Connecting to ETLAB...'), 'Results client must have connecting circle state');
});
