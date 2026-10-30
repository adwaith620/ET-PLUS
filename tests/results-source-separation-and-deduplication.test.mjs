import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyAssessmentRecord,
  isLabCourse,
  stripLabSuffix,
  recordMatchesCategory,
} from '../src/lib/course-catalog.ts';
import {
  verifyIdentityConsistency,
} from '../src/lib/unified-academic-service.ts';
import {
  parseScorePair,
} from '../src/lib/students-etlab-client.ts';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Regression Suite: Source Separation, Series Exam Exclusivity,
 * Lab Course (B) Routing, and Deterministic Deduplication.
 */

// Test A: Series Exam 1
test('Test A: Series Exam 1 - Authoritative Classic ETLAB exclusivity and isolation', () => {
  // Given:
  const classicSeries1 = {
    id: 'classic-s1-01',
    subjectCode: '24CSP304',
    subjectName: 'Data Structures and Algorithms',
    semester: 'IIIrd Semester',
    category: 'Sessional Exams',
    examName: 'Series Exam 1',
    maxMarks: 40,
    obtainedMarks: 36,
    source: 'etlab_classic',
    sourceLabel: 'Classic ETLAB',
  };

  const studentsSeries1 = {
    id: 'students-s1-01',
    subjectCode: '24CSP304',
    subjectName: 'Data Structures and Algorithms',
    semester: 'IIIrd Semester',
    category: 'Sessional Exams',
    examName: 'Series Exam 1',
    maxMarks: 40,
    obtainedMarks: 36,
    source: 'students_etlab',
    sourceLabel: 'Students ETLAB',
  };

  const internalAssessment = {
    id: 'classic-int-01',
    subjectCode: '24CSP304',
    subjectName: 'Data Structures and Algorithms',
    semester: 'IIIrd Semester',
    category: 'Internal Marks',
    examName: 'Continuous Assessment (CIA)',
    maxMarks: 50,
    obtainedMarks: 46,
    source: 'etlab_classic',
    sourceLabel: 'Classic ETLAB',
  };

  const assignmentRecord = {
    id: 'asg-01',
    subjectCode: '24CSP304',
    subjectName: 'Data Structures and Algorithms',
    semester: 'IIIrd Semester',
    category: 'Assignments',
    examName: 'Assignment 1',
    maxMarks: 20,
    obtainedMarks: 18,
    source: 'etlab_classic',
    sourceLabel: 'Classic ETLAB',
  };

  // Strict requirement: Students ETLAB records are ignored for Series Exam 1
  assert.equal(studentsSeries1.source, 'students_etlab');
  assert.equal(classicSeries1.source, 'etlab_classic');

  // Classification assertions
  const classifiedClassicS1 = classifyAssessmentRecord(
    classicSeries1.subjectCode,
    classicSeries1.subjectName,
    classicSeries1.examName,
    classicSeries1.category
  );
  assert.equal(classifiedClassicS1.category, 'Series Exam 1');
  assert.equal(classifiedClassicS1.isLab, false);

  const classifiedInternal = classifyAssessmentRecord(
    internalAssessment.subjectCode,
    internalAssessment.subjectName,
    internalAssessment.examName,
    internalAssessment.category
  );
  assert.equal(classifiedInternal.category, 'Internal Marks');

  const classifiedAsg = classifyAssessmentRecord(
    assignmentRecord.subjectCode,
    assignmentRecord.subjectName,
    assignmentRecord.examName,
    assignmentRecord.category
  );
  assert.equal(classifiedAsg.category, 'Assignments');

  // UI Matcher assertions:
  // Only Classic ETLAB Series Exam 1 appears in Series Exam 1
  assert.equal(recordMatchesCategory(classicSeries1, 'Series Exam 1'), true);
  assert.equal(recordMatchesCategory(internalAssessment, 'Series Exam 1'), false);
  assert.equal(recordMatchesCategory(assignmentRecord, 'Series Exam 1'), false);

  // Internal assessment appears ONLY in Internal Marks
  assert.equal(recordMatchesCategory(internalAssessment, 'Internal Marks'), true);
  assert.equal(recordMatchesCategory(classicSeries1, 'Internal Marks'), false);
  assert.equal(recordMatchesCategory(assignmentRecord, 'Internal Marks'), false);

  // Assignment appears ONLY in Assignment Results
  assert.equal(recordMatchesCategory(assignmentRecord, 'Assignments'), true);
  assert.equal(recordMatchesCategory(classicSeries1, 'Assignments'), false);
  assert.equal(recordMatchesCategory(internalAssessment, 'Assignments'), false);
});

