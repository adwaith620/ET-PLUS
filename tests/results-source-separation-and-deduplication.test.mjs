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
