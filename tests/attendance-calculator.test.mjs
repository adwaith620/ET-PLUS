import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePercentage,
  calculateProjectedAfterMiss,
  calculateProjectedAfterAttend,
  calculateClassesToRecover,
  calculateSafeBunks,
  getAttendanceStatus,
  calculateAttendanceSummary
} from '../src/lib/attendance-calculator.ts';

test('calculatePercentage - normal and boundary cases', () => {
  // Normal cases
  assert.equal(calculatePercentage(75, 100), 75);
  assert.equal(calculatePercentage(18, 20), 90);
  assert.equal(calculatePercentage(17, 23), 73.91);

  // Zero conducted classes returns 0% (never fabricated 100%)
  assert.equal(calculatePercentage(0, 0), 0);
  assert.equal(calculatePercentage(0, -1), 0);

  // Zero attended classes with conducted > 0
  assert.equal(calculatePercentage(0, 10), 0);

  // 100% attendance
  assert.equal(calculatePercentage(25, 25), 100);
});

test('calculateProjectedAfterMiss - formula P = 100 * (A / (T + m))', () => {
  // Current 20/25 = 80%. Miss 5 classes: 20/30 = 66.67%
  assert.equal(calculateProjectedAfterMiss(20, 25, 5), 66.67);

  // Miss 0 classes -> remains 80%
  assert.equal(calculateProjectedAfterMiss(20, 25, 0), 80);

  // Miss 1 class: 20/26 = 76.92%
  assert.equal(calculateProjectedAfterMiss(20, 25, 1), 76.92);
});

test('calculateProjectedAfterAttend - formula P = 100 * ((A + n) / (T + n))', () => {
  // Current 18/25 = 72%. Attend 5 classes: 23/30 = 76.67%
  assert.equal(calculateProjectedAfterAttend(18, 25, 5), 76.67);

  // Attend 0 classes -> remains 72%
  assert.equal(calculateProjectedAfterAttend(18, 25, 0), 72);
});

test('calculateClassesToRecover - formula n = ceil((p*T - A) / (1 - p))', () => {
  // Attended 14/20 = 70%. Target 75% (p = 0.75).
  // Formula: ceil((0.75 * 20 - 14) / (1 - 0.75)) = ceil((15 - 14) / 0.25) = ceil(1 / 0.25) = 4
  assert.equal(calculateClassesToRecover(14, 20, 75), 4);
  // Verify: after 4 classes attended: (14+4)/(20+4) = 18/24 = 75.0% !

  // Already above target (16/20 = 80%, target 75%) -> requires 0 classes
  assert.equal(calculateClassesToRecover(16, 20, 75), 0);

  // Exact target (15/20 = 75%, target 75%) -> requires 0 classes
  assert.equal(calculateClassesToRecover(15, 20, 75), 0);

  // Edge case: target 100% with already missed classes -> Infinity
  assert.equal(calculateClassesToRecover(19, 20, 100), Infinity);

  // Target 100% with 0 missed classes -> 0
  assert.equal(calculateClassesToRecover(20, 20, 100), 0);

  // Zero conducted classes -> 0
  assert.equal(calculateClassesToRecover(0, 0, 75), 0);
});

test('calculateSafeBunks - formula m_max = floor(A / p - T)', () => {
  // Attended 18/20 = 90%. Target 75% (p = 0.75).
  // Formula: floor(18 / 0.75 - 20) = floor(24 - 20) = 4
  assert.equal(calculateSafeBunks(18, 20, 75), 4);
  // Verify: after 4 misses: 18 / (20 + 4) = 18/24 = 75.0% ! After 5 misses: 18/25 = 72% (< 75%).
  // So 4 is exact!

  // Attended 14/20 = 70%. Target 75% -> already below target -> 0 safe bunks
  assert.equal(calculateSafeBunks(14, 20, 75), 0);

  // Target 80% with 36/40 = 90%:
  // floor(36 / 0.8 - 40) = floor(45 - 40) = 5
  assert.equal(calculateSafeBunks(36, 40, 80), 5);

  // Target 0% -> Infinity
  assert.equal(calculateSafeBunks(10, 20, 0), Infinity);
});

test('getAttendanceStatus', () => {
  assert.equal(getAttendanceStatus(80, 75), 'safe');
  assert.equal(getAttendanceStatus(75, 75), 'safe');
  assert.equal(getAttendanceStatus(73, 75), 'warning'); // within 5%
  assert.equal(getAttendanceStatus(68, 75), 'critical'); // < 70%
});

test('calculateAttendanceSummary - composite subjects', () => {
  const subjects = [
    { code: 'CST302', name: 'Compiler Design', faculty: 'Dr. Jane', attendedHours: 24, totalHours: 30 }, // 80%
    { code: 'CST304', name: 'Computer Graphics', faculty: 'Prof. John', attendedHours: 18, totalHours: 25 }, // 72%
    { code: 'CSL332', name: 'Networking Lab', faculty: 'Dr. Alice', attendedHours: 12, totalHours: 12 }, // 100%
  ];

  const summary = calculateAttendanceSummary(subjects, 75);
  // Total attended = 24 + 18 + 12 = 54
  // Total conducted = 30 + 25 + 12 = 67
  // Overall percentage = 54 / 67 = 80.60%
  assert.equal(summary.totalAttended, 54);
  assert.equal(summary.totalConducted, 67);
  assert.equal(summary.overallPercentage, 80.6);
  assert.equal(summary.status, 'safe');
  assert.equal(summary.subjects.length, 3);
  assert.equal(summary.subjects[1].classesToRecover, 3); // 18/25 = 72%, needs ceil((0.75*25-18)/0.25) = ceil((18.75-18)/0.25) = ceil(0.75/0.25) = 3
});