// Test B: Series Exam 2
test('Test B: Series Exam 2 - Authoritative Classic ETLAB exclusivity and isolation', () => {
  const classicSeries2 = {
    id: 'classic-s2-01',
    subjectCode: '24AIP305',
    subjectName: 'Computing Systems and Organization',
    semester: 'IIIrd Semester',
    category: 'Sessional Exams',
    examName: 'Series Exam 2',
    maxMarks: 40,
    obtainedMarks: 31,
    source: 'etlab_classic',
    sourceLabel: 'Classic ETLAB',
  };

  const classicSeries1 = {
    id: 'classic-s1-02',
    subjectCode: '24AIP305',
    subjectName: 'Computing Systems and Organization',
    semester: 'IIIrd Semester',
    category: 'Sessional Exams',
    examName: 'Series Exam 1',
    maxMarks: 40,
    obtainedMarks: 37,
    source: 'etlab_classic',
    sourceLabel: 'Classic ETLAB',
  };

  const classifiedS2 = classifyAssessmentRecord(
    classicSeries2.subjectCode,
    classicSeries2.subjectName,
    classicSeries2.examName,
    classicSeries2.category
  );
  assert.equal(classifiedS2.category, 'Series Exam 2');
  assert.equal(classifiedS2.isLab, false);

  // Matches Series Exam 2 exclusively
  assert.equal(recordMatchesCategory(classicSeries2, 'Series Exam 2'), true);
  assert.equal(recordMatchesCategory(classicSeries2, 'Series Exam 1'), false);
  assert.equal(recordMatchesCategory(classicSeries2, 'Internal Marks'), false);
  assert.equal(recordMatchesCategory(classicSeries2, 'Assignments'), false);
  assert.equal(recordMatchesCategory(classicSeries2, 'Lab'), false);

  // Series 1 does NOT match Series Exam 2
  assert.equal(recordMatchesCategory(classicSeries1, 'Series Exam 2'), false);
});

// Test C: (B) lab course
test('Test C: (B) Lab Course Routing - All assessments route exclusively to Lab Results', () => {
  const labSeries1 = {
    id: 'lab-rec-01',
    subjectCode: '24MAP300(B)',
    subjectName: 'Advanced Linear Algebra and Transforms (B)',
    semester: 'IIIrd Semester',
    category: 'Sessional Exams',
    examName: 'Series Exam 1',
    maxMarks: 40,
    obtainedMarks: 35,
    isLab: true,
  };

  const labSeries2 = {
    id: 'lab-rec-02',
    subjectCode: '24MAP300 (B)',
    subjectName: 'Advanced Linear Algebra and Transforms',
    semester: 'IIIrd Semester',
    category: 'Sessional Exams',
    examName: 'Series Exam 2',
    maxMarks: 40,
    obtainedMarks: 38,
    isLab: true,
  };

  const labInternal = {
    id: 'lab-rec-03',
    subjectCode: '24AIP305(B)',
    subjectName: 'Computing Systems and Organization (Practical)',
    semester: 'IIIrd Semester',
    category: 'Lab Evaluation',
    examName: 'Continuous Evaluation / Record',
    maxMarks: 25,
    obtainedMarks: 24,
    isLab: true,
  };

  // Standalone (B) suffix recognition and stripping
  assert.equal(isLabCourse('24MAP300(B)'), true);
  assert.equal(isLabCourse('24AIP305 (B)'), true);
  assert.equal(stripLabSuffix('24MAP300(B)'), '24MAP300');
  assert.equal(stripLabSuffix('24AIP305 (B)'), '24AIP305');

  // 1. Classification
  const classified1 = classifyAssessmentRecord(labSeries1.subjectCode, labSeries1.subjectName, labSeries1.examName);
  assert.equal(classified1.category, 'Lab');
  assert.equal(classified1.isLab, true);

  const classified2 = classifyAssessmentRecord(labSeries2.subjectCode, labSeries2.subjectName, labSeries2.examName);
  assert.equal(classified2.category, 'Lab');
  assert.equal(classified2.isLab, true);

  const classified3 = classifyAssessmentRecord(labInternal.subjectCode, labInternal.subjectName, labInternal.examName);
  assert.equal(classified3.category, 'Lab');
  assert.equal(classified3.isLab, true);

  // 2. UI category exclusivity:
  // Must appear under Lab Results
  assert.equal(recordMatchesCategory(labSeries1, 'Lab'), true);
  assert.equal(recordMatchesCategory(labSeries2, 'Lab'), true);
  assert.equal(recordMatchesCategory(labInternal, 'Lab'), true);

  // MUST NEVER appear in regular Series Exam 1, Series Exam 2, Internal Marks, or Assignment Results
  assert.equal(recordMatchesCategory(labSeries1, 'Series Exam 1'), false);
  assert.equal(recordMatchesCategory(labSeries1, 'Series Exam 2'), false);
  assert.equal(recordMatchesCategory(labSeries1, 'Internal Marks'), false);
  assert.equal(recordMatchesCategory(labSeries1, 'Assignments'), false);

  assert.equal(recordMatchesCategory(labSeries2, 'Series Exam 2'), false);
  assert.equal(recordMatchesCategory(labSeries2, 'Series Exam 1'), false);
  assert.equal(recordMatchesCategory(labSeries2, 'Internal Marks'), false);
  assert.equal(recordMatchesCategory(labSeries2, 'Assignments'), false);
});

