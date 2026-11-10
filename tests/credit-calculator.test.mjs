import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OFFICIAL_GRADES_TABLE,
  ORDERED_GRADES,
  GRADE_MIN_TOTALS,
  GRADE_POINTS,
  GRADE_COLORS,
  EVALUATION_CONFIGS,
  detectEvaluationType,
  checkPassingConditions,
  determineGrade,
  calculateTargetEse,
  stepGrade,
  calculateSummary,
  isMinorOrRemedial,
} from '../src/lib/credit-calculator.ts';
import { DEMO_ASSESSMENT_RECORDS } from '../src/lib/demo-data.ts';
import { recordMatchesCategory } from '../src/lib/course-catalog.ts';

// -----------------------------------------------------------------------------
// 1. Evaluation Types: Type 1, Type 2, Type 3
// -----------------------------------------------------------------------------
test('1. Evaluation Types - Configuration and metadata detection', () => {
  // Type 1: CIA /60, ESE /40, Total /100
  const type1 = EVALUATION_CONFIGS['Type 1'];
  assert.equal(type1.ciaMax, 60);
  assert.equal(type1.eseMax, 40);
  assert.equal(type1.hasEse, true);
  assert.equal(type1.minCia, 24); // 40% of 60
  assert.equal(type1.minEse, 16); // 40% of 40
  assert.equal(type1.minTotal, 50);

  // Type 2: CIA /40, ESE /60, Total /100
  const type2 = EVALUATION_CONFIGS['Type 2'];
  assert.equal(type2.ciaMax, 40);
  assert.equal(type2.eseMax, 60);
  assert.equal(type2.hasEse, true);
  assert.equal(type2.minCia, 16); // 40% of 40
  assert.equal(type2.minEse, 24); // 40% of 60
  assert.equal(type2.minTotal, 50);

  // Type 3: CIA /100, No ESE, Total /100
  const type3 = EVALUATION_CONFIGS['Type 3'];
  assert.equal(type3.ciaMax, 100);
  assert.equal(type3.eseMax, 0);
  assert.equal(type3.hasEse, false);
  assert.equal(type3.minCia, 40); // 40% of 100
  assert.equal(type3.minEse, 0);
  assert.equal(type3.minTotal, 50);

  // Detection strictly based on CIA denominator:
  // 60 -> Type 1 (60/40), ESE max: 40
  const d1 = detectEvaluationType(60);
  assert.equal(d1.type, 'Type 1');
  assert.equal(d1.config.label, 'Type 1 (60/40)');
  assert.equal(d1.config.ciaMax, 60);
  assert.equal(d1.config.eseMax, 40);
  assert.equal(d1.isReliable, true);

  // 40 -> Type 2 (40/60), ESE max: 60
  const d2 = detectEvaluationType(40);
  assert.equal(d2.type, 'Type 2');
  assert.equal(d2.config.label, 'Type 2 (40/60)');
  assert.equal(d2.config.ciaMax, 40);
  assert.equal(d2.config.eseMax, 60);
  assert.equal(d2.isReliable, true);

  // 100 -> Type 3 (100/NIL), ESE max: NIL (0)
  const d3 = detectEvaluationType(100);
  assert.equal(d3.type, 'Type 3');
  assert.equal(d3.config.label, 'Type 3 (100/NIL)');
  assert.equal(d3.config.ciaMax, 100);
  assert.equal(d3.config.eseMax, 0);
  assert.equal(d3.config.hasEse, false);
  assert.equal(d3.isReliable, true);

  // Unverified fallback when CIA denominator is missing or not 40/60/100
  const dMissing = detectEvaluationType(undefined);
  assert.equal(dMissing.type, 'Unverified');
  assert.equal(dMissing.config.label, 'Needs Verification');
  assert.equal(dMissing.isReliable, false);

  const dOdd = detectEvaluationType(50);
  assert.equal(dOdd.type, 'Unverified');
  assert.equal(dOdd.config.label, 'Needs Verification');
  assert.equal(dOdd.isReliable, false);
});

