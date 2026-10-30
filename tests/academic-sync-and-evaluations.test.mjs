import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  isLabCourse,
  stripLabSuffix,
  classifyCourseCategory,
  LAB_COURSE_SUFFIX_REGEX,
} from '../src/lib/course-catalog.ts';
import {
  parseMarksValue,
  formatSemesterName,
} from '../src/lib/students-etlab-client.ts';
import {
  normalizeAssignment,
  deduplicateAssignments,
} from '../src/lib/assignment-service.ts';
import { verifyIdentityConsistency } from '../src/lib/unified-academic-service.ts';

test('1. Course Classification - isLabCourse trailing (B) and theory courses', () => {
  // Standalone trailing (B) suffix tests
  assert.equal(isLabCourse('24MAP300(B)'), true, '24MAP300(B) must be classified as Lab');
  assert.equal(isLabCourse('24MAP300 (B)'), true, '24MAP300 (B) with space must be classified as Lab');
  assert.equal(isLabCourse('24MAP300(b)'), true, 'Lowercase 24MAP300(b) must be classified as Lab');
  assert.equal(isLabCourse('24AIP305[B]'), true, '24AIP305[B] with brackets must be classified as Lab');
  assert.equal(isLabCourse('24AIP305 [b]'), true, '24AIP305 [b] with space must be classified as Lab');
  assert.equal(isLabCourse(undefined, 'Advanced Linear Algebra (B)'), true, 'Subject name with (B) must be classified as Lab');

  // KTU lab course codes
  assert.equal(isLabCourse('24CYL100'), true, '24CYL100 Engineering Chemistry Lab must be Lab');
  assert.equal(isLabCourse('24ESL102'), true, '24ESL102 Electrical Workshop must be Lab');
  assert.equal(isLabCourse('CYL100'), true, 'CYL100 must be Lab');
  assert.equal(isLabCourse(undefined, 'Engineering Chemistry Laboratory'), true, 'Keywords lab in name must be Lab');
  assert.equal(isLabCourse(undefined, 'Data Structures Practical'), true, 'Keywords practical in name must be Lab');

  // Strict avoidance of false positives for courses with 'B'
  assert.equal(isLabCourse('24CST302'), false, '24CST302 must NOT be classified as Lab');
  assert.equal(isLabCourse('24EST382'), false, '24EST382 Discrete Mathematics must NOT be Lab');
  assert.equal(isLabCourse('EST102'), false, 'EST102 must NOT be Lab');
  assert.equal(isLabCourse('24HUT101'), false, '24HUT101 must NOT be Lab');
  assert.equal(isLabCourse('24CSP304'), false, '24CSP304 Data Structures must NOT be Lab');
  assert.equal(isLabCourse('24AIJ303'), false, '24AIJ303 Intro to ML must NOT be Lab');

  // Helper functions
  assert.ok(LAB_COURSE_SUFFIX_REGEX.test('(B)'), 'LAB_COURSE_SUFFIX_REGEX must match (B)');
  assert.equal(stripLabSuffix('24MAP300(B)'), '24MAP300', 'stripLabSuffix must remove (B)');
  assert.equal(stripLabSuffix('24MAP300 (B)'), '24MAP300', 'stripLabSuffix must trim space before (B)');
  assert.equal(classifyCourseCategory('24MAP300(B)'), 'Lab', 'classifyCourseCategory must return Lab for (B)');
  assert.equal(classifyCourseCategory('24CSP304'), 'Theory', 'classifyCourseCategory must return Theory for 24CSP304');
});

test('2. Marks Parsing - Legitimate zeros vs missing marks', () => {
  // Legitimate zeros must remain numeric 0
  assert.equal(parseMarksValue(0), 0, 'Numeric 0 must return 0');
  assert.equal(parseMarksValue('0'), 0, 'String "0" must return 0');

  // Positive numbers
  assert.equal(parseMarksValue(18), 18, '18 must return 18');
  assert.equal(parseMarksValue('39.5'), 39.5, '"39.5" must return 39.5');
  assert.equal(parseMarksValue(40), 40, '40 must return 40');

  // Missing or unreleased marks must be undefined
  assert.equal(parseMarksValue(null), undefined, 'null must return undefined');
  assert.equal(parseMarksValue(undefined), undefined, 'undefined must return undefined');
  assert.equal(parseMarksValue(''), undefined, 'Empty string must return undefined');
  assert.equal(parseMarksValue('Awaited'), undefined, '"Awaited" must return undefined');
  assert.equal(parseMarksValue('pending'), undefined, '"pending" must return undefined');
  assert.equal(parseMarksValue('-'), undefined, '"-" must return undefined');
  assert.equal(parseMarksValue('--'), undefined, '"--" must return undefined');
});

test('3. Semester Name Normalization', () => {
  assert.equal(formatSemesterName(3), 'IIIrd Semester');
  assert.equal(formatSemesterName('3'), 'IIIrd Semester');
  assert.equal(formatSemesterName('S3'), 'IIIrd Semester');
  assert.equal(formatSemesterName('III'), 'IIIrd Semester');
  assert.equal(formatSemesterName(2), 'IInd Semester');
  assert.equal(formatSemesterName(1), 'Ist Semester');
  assert.equal(formatSemesterName(undefined), 'IIIrd Semester');
});