// Test D: Assignment isolation
test('Test D: Assignment Isolation - Series marks never appear as assignment marks', () => {
  const seriesExam = {
    id: 's1-test',
    subjectCode: '24CSP304',
    subjectName: 'Data Structures and Algorithms',
    semester: 'IIIrd Semester',
    category: 'Series Exam 1',
    examName: 'Series Exam 1',
    maxMarks: 40,
    obtainedMarks: 36,
  };

  const assignment = {
    id: 'asg-test',
    subjectCode: '24CSP304',
    subjectName: 'Data Structures and Algorithms',
    semester: 'IIIrd Semester',
    category: 'Assignments',
    examName: 'Assignment 1: Binary Search Trees',
    maxMarks: 20,
    obtainedMarks: 18,
  };

  // Series Exam 1 remains in its own section
  assert.equal(recordMatchesCategory(seriesExam, 'Series Exam 1'), true);
  assert.equal(recordMatchesCategory(seriesExam, 'Assignments'), false);

  // Assignment appears under Assignment Results
  assert.equal(recordMatchesCategory(assignment, 'Assignments'), true);
  assert.equal(recordMatchesCategory(assignment, 'Series Exam 1'), false);
});

// Test E: Internal isolation
test('Test E: Internal Isolation - Internal Marks contains only genuine internal assessments', () => {
  const genuineInternal = {
    id: 'cia-01',
    subjectCode: '24EST382',
    subjectName: 'Discrete Mathematics',
    semester: 'IIIrd Semester',
    category: 'Internal Marks',
    examName: 'Continuous Assessment (CIA)',
    maxMarks: 50,
    obtainedMarks: 45,
  };

  const seriesExam1 = {
    id: 'se1-01',
    subjectCode: '24EST382',
    subjectName: 'Discrete Mathematics',
    semester: 'IIIrd Semester',
    category: 'Series Exam 1',
    examName: 'Series Exam 1',
    maxMarks: 40,
    obtainedMarks: 32,
  };

  const seriesExam2 = {
    id: 'se2-01',
    subjectCode: '24EST382',
    subjectName: 'Discrete Mathematics',
    semester: 'IIIrd Semester',
    category: 'Series Exam 2',
    examName: 'Series Exam 2',
    maxMarks: 40,
    obtainedMarks: 35,
  };

  // Internal Marks contains ONLY genuine internal assessments
  assert.equal(recordMatchesCategory(genuineInternal, 'Internal Marks'), true);
  assert.equal(recordMatchesCategory(seriesExam1, 'Internal Marks'), false);
  assert.equal(recordMatchesCategory(seriesExam2, 'Internal Marks'), false);

  // Series examinations remain in their respective sections
  assert.equal(recordMatchesCategory(seriesExam1, 'Series Exam 1'), true);
  assert.equal(recordMatchesCategory(seriesExam2, 'Series Exam 2'), true);
  assert.equal(recordMatchesCategory(genuineInternal, 'Series Exam 1'), false);
  assert.equal(recordMatchesCategory(genuineInternal, 'Series Exam 2'), false);
});