// -----------------------------------------------------------------------------
// 2. Exact Grade Boundaries (50, 55, 60, 65, 70, 75, 80, 85, 90 and ±0.1)
// -----------------------------------------------------------------------------
test('2. Grade Boundaries - Exact thresholds without rounding', () => {
  // S: 90% and above
  assert.deepEqual(determineGrade(90.0, true), { grade: 'S', gradePoint: 10.0 });
  assert.deepEqual(determineGrade(90.1, true), { grade: 'S', gradePoint: 10.0 });
  assert.deepEqual(determineGrade(100, true), { grade: 'S', gradePoint: 10.0 });
  assert.deepEqual(determineGrade(89.9, true), { grade: 'A+', gradePoint: 9.0 });

  // A+: 85% to <90%
  assert.deepEqual(determineGrade(85.0, true), { grade: 'A+', gradePoint: 9.0 });
  assert.deepEqual(determineGrade(85.1, true), { grade: 'A+', gradePoint: 9.0 });
  assert.deepEqual(determineGrade(84.9, true), { grade: 'A', gradePoint: 8.5 });

  // A: 80% to <85%
  assert.deepEqual(determineGrade(80.0, true), { grade: 'A', gradePoint: 8.5 });
  assert.deepEqual(determineGrade(80.1, true), { grade: 'A', gradePoint: 8.5 });
  assert.deepEqual(determineGrade(79.9, true), { grade: 'B+', gradePoint: 8.0 });

  // B+: 75% to <80%
  assert.deepEqual(determineGrade(75.0, true), { grade: 'B+', gradePoint: 8.0 });
  assert.deepEqual(determineGrade(75.1, true), { grade: 'B+', gradePoint: 8.0 });
  assert.deepEqual(determineGrade(74.9, true), { grade: 'B', gradePoint: 7.5 });

  // B: 70% to <75%
  assert.deepEqual(determineGrade(70.0, true), { grade: 'B', gradePoint: 7.5 });
  assert.deepEqual(determineGrade(70.1, true), { grade: 'B', gradePoint: 7.5 });
  assert.deepEqual(determineGrade(69.9, true), { grade: 'C+', gradePoint: 7.0 });

  // C+: 65% to <70%
  assert.deepEqual(determineGrade(65.0, true), { grade: 'C+', gradePoint: 7.0 });
  assert.deepEqual(determineGrade(65.1, true), { grade: 'C+', gradePoint: 7.0 });
  assert.deepEqual(determineGrade(64.9, true), { grade: 'C', gradePoint: 6.5 });

  // C: 60% to <65%
  assert.deepEqual(determineGrade(60.0, true), { grade: 'C', gradePoint: 6.5 });
  assert.deepEqual(determineGrade(60.1, true), { grade: 'C', gradePoint: 6.5 });
  assert.deepEqual(determineGrade(59.9, true), { grade: 'D', gradePoint: 6.0 });

  // D: 55% to <60%
  assert.deepEqual(determineGrade(55.0, true), { grade: 'D', gradePoint: 6.0 });
  assert.deepEqual(determineGrade(55.1, true), { grade: 'D', gradePoint: 6.0 });
  assert.deepEqual(determineGrade(54.9, true), { grade: 'P', gradePoint: 5.5 });

  // P (Pass): 50% to <55%
  assert.deepEqual(determineGrade(50.0, true), { grade: 'P', gradePoint: 5.5 });
  assert.deepEqual(determineGrade(50.1, true), { grade: 'P', gradePoint: 5.5 });
  assert.deepEqual(determineGrade(49.9, true), { grade: 'F', gradePoint: 0.0 });
  assert.deepEqual(determineGrade(49.99, true), { grade: 'F', gradePoint: 0.0 });

  // F: Below 50%
  assert.deepEqual(determineGrade(49.0, true), { grade: 'F', gradePoint: 0.0 });
  assert.deepEqual(determineGrade(0.0, true), { grade: 'F', gradePoint: 0.0 });
});