test('4. Assignment Normalization and Status Derivations', () => {
  // 1. Evaluated assignment with marks
  const asgEvaluated = normalizeAssignment({
    id: 'asg-test-01',
    title: 'Assignment 1',
    subject: 'Data Structures and Algorithms',
    subjectCode: '24CSP304',
    faculty: 'Mrs. ASWATHY GANDHI S',
    publishDate: '2026-09-01',
    dueDate: '2026-09-15',
    status: 'completed',
    obtainedMarks: 18,
    maxMarks: 20,
    description: 'Coursework assignment',
  });
  assert.equal(asgEvaluated.submissionStatus, 'Evaluated');
  assert.equal(asgEvaluated.obtainedMarks, 18);
  assert.equal(asgEvaluated.maxMarks, 20);

  // 2. Submitted but awaiting evaluation
  const asgSubmitted = normalizeAssignment({
    id: 'asg-test-02',
    title: 'Assignment 2',
    subject: 'Discrete Mathematics',
    subjectCode: '24EST382',
    faculty: 'Dr. MANU J PILLAI',
    publishDate: '2026-10-01',
    dueDate: '2026-10-20',
    status: 'submitted',
    description: 'Coursework assignment',
  });
  assert.equal(asgSubmitted.submissionStatus, 'Submitted');
  assert.equal(asgSubmitted.obtainedMarks, undefined);

  // 3. Not submitted / Pending
  const asgPending = normalizeAssignment({
    id: 'asg-test-03',
    title: 'Assignment 3',
    subject: 'Computing Systems and Organization',
    subjectCode: '24AIP305',
    faculty: 'AMINA M',
    publishDate: '2026-10-10',
    dueDate: '2026-11-01',
    status: 'upcoming',
    description: 'Coursework assignment',
  });
  assert.equal(asgPending.submissionStatus, 'Pending');

  // Deduplication
  const deduped = deduplicateAssignments([asgEvaluated, asgEvaluated]);
  assert.equal(deduped.length, 1, 'Duplicate assignments must be deduplicated');
});

test('5. Student Identity Validation & Cross-Account Isolation', () => {
  const profileA = {
    admissionNo: '25CTA12',
    name: 'Adwaith',
    department: 'Computer Science (AI)',
    registerNo: 'TKM25CSAI012',
    semester: 3,
    batch: '2025-29',
    academicYear: '2025 - 2026',
    institution: 'TKM College of Engineering, Kollam',
  };

  const profileB = {
    admissionNo: '25CTA99',
    name: 'Kavya',
    department: 'Computer Science (AI)',
    registerNo: 'TKM25CSAI099',
    semester: 1,
    batch: '2025-29',
    academicYear: '2025 - 2026',
    institution: 'TKM College of Engineering, Kollam',
  };

  // Same student returns true
  assert.equal(verifyIdentityConsistency(profileA, profileA), true);
  // Different students returns false
  assert.equal(verifyIdentityConsistency(profileA, profileB), false, 'Mismatched student identities must be rejected');
});

test('6. Results Client Table Structure - Separate Obtained and Maximum Marks Columns', () => {
  const resultsClientPath = path.resolve('src/app/dashboard/results/results-client.tsx');
  const resultsClientSrc = fs.readFileSync(resultsClientPath, 'utf8');

  // Verify removed/redundant columns are NOT present in table headers
  assert.ok(!resultsClientSrc.includes('SEMESTER\n              </th>'), 'Semester column must not be in Results table header');
  assert.ok(!resultsClientSrc.includes('DATA SOURCE\n              </th>'), 'DATA SOURCE column must not be in Results table header');
  assert.ok(!resultsClientSrc.includes('MIN MARKS'), 'MIN MARKS column must not exist');

  // Verify exact 5 table columns exist: SUBJECT, EXAMINATION / ASSESSMENT, OBTAINED MARKS, MAXIMUM MARKS, STATUS
  assert.ok(resultsClientSrc.includes('SUBJECT\n              </th>'), 'Must have SUBJECT column');
  assert.ok(resultsClientSrc.includes('EXAMINATION / ASSESSMENT\n              </th>'), 'Must have EXAMINATION / ASSESSMENT column');
  assert.ok(resultsClientSrc.includes('OBTAINED MARKS\n              </th>'), 'Must have separate OBTAINED MARKS column');
  assert.ok(resultsClientSrc.includes('MAXIMUM MARKS\n              </th>'), 'Must have separate MAXIMUM MARKS column');
  assert.ok(resultsClientSrc.includes('STATUS\n              </th>'), 'Must have STATUS column');

  // Verify colSpan=5 for full width loading and empty state rows
  assert.ok(resultsClientSrc.includes('colSpan={5}'), 'Loading and empty states must span all 5 columns');

  // Verify separate obtained score and maximum marks rendering
  assert.ok(resultsClientSrc.includes('rec.obtainedMarks'), 'Must render obtainedMarks in obtained column');
  assert.ok(resultsClientSrc.includes('rec.maxMarks'), 'Must render maxMarks in max column');
  assert.ok(resultsClientSrc.includes('Awaiting marks'), 'Must show Awaiting marks for unreleased scores');

  // Verify categories include Assignment Results and Lab Results
  assert.ok(resultsClientSrc.includes('Assignment Results'), 'Must include Assignment Results tab label');
  assert.ok(resultsClientSrc.includes('Lab Results'), 'Must include Lab Results tab label');
});