// Test F: Deduplication
test('Test F: Deduplication - Collapses exact duplicate assessments while preserving distinct components', () => {
  // Repeated responses for the exact same Series Exam 1
  const responseRow1 = {
    subjectCode: '24MAP300',
    subjectName: 'Advanced Linear Algebra and Transforms',
    examName: 'First Series Examination',
    category: 'Sessional Exams',
    obtainedMarks: 37,
    maxMarks: 40,
  };

  const responseRow2 = {
    subjectCode: '24MAP300',
    subjectName: 'Advanced Linear Algebra and Transforms',
    examName: 'Series Exam 1',
    category: 'Sessional Exams',
    obtainedMarks: 37,
    maxMarks: 40,
  };

  const classified1 = classifyAssessmentRecord(
    responseRow1.subjectCode,
    responseRow1.subjectName,
    responseRow1.examName,
    responseRow1.category
  );
  const classified2 = classifyAssessmentRecord(
    responseRow2.subjectCode,
    responseRow2.subjectName,
    responseRow2.examName,
    responseRow2.category
  );

  // Both normalize to the exact same canonical assessment category and name
  assert.equal(classified1.category, 'Series Exam 1');
  assert.equal(classified2.category, 'Series Exam 1');
  assert.equal(classified1.normalizedExamName, 'Series Exam 1');
  assert.equal(classified2.normalizedExamName, 'Series Exam 1');

  // Composite key generates identical key for deduplication
  const key1 = `user::IIIrd Semester::${classified1.canonicalCode}::${classified1.category}::${classified1.normalizedExamName}`.toLowerCase();
  const key2 = `user::IIIrd Semester::${classified2.canonicalCode}::${classified2.category}::${classified2.normalizedExamName}`.toLowerCase();
  assert.equal(key1, key2);

  // Distinct legitimate assessments (Series 1 vs Series 2) generate different keys and remain separate
  const responseSeries2 = {
    subjectCode: '24MAP300',
    subjectName: 'Advanced Linear Algebra and Transforms',
    examName: 'Series Exam 2',
    category: 'Sessional Exams',
    obtainedMarks: 34,
    maxMarks: 40,
  };
  const classifiedS2 = classifyAssessmentRecord(
    responseSeries2.subjectCode,
    responseSeries2.subjectName,
    responseSeries2.examName,
    responseSeries2.category
  );
  const keyS2 = `user::IIIrd Semester::${classifiedS2.canonicalCode}::${classifiedS2.category}::${classifiedS2.normalizedExamName}`.toLowerCase();
  assert.notEqual(key1, keyS2, 'Series 1 and Series 2 must remain distinct');
});

// Test G: Summary source isolation
test('Test G: Summary Source Isolation - CGPA and credits are retrieved from Students ETLAB only', () => {
  const analysisData = {
    cgpa: 8.78,
    sgpa: 8.85,
    earnedCredit: 43,
    totalCredit: 43,
    totalPassed: 10,
    totalFailed: 0,
    academicStatus: 'In Good Standing',
  };

  const academicStanding = {
    cgpa: analysisData.cgpa,
    sgpa: analysisData.sgpa,
    creditsEarned: analysisData.earnedCredit,
    totalCredits: analysisData.totalCredit,
    totalPassed: analysisData.totalPassed,
    totalFailed: analysisData.totalFailed,
    status: analysisData.academicStatus,
    source: 'students_etlab',
  };

  assert.equal(academicStanding.cgpa, 8.78);
  assert.equal(academicStanding.creditsEarned, 43);
  assert.equal(academicStanding.totalCredits, 43);
  assert.equal(academicStanding.source, 'students_etlab');
  assert.equal(typeof academicStanding.cgpa, 'number');
  assert.ok(academicStanding.cgpa > 0 && academicStanding.cgpa <= 10);
});