// -----------------------------------------------------------------------------
// 3. Mandatory Passing Conditions (Type 1, Type 2, Type 3, Individual vs Combined)
// -----------------------------------------------------------------------------
test('3. Mandatory Passing Conditions - Independent threshold enforcement', () => {
  const type1 = EVALUATION_CONFIGS['Type 1'];
  const type2 = EVALUATION_CONFIGS['Type 2'];
  const type3 = EVALUATION_CONFIGS['Type 3'];

  // Type 1: Valid passing case (CIA 52/60, ESE 32/40, Total 84)
  const passT1 = checkPassingConditions(52, 32, type1);
  assert.equal(passT1.isPassing, true);
  assert.equal(passT1.reasons.length, 0);

  // Type 1: Combined marks 62/100, BUT ESE is 10/40 (< 16/40) -> FAIL!
  const failEseT1 = checkPassingConditions(52, 10, type1);
  assert.equal(failEseT1.isPassing, false);
  assert.equal(failEseT1.eseSatisfied, false);
  assert.ok(failEseT1.reasons.some((r) => r.includes('End Semester Examination to pass')));
  // Verify grade is strictly F even though 62 total would otherwise fall in C grade range
  assert.deepEqual(determineGrade(62, failEseT1.isPassing), { grade: 'F', gradePoint: 0.0 });

  // Type 1: Combined marks 62/100, BUT CIA is 22/60 (< 24/60) -> FAIL!
  const failCiaT1 = checkPassingConditions(22, 40, type1);
  assert.equal(failCiaT1.isPassing, false);
  assert.equal(failCiaT1.ciaSatisfied, false);
  assert.ok(failCiaT1.reasons.some((r) => r.includes('CIA threshold')));

  // Type 1: CIA 24/60 (40%) and ESE 16/40 (40%), Total 40 (< 50) -> FAIL on combined marks!
  const failTotalT1 = checkPassingConditions(24, 16, type1);
  assert.equal(failTotalT1.isPassing, false);
  assert.equal(failTotalT1.totalSatisfied, false);
  assert.ok(failTotalT1.reasons.some((r) => r.includes('at least 50/100 to pass')));

  // Type 2: Valid passing case (CIA 35/40, ESE 48/60, Total 83)
  const passT2 = checkPassingConditions(35, 48, type2);
  assert.equal(passT2.isPassing, true);

  // Type 2: Combined marks 62/100, BUT ESE is 22/60 (< 24/60) -> FAIL!
  const failEseT2 = checkPassingConditions(40, 22, type2);
  assert.equal(failEseT2.isPassing, false);
  assert.equal(failEseT2.eseSatisfied, false);

  // Type 2: Combined marks 65/100, BUT CIA is 15/40 (< 16/40) -> FAIL!
  const failCiaT2 = checkPassingConditions(15, 50, type2);
  assert.equal(failCiaT2.isPassing, false);
  assert.equal(failCiaT2.ciaSatisfied, false);

  // Type 3: CIA 78/100 -> Pass (B+)
  const passT3 = checkPassingConditions(78, undefined, type3);
  assert.equal(passT3.isPassing, true);
  assert.deepEqual(determineGrade(78, passT3.isPassing), { grade: 'B+', gradePoint: 8.0 });

  // Type 3: CIA 45/100 (< 50) -> FAIL!
  const failTotalT3 = checkPassingConditions(45, undefined, type3);
  assert.equal(failTotalT3.isPassing, false);
  assert.deepEqual(determineGrade(45, failTotalT3.isPassing), { grade: 'F', gradePoint: 0.0 });

  // Type 3: CIA 39/100 (< 40) -> FAIL!
  const failCiaT3 = checkPassingConditions(39, undefined, type3);
  assert.equal(failCiaT3.isPassing, false);
});

// -----------------------------------------------------------------------------
// 4. Interactive Grade Up/Down Target Predictor
// -----------------------------------------------------------------------------
test('4. Grade Predictor - Step navigation, target ESE calculations, and constraints', () => {
  const type1 = EVALUATION_CONFIGS['Type 1'];

  // Test UP / DOWN step navigation
  assert.equal(stepGrade('A', 'UP'), 'A+');
  assert.equal(stepGrade('A+', 'UP'), 'S');
  assert.equal(stepGrade('S', 'UP'), 'S'); // Cannot navigate above S
  assert.equal(stepGrade('A', 'DOWN'), 'B+');
  assert.equal(stepGrade('P', 'DOWN'), 'F');
  assert.equal(stepGrade('F', 'DOWN'), 'F'); // Cannot navigate below F

  // Prompt Example: CIA: 52/60. Wants A+ (85).
  // Required ESE = 85 - 52 = 33/40.
  const predAplus = calculateTargetEse('A+', 52, type1);
  assert.equal(predAplus.isAttainable, true);
  assert.equal(predAplus.requiredEse, 33);
  assert.ok(predAplus.explanation.includes('Required ESE Marks: 33/40'));
  assert.ok(predAplus.explanation.includes('You need at least 33 marks in your End Semester Examination to achieve A+'));

  // Target S (90): Required ESE = 90 - 52 = 38/40
  const predS = calculateTargetEse('S', 52, type1);
  assert.equal(predS.isAttainable, true);
  assert.equal(predS.requiredEse, 38);

  // Target P (50): 50 - 52 = -2, BUT mandatory ESE passing requirement is 16/40!
  // Must require 16/40!
  const predP = calculateTargetEse('P', 52, type1);
  assert.equal(predP.isAttainable, true);
  assert.equal(predP.requiredEse, 16);
  assert.ok(predP.explanation.includes('mandatory 40% ESE passing requirement'));

  // Impossible target: CIA 30/60. Target S (90).
  // 90 - 30 = 60 > 40 max ESE. Must be flagged as unattainable!
  const predImpossible = calculateTargetEse('S', 30, type1);
  assert.equal(predImpossible.isAttainable, false);
  assert.ok(predImpossible.explanation.includes('maximum possible ESE marks'));

  // Type 3 CIA-only target prediction
  const type3 = EVALUATION_CONFIGS['Type 3'];
  // CIA 78/100: Target B+ (75) is already achieved
  const predT3Achieved = calculateTargetEse('B+', 78, type3);
  assert.equal(predT3Achieved.isAttainable, true);
  assert.equal(predT3Achieved.isAlreadyAchieved, true);
  assert.ok(predT3Achieved.explanation.includes('already achieved'));

  // CIA 78/100: Target A (80) is unattainable because no ESE exists
  const predT3Unattainable = calculateTargetEse('A', 78, type3);
  assert.equal(predT3Unattainable.isAttainable, false);
  assert.ok(predT3Unattainable.explanation.includes('no End Semester Examination'));
});

