import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  calculatePercentage,
  calculateSafeBunks,
  calculateClassesToRecover,
  calculateAttendanceSummary,
  getAttendanceStatus,
} from '../src/lib/attendance-calculator.ts';

const TEST_SECRET = 'etlab-test-secret-key-32-bytes-long!';
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

function signSession(data, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  const signature = hmac.digest('base64url');
  return `${Buffer.from(data).toString('base64url')}.${signature}`;
}

function verifySession(token, secret) {
  try {
    if (!token || typeof token !== 'string') return null;
    const [encodedData, signature] = token.split('.');
    if (!encodedData || !signature) return null;

    const data = Buffer.from(encodedData, 'base64url').toString('utf-8');
    const expectedHmac = crypto.createHmac('sha256', secret);
    expectedHmac.update(data);
    const expectedSignature = expectedHmac.digest('base64url');

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      const parsed = JSON.parse(data);
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        return null;
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function validateTargetInput(input) {
  if (input === null || input === undefined || input === '') {
    return { valid: false, error: 'Target percentage cannot be empty' };
  }
  const parsed = typeof input === 'number' ? input : parseFloat(input);
  if (isNaN(parsed)) {
    return { valid: false, error: 'Target percentage must be a valid number' };
  }
  if (parsed <= 0 || parsed > 100) {
    return { valid: false, error: 'Target percentage must be greater than 0 and up to 100' };
  }
  const rounded = Math.round(parsed * 10) / 10;
  return { valid: true, target: rounded };
}

function resolveEffectiveTarget(cookieVal) {
  if (!cookieVal) return 75;
  const parsed = parseFloat(cookieVal);
  if (isNaN(parsed) || parsed <= 0 || parsed > 100) return 75;
  return Math.round(parsed * 10) / 10;
}

// ---------------------------------------------------------
// 1. Fresh Session Authentication Tests
// ---------------------------------------------------------
test('Fresh Session Auth - unauthenticated request has no access', () => {
  assert.equal(verifySession(null, TEST_SECRET), null);
  assert.equal(verifySession('', TEST_SECRET), null);
  assert.equal(verifySession(undefined, TEST_SECRET), null);
  assert.equal(verifySession('invalid-garbage-cookie', TEST_SECRET), null);
});

test('Fresh Session Auth - session with 2-hour duration expires properly', () => {
  const now = Date.now();
  const validSession = {
    mode: 'live',
    username: '23CS1042',
    expiresAt: now + SESSION_DURATION_MS,
  };
  const token = signSession(JSON.stringify(validSession), TEST_SECRET);
  const verified = verifySession(token, TEST_SECRET);
  assert.ok(verified);
  assert.equal(verified.username, '23CS1042');

  // Expired session past 2 hours
  const expiredSession = {
    mode: 'live',
    username: '23CS1042',
    expiresAt: now - 1000,
  };
  const expiredToken = signSession(JSON.stringify(expiredSession), TEST_SECRET);
  assert.equal(verifySession(expiredToken, TEST_SECRET), null, 'Expired session must return null');
});

// ---------------------------------------------------------
// 2. Zero and Missing Attendance Handling
// ---------------------------------------------------------
test('Zero Attendance - never report fabricated 100% attendance or safe bunks', () => {
  // 0 / 0 hours conducted must be 0%, never 100%
  const pct = calculatePercentage(0, 0);
  assert.equal(pct, 0, '0/0 hours conducted must return 0%');

  const summary = calculateAttendanceSummary([], 75);
  assert.equal(summary.overallPercentage, 0);
  assert.equal(summary.totalAttended, 0);
  assert.equal(summary.totalConducted, 0);
  assert.equal(summary.safeBunks, 0);
  assert.equal(summary.classesToRecover, 0);
  assert.equal(summary.isAvailable, false, 'Summary with no conducted hours must be marked unavailable');
});

test('Zero Attendance - course with 0 total hours is marked unavailable', () => {
  const subjects = [
    { code: 'CST201', name: 'Data Structures', attendedHours: 0, totalHours: 0, percentage: 0 },
  ];
  const summary = calculateAttendanceSummary(subjects, 75);
  assert.equal(summary.overallPercentage, 0);
  assert.equal(summary.isAvailable, false);
  assert.equal(summary.safeBunks, 0);
  assert.equal(summary.classesToRecover, 0);
});

// ---------------------------------------------------------
// 3. Custom Target Validation (Presets + Decimal Custom Targets)
// ---------------------------------------------------------
test('Custom Target Input - accepts preset targets [75, 80, 85, 90, 95]', () => {
  for (const preset of [75, 80, 85, 90, 95]) {
    const res = validateTargetInput(preset);
    assert.equal(res.valid, true);
    assert.equal(res.target, preset);
  }
});

test('Custom Target Input - accepts decimal percentages (e.g. 87.5%)', () => {
  const res1 = validateTargetInput('87.5');
  assert.equal(res1.valid, true);
  assert.equal(res1.target, 87.5);

  const res2 = validateTargetInput(62.3);
  assert.equal(res2.valid, true);
  assert.equal(res2.target, 62.3);

  const res3 = validateTargetInput('99.9');
  assert.equal(res3.valid, true);
  assert.equal(res3.target, 99.9);
});

test('Custom Target Input - rejects invalid inputs (<=0, >100, empty, NaN)', () => {
  assert.equal(validateTargetInput('').valid, false);
  assert.equal(validateTargetInput('   ').valid, false);
  assert.equal(validateTargetInput('abc').valid, false);
  assert.equal(validateTargetInput('0').valid, false);
  assert.equal(validateTargetInput(0).valid, false);
  assert.equal(validateTargetInput(-15).valid, false);
  assert.equal(validateTargetInput('105').valid, false);
  assert.equal(validateTargetInput(100.1).valid, false);
});

test('resolveEffectiveTarget - preserves valid targets and defaults invalid to 75', () => {
  assert.equal(resolveEffectiveTarget('87.5'), 87.5);
  assert.equal(resolveEffectiveTarget('95'), 95);
  assert.equal(resolveEffectiveTarget('80'), 80);
  assert.equal(resolveEffectiveTarget('45'), 45); // Valid custom target > 0
  assert.equal(resolveEffectiveTarget('0'), 75); // Invalid <= 0
  assert.equal(resolveEffectiveTarget('-5'), 75);
  assert.equal(resolveEffectiveTarget('120'), 75); // Invalid > 100
  assert.equal(resolveEffectiveTarget(''), 75);
  assert.equal(resolveEffectiveTarget(null), 75);
});

// ---------------------------------------------------------
// 4. Calculations with Custom Attendance Targets
// ---------------------------------------------------------
test('Calculations with Custom Target - Safe Bunks at 87.5%', () => {
  // Attended = 90, Total = 100. Baseline = 90%. Target = 87.5%.
  // m_max = floor(90 / 0.875 - 100) = floor(102.857 - 100) = 2.
  const bunks = calculateSafeBunks(90, 100, 87.5);
  assert.equal(bunks, 2);

  // Check: missing 2 classes -> 90 / 102 = 88.23% (>= 87.5%)
  const after2Misses = calculatePercentage(90, 102);
  assert.ok(after2Misses >= 87.5);

  // Check: missing 3 classes -> 90 / 103 = 87.37% (< 87.5%)
  const after3Misses = calculatePercentage(90, 103);
  assert.ok(after3Misses < 87.5);
});

test('Calculations with Custom Target - Recovery at 87.5%', () => {
  // Attended = 80, Total = 100. Baseline = 80%. Target = 87.5%.
  // n = ceil((0.875 * 100 - 80) / (1 - 0.875)) = ceil(7.5 / 0.125) = 60.
  const recover = calculateClassesToRecover(80, 100, 87.5);
  assert.equal(recover, 60);

  // Check: attending 60 classes -> (80 + 60) / (100 + 60) = 140 / 160 = 87.5%
  const after60Attended = calculatePercentage(140, 160);
  assert.equal(after60Attended, 87.5);

  // Check: attending 59 classes -> (80 + 59) / (100 + 59) = 139 / 159 = 87.42% (< 87.5%)
  const after59Attended = calculatePercentage(139, 159);
  assert.ok(after59Attended < 87.5);
});

test('Calculations with Custom Target - Status and Composite Summary', () => {
  // 88% is safe against 87.5%
  assert.equal(getAttendanceStatus(88, 87.5), 'safe');
  // 85% is warning against 87.5% (within 5% cushion)
  assert.equal(getAttendanceStatus(85, 87.5), 'warning');
  // 80% is critical against 87.5% (below warning threshold)
  assert.equal(getAttendanceStatus(80, 87.5), 'critical');

  const subjects = [
    { code: 'CST201', name: 'DSA', attendedHours: 90, totalHours: 100, percentage: 90 },
    { code: 'CST203', name: 'Logic Design', attendedHours: 80, totalHours: 100, percentage: 80 },
  ];
  // Overall: 170 / 200 = 85%. Target = 87.5%.
  const summary = calculateAttendanceSummary(subjects, 87.5);
  assert.equal(summary.overallPercentage, 85);
  assert.equal(summary.status, 'warning'); // 85% is within (87.5 - 5)% = 82.5%
  assert.equal(summary.isAvailable, true);
  assert.equal(summary.safeBunks, 0);
  // Recovery: ceil((0.875 * 200 - 170) / (1 - 0.875)) = ceil((175 - 170) / 0.125) = ceil(5 / 0.125) = 40
  assert.equal(summary.classesToRecover, 40);
});