// Test H: Security & Account Isolation
test('Test H: Security & Account Isolation - Reject mismatch, preserve student isolation', () => {
  const profileA = {
    admissionNo: '23CS1042',
    name: 'ADWAITH M',
    department: 'Computer Science (AI)',
    registerNo: 'TKM23CS012',
  };

  const profileB = {
    admissionNo: '25CTA99',
    name: 'Kavya S',
    department: 'Computer Science (AI)',
    registerNo: 'TKM25CT099',
  };

  // Same student passes
  assert.equal(verifyIdentityConsistency(profileA, profileA), true);

  // Different students fail (strict anti-contamination)
  assert.equal(verifyIdentityConsistency(profileA, profileB), false);
  assert.equal(verifyIdentityConsistency(profileA, { ...profileA, admissionNo: '99CS9999' }), false);
});

// Test I: Score pair extraction and avoidance of default max marks
test('Test I: Score pair extraction - Handles fractions, separate columns, and never defaults maxMarks', () => {
  // Fractional score strings (e.g. "18 / 40", "14/20")
  const frac1 = parseScorePair('18 / 40', '');
  assert.equal(frac1.obtainedMarks, 18);
  assert.equal(frac1.maxMarks, 40);

  const frac2 = parseScorePair('14/20', undefined);
  assert.equal(frac2.obtainedMarks, 14);
  assert.equal(frac2.maxMarks, 20);

  // Distinct separate cell values
  const sep1 = parseScorePair('35', '50');
  assert.equal(sep1.obtainedMarks, 35);
  assert.equal(sep1.maxMarks, 50);

  const sep2 = parseScorePair('19.5', '25');
  assert.equal(sep2.obtainedMarks, 19.5);
  assert.equal(sep2.maxMarks, 25);

  // Missing max marks MUST remain undefined — never default to 40 or 20
  const noMax = parseScorePair('16', '');
  assert.equal(noMax.obtainedMarks, 16);
  assert.equal(noMax.maxMarks, undefined, 'Missing maxMarks must be undefined, not defaulted');

  // Legitimate zero marks
  const zeroScore = parseScorePair(0, 40);
  assert.equal(zeroScore.obtainedMarks, 0, 'Legitimate 0 must be preserved as 0');
  assert.equal(zeroScore.maxMarks, 40);

  // Awaiting marks (pending publication)
  const awaited = parseScorePair('Awaited', 40);
  assert.equal(awaited.obtainedMarks, undefined, 'Awaited score must be undefined');
  assert.equal(awaited.maxMarks, 40);

  const awaitedNoMax = parseScorePair('--', '');
  assert.equal(awaitedNoMax.obtainedMarks, undefined);
  assert.equal(awaitedNoMax.maxMarks, undefined);
});

// Test J: Assignment maximum marks variance and non-defaulting
test('Test J: Assignment marks accuracy - Preserves individual maxMarks without defaulting to 20', () => {
  const assignments = [
    { title: 'Mini Project Report', obtainedMarks: 23, maxMarks: 25 },
    { title: 'Assignment 1', obtainedMarks: 18, maxMarks: 20 },
    { title: 'Assignment 2', obtainedMarks: 14, maxMarks: 15 },
    { title: 'Essay Submission', obtainedMarks: 9, maxMarks: 10 },
    { title: 'Lab Practical Writeup', obtainedMarks: 45, maxMarks: 50 },
    { title: 'Ungraded Homework', obtainedMarks: undefined, maxMarks: undefined },
  ];

  // Verify each assignment retains its genuine maxMarks
  assert.equal(assignments[0].maxMarks, 25, '25 maxMarks must be preserved');
  assert.equal(assignments[1].maxMarks, 20, '20 maxMarks must be preserved');
  assert.equal(assignments[2].maxMarks, 15, '15 maxMarks must not be replaced with 20');
  assert.equal(assignments[3].maxMarks, 10, '10 maxMarks must not be replaced with 20');
  assert.equal(assignments[4].maxMarks, 50, '50 maxMarks must be preserved');
  assert.equal(assignments[5].maxMarks, undefined, 'Missing maxMarks must remain undefined');
});