// -----------------------------------------------------------------------------
// 5. Data Integration - Results -> Internal source of truth
// -----------------------------------------------------------------------------
test('5. Data Integration - Maps official internal assessment records from Results -> Internal', () => {
  // Filter records using the exact category filter from Results page
  const internalRecords = DEMO_ASSESSMENT_RECORDS.filter(
    (rec) => rec.semester === 'IIIrd Semester' && recordMatchesCategory(rec, 'Internal Marks')
  );

  assert.ok(internalRecords.length > 0, 'Internal marks records must exist');

  // Verify Theory courses
  const dsa = internalRecords.find((r) => r.subjectCode === '24CSP304');
  assert.ok(dsa, '24CSP304 internal record must exist');
  assert.equal(dsa.obtainedMarks, 52);
  assert.equal(dsa.maxMarks, 60);
  assert.equal(dsa.isLab, false);

  const cso = internalRecords.find((r) => r.subjectCode === '24AIP305');
  assert.ok(cso, '24AIP305 internal record must exist');
  assert.equal(cso.obtainedMarks, 35);
  assert.equal(cso.maxMarks, 40);

  // Verify Type 3 Life Skills / CIA-only course
  const lifeSkills = internalRecords.find((r) => r.subjectCode === '24HUT310');
  assert.ok(lifeSkills, '24HUT310 internal record must exist');
  assert.equal(lifeSkills.obtainedMarks, 78);
  assert.equal(lifeSkills.maxMarks, 100);

  // Verify Practical course is segregated with (B) suffix
  const mathLab = internalRecords.find((r) => r.subjectCode === '24MAP300(B)');
  assert.ok(mathLab, '24MAP300(B) practical internal record must exist');
  assert.equal(mathLab.isLab, true);
  assert.equal(mathLab.maxMarks, 100);
});

// -----------------------------------------------------------------------------
// 6. Overall Summary Metrics
// -----------------------------------------------------------------------------
test('6. Summary Metrics - Dynamic calculation of pass/fail, grade counts, and SGPA', () => {
  const subjects = [
    {
      id: 'sub-1',
      subjectCode: '24CSP304',
      subjectName: 'DSA',
      credits: 4,
      isLab: false,
      evaluationType: 'Type 1',
      isEvaluationReliable: true,
      config: EVALUATION_CONFIGS['Type 1'],
      ciaObtained: 52,
      ciaMax: 60,
      eseInput: 32,
      hasPublishedCia: true,
      totalMarks: 84,
      grade: 'A',
      gradePoint: 8.5,
      isPassing: true,
      passingReasons: [],
    },
    {
      id: 'sub-2',
      subjectCode: '24AIP305',
      subjectName: 'CSO',
      credits: 4,
      isLab: false,
      evaluationType: 'Type 2',
      isEvaluationReliable: true,
      config: EVALUATION_CONFIGS['Type 2'],
      ciaObtained: 35,
      ciaMax: 40,
      eseInput: 48,
      hasPublishedCia: true,
      totalMarks: 83,
      grade: 'A',
      gradePoint: 8.5,
      isPassing: true,
      passingReasons: [],
    },
    {
      id: 'sub-3',
      subjectCode: '24HUT310',
      subjectName: 'Life Skills',
      credits: 2,
      isLab: false,
      evaluationType: 'Type 3',
      isEvaluationReliable: true,
      config: EVALUATION_CONFIGS['Type 3'],
      ciaObtained: 78,
      ciaMax: 100,
      hasPublishedCia: true,
      totalMarks: 78,
      grade: 'B+',
      gradePoint: 8.0,
      isPassing: true,
      passingReasons: [],
    },
  ];

  const summary = calculateSummary(subjects);
  assert.equal(summary.totalSubjects, 3);
  assert.equal(summary.passedCount, 3);
  assert.equal(summary.failedCount, 0);
  assert.equal(summary.sGradeCount, 0);
  assert.equal(summary.aGradesCount, 2); // 2 A grades
  // Weighted SGPA: (8.5*4 + 8.5*4 + 8.0*2) / (4 + 4 + 2) = (34 + 34 + 16) / 10 = 84 / 10 = 8.4
  assert.equal(summary.weightedSgpa, 8.4);
});

