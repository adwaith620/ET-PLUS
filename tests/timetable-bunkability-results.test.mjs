import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { isClassBunkable } from '../src/lib/attendance-calculator.ts';
import { DEMO_TIMETABLE, DEMO_ANNOUNCEMENTS } from '../src/lib/demo-data.ts';
import { STUDENT_B_TIMETABLE } from '../src/lib/course-catalog.ts';

test('isClassBunkable - Bunkability Forecasting Logic', () => {
  const subjects = [
    { code: '24CSP304', attendedHours: 24, totalHours: 25 }, // 24/25 = 96%. If miss 1: 24/26 = 92.3% >= 75% -> true
    { code: '24AIJ303', attendedHours: 19, totalHours: 25 }, // 19/25 = 76%. If miss 1: 19/26 = 73.07% < 75% -> false
    { code: '24ZERO', attendedHours: 0, totalHours: 0 },    // Zero hours conducted -> false
  ];

  // Safe to miss 1 class at 75% target
  assert.equal(isClassBunkable('24CSP304', subjects, 75, 1), true);

  // Not safe to miss 1 class at 75% target (drops to ~73%)
  assert.equal(isClassBunkable('24AIJ303', subjects, 75, 1), false);

  // Reactive target: at 70% target, 24AIJ303 (projected 73.07%) becomes bunkable!
  assert.equal(isClassBunkable('24AIJ303', subjects, 70, 1), true);

  // At 95% target, 24CSP304 (projected 92.3%) is NOT bunkable!
  assert.equal(isClassBunkable('24CSP304', subjects, 95, 1), false);

  // Edge cases:
  // Free period is never bunkable
  assert.equal(isClassBunkable('FREE', subjects, 75, 1), false);
  // Zero conducted classes is never bunkable
  assert.equal(isClassBunkable('24ZERO', subjects, 75, 1), false);
  // Unknown course is never bunkable
  assert.equal(isClassBunkable('UNKNOWN101', subjects, 75, 1), false);
  // Empty subject list is never bunkable
  assert.equal(isClassBunkable('24CSP304', [], 75, 1), false);
  // Invalid targets
  assert.equal(isClassBunkable('24CSP304', subjects, 0, 1), false);
  assert.equal(isClassBunkable('24CSP304', subjects, 105, 1), false);
});

test('Timetable Account Isolation', () => {
  // Ensure Account A (DEMO_TIMETABLE) and Account B (STUDENT_B_TIMETABLE) are distinct
  assert.notEqual(DEMO_TIMETABLE.length, 0);
  assert.notEqual(STUDENT_B_TIMETABLE.length, 0);

  // Account A (S3 AI) has 24CSP304 / 24AIJ303
  const aCodes = new Set(DEMO_TIMETABLE.map((s) => s.subjectCode));
  assert.ok(aCodes.has('24CSP304'));
  assert.ok(aCodes.has('24AIJ303'));

  // Account B (S1 Circuit) has 24MAT101 / 24CYT100
  const bCodes = new Set(STUDENT_B_TIMETABLE.map((s) => s.subjectCode));
  assert.ok(bCodes.has('24MAT101'));
  assert.ok(bCodes.has('24CYT100'));
  assert.ok(!bCodes.has('24CSP304'));

  // Explicit Free period exists on Friday Period 4 for S3
  const friP4 = DEMO_TIMETABLE.find((s) => s.day === 'Friday' && s.period === 4);
  assert.ok(friP4);
  assert.equal(friP4.type, 'Free');
  assert.equal(friP4.subjectCode, 'FREE');
});

test('Room/Classroom Removal from UI', () => {
  const timetableClientPath = path.resolve('src/app/dashboard/timetable/timetable-client.tsx');
  const timetableClientCode = fs.readFileSync(timetableClientPath, 'utf8');

  // Verify MapPin import and usage is completely removed
  assert.ok(!timetableClientCode.includes('MapPin'), 'MapPin icon should not be imported or used in timetable-client');
  // Verify Room not specified is not present
  assert.ok(!timetableClientCode.includes('Room not specified'), 'Room not specified fallback should not exist in timetable-client');

  const dashboardPagePath = path.resolve('src/app/dashboard/page.tsx');
  const dashboardPageCode = fs.readFileSync(dashboardPagePath, 'utf8');

  // Verify "Room" table header is removed from Overview Schedule
  assert.ok(!dashboardPageCode.includes('<th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px]">Room</th>'));
  // Verify Type column replaces it
  assert.ok(dashboardPageCode.includes('<th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px]">Type</th>'));
});