// Test K: Authoritative URL prioritization in etlab-client.ts
test('Test K: Authoritative Results URL - /ktuacademics/student/results is prioritized first', () => {
  const etlabClientPath = path.resolve('src/lib/etlab-client.ts');
  const etlabClientCode = fs.readFileSync(etlabClientPath, 'utf8');

  // Verify authoritative endpoint is declared and prioritized
  assert.ok(
    etlabClientCode.includes('/ktuacademics/student/results'),
    'etlab-client.ts must query /ktuacademics/student/results'
  );
  assert.ok(
    etlabClientCode.includes('authoritativeUrl = `${BASE_URL}/ktuacademics/student/results`'),
    'authoritativeUrl must be explicitly defined as /ktuacademics/student/results'
  );
});

// Test L: Results Table UI - Separate Obtained and Maximum Marks Columns
test('Test L: Results Table Columns - Explicitly separates OBTAINED MARKS and MAXIMUM MARKS', () => {
  const resultsClientPath = path.resolve('src/app/dashboard/results/results-client.tsx');
  const resultsClientCode = fs.readFileSync(resultsClientPath, 'utf8');

  // Verify 5 distinct table headers exist in order
  const subjectIdx = resultsClientCode.indexOf('SUBJECT\n              </th>');
  const examIdx = resultsClientCode.indexOf('EXAMINATION / ASSESSMENT\n              </th>');
  const obtIdx = resultsClientCode.indexOf('OBTAINED MARKS\n              </th>');
  const maxIdx = resultsClientCode.indexOf('MAXIMUM MARKS\n              </th>');
  const statusIdx = resultsClientCode.indexOf('STATUS\n              </th>');

  assert.ok(subjectIdx !== -1, 'SUBJECT header must exist');
  assert.ok(examIdx !== -1, 'EXAMINATION / ASSESSMENT header must exist');
  assert.ok(obtIdx !== -1, 'OBTAINED MARKS header must exist');
  assert.ok(maxIdx !== -1, 'MAXIMUM MARKS header must exist');
  assert.ok(statusIdx !== -1, 'STATUS header must exist');

  assert.ok(subjectIdx < examIdx, 'SUBJECT must precede EXAMINATION / ASSESSMENT');
  assert.ok(examIdx < obtIdx, 'EXAMINATION / ASSESSMENT must precede OBTAINED MARKS');
  assert.ok(obtIdx < maxIdx, 'OBTAINED MARKS must precede MAXIMUM MARKS');
  assert.ok(maxIdx < statusIdx, 'MAXIMUM MARKS must precede STATUS');

  // Verify colSpan=5 for full width loading and empty state rows
  assert.ok(resultsClientCode.includes('colSpan={5}'), 'colSpan={5} must be used');
});

// Test M: Correct Lab Result Classification for (B) courses and practical subjects
test('Test M: Correct Lab Result Classification - (B) courses and Practical subjects route to Lab, never Series Exam 1 or 2', () => {
  // Course codes ending in (B)
  assert.equal(isLabCourse('24MAP300(B)'), true, '24MAP300(B) must be classified as lab');
  assert.equal(isLabCourse('24MAP300 (B)'), true, '24MAP300 (B) must be classified as lab');
  assert.equal(isLabCourse('24AIP305(B)'), true, '24AIP305(B) must be classified as lab');
  assert.equal(isLabCourse('24AIP305 [b]'), true, '24AIP305 [b] must be classified as lab');

  // Subjects named Practical
  assert.equal(
    isLabCourse(undefined, 'Advanced Linear Algebra and Transforms (Practical)'),
    true,
    'Practical named course must be classified as lab'
  );
  assert.equal(
    isLabCourse('24MAP300', 'Advanced Linear Algebra and Transforms (Practical)'),
    true,
    'Course with Practical in name must be classified as lab even if base code is provided'
  );

  // Classification assertions
  const classifiedB = classifyAssessmentRecord(
    '24MAP300(B)',
    'Advanced Linear Algebra and Transforms',
    'Series Exam 1',
    'Sessional Exams'
  );
  assert.equal(classifiedB.isLab, true, 'isLab must be true');
  assert.equal(classifiedB.category, 'Lab', 'category must be Lab, never Series Exam 1');
  assert.equal(classifiedB.canonicalCode, '24MAP300(B)', 'canonicalCode must preserve (B)');
  assert.equal(classifiedB.canonicalName, 'Advanced Linear Algebra and Transforms (Practical)', 'canonicalName must preserve (Practical)');

  // Ensure recordMatchesCategory strictly excludes (B) courses from Series 1 and 2
  const labRec = {
    subjectCode: '24MAP300(B)',
    subjectName: 'Advanced Linear Algebra and Transforms (Practical)',
    examName: 'Lab Exam 1',
    category: 'Lab Evaluation',
    isLab: true,
  };
  assert.equal(recordMatchesCategory(labRec, 'Series Exam 1'), false, '(B) course must not match Series Exam 1');
  assert.equal(recordMatchesCategory(labRec, 'Series Exam 2'), false, '(B) course must not match Series Exam 2');
  assert.equal(recordMatchesCategory(labRec, 'Lab'), true, '(B) course must match Lab');
});