// -----------------------------------------------------------------------------
// 7. Complete Removal of MINOR / REMEDIAL Subjects
// -----------------------------------------------------------------------------
test('7. Minor/Remedial Removal - Complete exclusion from calculations and summaries', () => {
  // Check helper
  assert.equal(isMinorOrRemedial('24CSM3XX', 'MINOR/REMEDIAL'), true);
  assert.equal(isMinorOrRemedial('24CSM301', 'Minor in Cyber Security'), true);
  assert.equal(isMinorOrRemedial('24REM301', 'Remedial Mathematics'), true);
  assert.equal(isMinorOrRemedial('24MAP300', 'Advanced Linear Algebra'), false);
  assert.equal(isMinorOrRemedial('24CSP304', 'Data Structures and Algorithms'), false);
  assert.equal(isMinorOrRemedial('24HUT310', 'Life Skills and Professional Ethics'), false);

  // When filtered out of subject list, summary metrics strictly exclude it
  const sampleSubjects = [
    {
      id: 'sub-1',
      subjectCode: '24CSP304',
      subjectName: 'DSA',
      credits: 4,
      isLab: false,
      evaluationType: 'Type 1',
      isEvaluationReliable: true,
      config: EVALUATION_CONFIGS['Type 1'],
      ciaObtained: 52,
      ciaMax: 60,
      eseInput: 38,
      hasPublishedCia: true,
      totalMarks: 90,
      grade: 'S',
      gradePoint: 10.0,
      isPassing: true,
      passingReasons: [],
    },
    {
      id: 'sub-2',
      subjectCode: '24CSM3XX',
      subjectName: 'MINOR/REMEDIAL',
      credits: 4,
      isLab: false,
      evaluationType: 'Type 2',
      isEvaluationReliable: true,
      config: EVALUATION_CONFIGS['Type 2'],
      ciaObtained: 20,
      ciaMax: 40,
      eseInput: 20,
      hasPublishedCia: true,
      totalMarks: 40,
      grade: 'F',
      gradePoint: 0.0,
      isPassing: false,
      passingReasons: ['Failed combined marks'],
    },
  ];

  // Raw list without filtering would have 2 subjects, 1 pass, 1 fail, 8 credits
  const unfilteredSummary = calculateSummary(sampleSubjects);
  assert.equal(unfilteredSummary.totalSubjects, 2);
  assert.equal(unfilteredSummary.failedCount, 1);

  // Filtered list strictly using isMinorOrRemedial:
  const filtered = sampleSubjects.filter((s) => !isMinorOrRemedial(s.subjectCode, s.subjectName));
  const filteredSummary = calculateSummary(filtered);
  assert.equal(filtered.length, 1);
  assert.equal(filteredSummary.totalSubjects, 1);
  assert.equal(filteredSummary.totalCredits, 4);
  assert.equal(filteredSummary.passedCount, 1);
  assert.equal(filteredSummary.failedCount, 0);
  assert.equal(filteredSummary.sGradeCount, 1);
  assert.equal(filteredSummary.weightedSgpa, 10.0);
});