test('Consistent Neutral Theory and Lab Badge Styling', () => {
  const timetableClientPath = path.resolve('src/app/dashboard/timetable/timetable-client.tsx');
  const timetableClientCode = fs.readFileSync(timetableClientPath, 'utf8');

  // Verify neutral styling for Theory and Lab
  const neutralClass = 'bg-[#f4f1eb] dark:bg-[#202227] text-[#78716c] dark:text-[#9ca3af] border-[#e7e4de] dark:border-[#2a2d35]';
  assert.ok(timetableClientCode.includes(neutralClass), 'Neutral styling class must be present');

  // Verify no yellow/amber styling on Lab badges
  assert.ok(!timetableClientCode.includes('bg-amber-500/10'), 'No amber badge styling should exist in timetable-client');
  assert.ok(!timetableClientCode.includes('Practical Lab'), 'Label must simply be Lab, not Practical Lab');
  assert.ok(!timetableClientCode.includes('Theory Course'), 'Label must simply be Theory, not Theory Course');
});

test('Results Navigation - Exactly 5 Categories', () => {
  const resultsClientPath = path.resolve('src/app/dashboard/results/results-client.tsx');
  const resultsClientCode = fs.readFileSync(resultsClientPath, 'utf8');

  const expectedCategories = [
    'Series Exam 1',
    'Series Exam 2',
    'Internal Marks',
    'Assignments',
    'Lab',
  ];

  for (const cat of expectedCategories) {
    assert.ok(resultsClientCode.includes(`'${cat}'`), `Results navigation must include ${cat}`);
  }

  // Ensure old categories are gone
  assert.ok(!resultsClientCode.includes("'Series Exam 1 (Theory)'"));
  assert.ok(!resultsClientCode.includes("'Mid-Term Examination'"));
  assert.ok(!resultsClientCode.includes("'Continuous Evaluation'"));
  assert.ok(!resultsClientCode.includes("'Practical / Laboratory'"));
});

test('Announcements - Removed Sample Data & Clean Empty State', () => {
  // Verify sample announcements array is empty
  assert.equal(DEMO_ANNOUNCEMENTS.length, 0, 'DEMO_ANNOUNCEMENTS should be empty');

  const announcementsClientPath = path.resolve('src/app/dashboard/announcements/announcements-client.tsx');
  const announcementsClientCode = fs.readFileSync(announcementsClientPath, 'utf8');

  // Clean empty state message
  assert.ok(announcementsClientCode.includes('No announcements available'));
  assert.ok(announcementsClientCode.includes('Official circulars, exam notifications, and cohort announcements will appear here when posted.'));
});

test('Official ETPlus Branding in Navigation and Login', () => {
  const sidebarPath = path.resolve('src/components/layout/sidebar.tsx');
  const mobileNavPath = path.resolve('src/components/layout/mobile-nav.tsx');
  const loginPath = path.resolve('src/app/login/page.tsx');

  const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');
  const mobileNavCode = fs.readFileSync(mobileNavPath, 'utf8');
  const loginCode = fs.readFileSync(loginPath, 'utf8');

  // BrandLogo component used in all navigation headers and login
  assert.ok(sidebarCode.includes('<BrandLogo'));
  assert.ok(mobileNavCode.includes('<BrandLogo'));
  assert.ok(loginCode.includes('<BrandLogo'));

  // Ensure GraduationCap is not used for the ETPlus logo
  assert.ok(!sidebarCode.includes('<GraduationCap'));
  assert.ok(!mobileNavCode.includes('<GraduationCap'));
  assert.ok(!loginCode.includes('<GraduationCap'));
});