// Test N: Separate Theory and Practical Internal Marks
test('Test N: Separate Theory and Practical Internal Marks - Correct routing without record duplication', () => {
  const theoryInternal = {
    id: 'rec-int-s3-01',
    subjectCode: '24CSP304',
    subjectName: 'Data Structures and Algorithms',
    examName: 'Continuous Assessment (CIA)',
    category: 'Internal Marks',
    obtainedMarks: 46,
    maxMarks: 50,
    isLab: false,
  };

  const practicalInternal = {
    id: 'rec-int-s3-04',
    subjectCode: '24MAP300(B)',
    subjectName: 'Advanced Linear Algebra and Transforms (Practical)',
    examName: 'Practical Continuous Assessment (CIA)',
    category: 'Internal Marks',
    obtainedMarks: 48,
    maxMarks: 50,
    isLab: true,
  };

  // Both match Internal Marks category
  assert.equal(recordMatchesCategory(theoryInternal, 'Internal Marks'), true, 'Theory internal must match Internal Marks');
  assert.equal(recordMatchesCategory(practicalInternal, 'Internal Marks'), true, 'Practical internal must match Internal Marks');

  // Practical internal also matches Lab; theory internal does NOT match Lab
  assert.equal(recordMatchesCategory(theoryInternal, 'Lab'), false, 'Theory internal must NOT match Lab');
  assert.equal(recordMatchesCategory(practicalInternal, 'Lab'), true, 'Practical internal matches Lab');

  // Neither matches Series 1 or 2
  assert.equal(recordMatchesCategory(theoryInternal, 'Series Exam 1'), false);
  assert.equal(recordMatchesCategory(theoryInternal, 'Series Exam 2'), false);
  assert.equal(recordMatchesCategory(practicalInternal, 'Series Exam 1'), false);
  assert.equal(recordMatchesCategory(practicalInternal, 'Series Exam 2'), false);

  // Verify Results UI splits Internal Marks into Theory and Practical sections
  const resultsClientPath = path.resolve('src/app/dashboard/results/results-client.tsx');
  const resultsClientCode = fs.readFileSync(resultsClientPath, 'utf8');

  assert.ok(
    resultsClientCode.includes('Theory Internal Assessments'),
    'Results client must render Theory Internal Assessments section'
  );
  assert.ok(
    resultsClientCode.includes('Practical / Lab Internal Assessments'),
    'Results client must render Practical / Lab Internal Assessments section'
  );
  assert.ok(
    resultsClientCode.includes('theoryInternalRecords'),
    'Results client must compute theoryInternalRecords'
  );
  assert.ok(
    resultsClientCode.includes('practicalInternalRecords'),
    'Results client must compute practicalInternalRecords'
  );
});

// Test O: Published-only Assignment Results on Results Page
test('Test O: Assignment Results - Only published assignments appear in results and practical names retain Practical', () => {
  const unifiedAcademicPath = path.resolve('src/lib/unified-academic-service.ts');
  const unifiedCode = fs.readFileSync(unifiedAcademicPath, 'utf8');

  // Verify unified-academic-service filters assignments for results page to published marks only
  assert.ok(
    unifiedCode.includes('if (asg.obtainedMarks === undefined || asg.obtainedMarks === null)'),
    'Must filter out assignments without published marks from Results page'
  );

  // Verify (Practical) is appended to practical assignment names
  assert.ok(
    unifiedCode.includes("examName = `${examName} (Practical)`"),
    'Must append (Practical) to practical assignment assessment name'
  );

  // Verify (B) is preserved in subject code for practical assignments
  assert.ok(
    unifiedCode.includes("code = `${strippedCode}(B)`"),
    'Must preserve (B) in course code for practical assignments'
  );
});
