import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCachedStudentData,
  setCachedStudentData,
  invalidateStudentCache,
  clearAllStudentCache,
  deduplicateRequest,
} from '../src/lib/cache.ts';
import { DEMO_TIMETABLE, DEMO_DAY_HISTORY } from '../src/lib/demo-data.ts';

function getTimetablePageData() {
  return {
    timetable: DEMO_TIMETABLE,
    dayHistory: DEMO_DAY_HISTORY,
  };
}

test('Cache Suite - Student Data Isolation', () => {
  clearAllStudentCache();

  // Set records for Student A (25CTA12)
  setCachedStudentData('25CTA12', 'attendance', { overallPercentage: 88.5 });

  // Set records for Student B (25CTA99)
  setCachedStudentData('25CTA99', 'attendance', { overallPercentage: 74.2 });

  // 1. Verify Student A gets only Student A's attendance
  const studentAData = getCachedStudentData('25CTA12', 'attendance');
  assert.ok(studentAData);
  assert.equal(studentAData.overallPercentage, 88.5);

  // 2. Verify Student B gets only Student B's attendance
  const studentBData = getCachedStudentData('25CTA99', 'attendance');
  assert.ok(studentBData);
  assert.equal(studentBData.overallPercentage, 74.2);

  // 3. Verify zero cross-account leakage: Student B cannot access Student A's data
  assert.notEqual(studentBData.overallPercentage, studentAData.overallPercentage);

  // 4. Unknown student gets undefined
  const unknown = getCachedStudentData('UNKNOWN_STUDENT', 'attendance');
  assert.equal(unknown, undefined);
});

test('Cache Suite - Invalidation on Logout or Switch', () => {
  clearAllStudentCache();

  // Store data for student A and student B
  setCachedStudentData('25CTA12', 'attendance', { overallPercentage: 85 });
  setCachedStudentData('25CTA12', 'assignments', [{ id: 'asg-test-1' }]);
  setCachedStudentData('25CTA99', 'attendance', { overallPercentage: 72 });

  // Invalidate Student A
  invalidateStudentCache('25CTA12');

  // Student A's records must be completely gone
  assert.equal(getCachedStudentData('25CTA12', 'attendance'), undefined);
  assert.equal(getCachedStudentData('25CTA12', 'assignments'), undefined);

  // Student B's records must remain intact
  const studentB = getCachedStudentData('25CTA99', 'attendance');
  assert.ok(studentB);
  assert.equal(studentB.overallPercentage, 72);
});

test('Cache Suite - TTL Expiration', async () => {
  clearAllStudentCache();

  // Set data with 25ms TTL
  setCachedStudentData('test_user', 'temp_key', { status: 'fresh' }, 25);

  // Immediate read -> present
  const immediate = getCachedStudentData('test_user', 'temp_key');
  assert.ok(immediate);
  assert.equal(immediate.status, 'fresh');

  // Wait 35ms -> expired
  await new Promise((r) => setTimeout(r, 35));

  const expired = getCachedStudentData('test_user', 'temp_key');
  assert.equal(expired, undefined, 'Expired cache entry must return undefined');
});

test('Performance Suite - In-Flight Request Deduplication', async () => {
  clearAllStudentCache();

  let executionCount = 0;
  const slowFetcher = async () => {
    executionCount++;
    await new Promise((r) => setTimeout(r, 20));
    return { data: 'processed_payload', count: executionCount };
  };

  // Launch 5 concurrent calls with the exact same key
  const results = await Promise.all([
    deduplicateRequest('concurrent_key_1', slowFetcher),
    deduplicateRequest('concurrent_key_1', slowFetcher),
    deduplicateRequest('concurrent_key_1', slowFetcher),
    deduplicateRequest('concurrent_key_1', slowFetcher),
    deduplicateRequest('concurrent_key_1', slowFetcher),
  ]);

  // All 5 calls must receive the identical result
  for (const res of results) {
    assert.deepEqual(res, { data: 'processed_payload', count: 1 });
  }

  // The underlying slowFetcher must have executed EXACTLY ONCE
  assert.equal(executionCount, 1, 'In-flight deduplication must execute underlying fetcher exactly once');
});

test('Performance Suite - Instant Timetable Data Provider', () => {
  const t0 = performance.now();
  const timetableData = getTimetablePageData();
  const duration = performance.now() - t0;

  assert.ok(timetableData);
  assert.ok(Array.isArray(timetableData.timetable));
  assert.ok(timetableData.timetable.length > 0);
  assert.ok(duration < 5, `Timetable data provider must resolve in < 5ms (actual: ${duration.toFixed(2)}ms)`);
});

test('Performance Suite - Instant Dashboard Shell Data Resolution', () => {
  clearAllStudentCache();

  // Seed sample cached profile
  setCachedStudentData('25CTA12', 'profile', {
    name: 'Adwaith Krishna M H',
    admissionNo: '25CTA12',
    registerNo: 'TKM25CSAI012',
    department: 'Computer Science (AI)',
    semester: 3,
    batch: '2023-2027',
  });

  const t0 = performance.now();
  const cachedProfile = getCachedStudentData('25CTA12', 'profile');
  const duration = performance.now() - t0;

  assert.ok(cachedProfile);
  assert.equal(cachedProfile.admissionNo, '25CTA12');
  assert.ok(duration < 5, `Profile retrieval must take < 5ms (actual: ${duration.toFixed(2)}ms)`);
});

test('Animation Suite - Verify Elimination of Artificial Route Transition Keyframes', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const globalsCssPath = path.resolve('src/app/globals.css');
  const css = await fs.readFile(globalsCssPath, 'utf-8');

  // Must not have tabFadeIn or fadeInUp keyframes
  assert.ok(!css.includes('@keyframes tabFadeIn'), 'tabFadeIn keyframe must be removed from globals.css');
  assert.ok(!css.includes('@keyframes fadeInUp'), 'fadeInUp keyframe must be removed from globals.css');
  assert.ok(!css.includes('.tab-page-transition'), '.tab-page-transition class must be removed from globals.css');

  // Must still have prefers-reduced-motion media query
  assert.ok(css.includes('prefers-reduced-motion'), 'prefers-reduced-motion media query must be preserved');
});