// -----------------------------------------------------------------------------
// 8. S Grade Theme - Purple Palette and Badge Styling
// -----------------------------------------------------------------------------
test('8. S Grade Styling - Purple theme tokens', () => {
  const sColor = GRADE_COLORS['S'];
  assert.ok(sColor.includes('text-purple-'), 'S grade must use purple text styling');
  assert.ok(sColor.includes('bg-purple-'), 'S grade must use purple background styling');
  assert.ok(sColor.includes('border-purple-'), 'S grade must use purple border styling');
  assert.ok(sColor.includes('shadow-'), 'S grade must include glow / shadow styling');
  assert.ok(!sColor.includes('text-amber-') && !sColor.includes('bg-amber-'), 'S grade must not use amber/orange styling');
});

// -----------------------------------------------------------------------------
// 9. Permanent S Grade Star Effect
// -----------------------------------------------------------------------------
test('9. Permanent S Grade Star Effect - Continuous visibility without timeouts', () => {
  // Test that S grade determination immediately and reactively switches
  const sSubjectMarks = 90.0;
  const aPlusSubjectMarks = 89.9;

  const sResult = determineGrade(sSubjectMarks, true);
  assert.equal(sResult.grade, 'S');
  assert.equal(sResult.gradePoint, 10.0);

  const aPlusResult = determineGrade(aPlusSubjectMarks, true);
  assert.equal(aPlusResult.grade, 'A+');
  assert.equal(aPlusResult.gradePoint, 9.0);

  // Read globals.css to verify continuous twinkle keyframe rules exist
  import('node:fs').then((fs) => {
    const css = fs.readFileSync('src/app/globals.css', 'utf8');
    assert.ok(css.includes('@keyframes s-star-twinkle-a'), 'Must include s-star-twinkle-a keyframe');
    assert.ok(css.includes('@keyframes s-star-twinkle-b'), 'Must include s-star-twinkle-b keyframe');
    assert.ok(css.includes('@keyframes s-badge-glow'), 'Must include s-badge-glow keyframe');
    assert.ok(css.includes('animate-s-star-twinkle-a'), 'Must include animate-s-star-twinkle-a class');
    assert.ok(css.includes('animate-s-star-twinkle-b'), 'Must include animate-s-star-twinkle-b class');
    assert.ok(css.includes('prefers-reduced-motion'), 'Must support prefers-reduced-motion');
  });
});

// -----------------------------------------------------------------------------
// 10. Mobile Bottom Navigation - Fourth item is Credits linking to Credit Calculator
// -----------------------------------------------------------------------------
test('10. Mobile Bottom Navigation - Exactly 5 items with Credits in 4th position', () => {
  import('node:fs').then((fs) => {
    const mobileNavSrc = fs.readFileSync('src/components/layout/mobile-nav.tsx', 'utf8');

    // Extract quick-access bar items array
    const quickBarRegex = /{\/\* Mobile Bottom Quick-Access Bar \*\/}[\s\S]*?\[([\s\S]*?)\]\.map/;
    const match = mobileNavSrc.match(quickBarRegex);
    assert.ok(match, 'Must find quick-access bar items in mobile-nav.tsx');

    const itemsContent = match[1];

    // Verify 5 items in exact order: Overview, Attendance, Results, Credits, Profile
    assert.ok(itemsContent.includes("{ label: 'Overview', href: '/dashboard'"));
    assert.ok(itemsContent.includes("{ label: 'Attendance', href: '/dashboard/attendance'"));
    assert.ok(itemsContent.includes("{ label: 'Results', href: '/dashboard/results'"));
    assert.ok(itemsContent.includes("{ label: 'Credits', href: '/dashboard/calculator', icon: Calculator }"));
    assert.ok(itemsContent.includes("{ label: 'Profile', href: '/dashboard/profile'"));

    // Verify Credits appears after Results and before Profile
    const resultsIndex = itemsContent.indexOf("label: 'Results'");
    const creditsIndex = itemsContent.indexOf("label: 'Credits'");
    const profileIndex = itemsContent.indexOf("label: 'Profile'");
    assert.ok(resultsIndex !== -1 && creditsIndex !== -1 && profileIndex !== -1);
    assert.ok(resultsIndex < creditsIndex, 'Results must come before Credits');
    assert.ok(creditsIndex < profileIndex, 'Credits must come before Profile');

    // Verify desktop sidebar navigation still has Assignments and Credit Calculator
    const sidebarSrc = fs.readFileSync('src/components/layout/sidebar.tsx', 'utf8');
    assert.ok(sidebarSrc.includes("href: '/dashboard/assignments'"), 'Desktop sidebar must retain Assignments');
    assert.ok(sidebarSrc.includes("href: '/dashboard/calculator'"), 'Desktop sidebar must retain Credit Calculator');
  });
});
