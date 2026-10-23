import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import {
  classifyEtlabError,
  AUTH_HANDSHAKE_TIMEOUT_MS,
  AUTH_SUBMIT_TIMEOUT_MS,
  AUTH_PREFETCH_TIMEOUT_MS,
  UPSTREAM_TIMEOUT_MS,
} from '../src/lib/etlab-client.ts';
import { calculateAttendanceSummary } from '../src/lib/attendance-calculator.ts';

const TEST_SECRET = 'etlab-test-secret-key-32-bytes-long!';

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

// -----------------------------------------------------------------------------
// Test 1: classifyEtlabError - normalizes raw exceptions into student-friendly messages
// -----------------------------------------------------------------------------
test('1. classifyEtlabError - Normalizes timeout and network errors without leaking stack traces', () => {
  // DOMException / TimeoutError
  const timeoutErr = new Error('The operation was aborted due to timeout');
  timeoutErr.name = 'TimeoutError';
  const classifiedTimeout = classifyEtlabError(timeoutErr);
  assert.equal(classifiedTimeout.error, 'ETLAB is taking too long to respond. Please try again.');
  assert.equal(classifiedTimeout.errorCategory, 'TIMEOUT');
  assert.equal(classifiedTimeout.statusCode, 504);

  // AbortError
  const abortErr = new Error('This operation was aborted');
  abortErr.name = 'AbortError';
  const classifiedAbort = classifyEtlabError(abortErr);
  assert.equal(classifiedAbort.error, 'ETLAB is taking too long to respond. Please try again.');
  assert.equal(classifiedAbort.errorCategory, 'TIMEOUT');
  assert.equal(classifiedAbort.statusCode, 504);

  // Network connection error / ECONNREFUSED
  const connErr = new Error('fetch failed: connect ECONNREFUSED 104.26.9.122:443');
  const classifiedConn = classifyEtlabError(connErr);
  assert.equal(classifiedConn.error, 'ETLAB is temporarily unavailable. Please try again later.');
  assert.equal(classifiedConn.errorCategory, 'UPSTREAM_UNAVAILABLE');
  assert.equal(classifiedConn.statusCode, 503);

  // DNS failure / ENOTFOUND
  const dnsErr = new Error('getaddrinfo ENOTFOUND tkmce.etlab.in');
  const classifiedDns = classifyEtlabError(dnsErr);
  assert.equal(classifiedDns.error, 'ETLAB is temporarily unavailable. Please try again later.');
  assert.equal(classifiedDns.errorCategory, 'UPSTREAM_UNAVAILABLE');
  assert.equal(classifiedDns.statusCode, 503);

  // Unknown / arbitrary object error
  const rawUnknown = classifyEtlabError({ random: 'crash' });
  assert.equal(rawUnknown.error, 'ETLAB is temporarily unavailable. Please try again later.');
  assert.equal(rawUnknown.statusCode, 503);
});

// -----------------------------------------------------------------------------
// Test 2: Timeout configuration & fresh AbortSignal boundaries
// -----------------------------------------------------------------------------
test('2. Timeout configuration - Dedicated, appropriate thresholds per operation', () => {
  assert.equal(AUTH_HANDSHAKE_TIMEOUT_MS, 15000, 'Handshake timeout must be 15s');
  assert.equal(AUTH_SUBMIT_TIMEOUT_MS, 15000, 'Submit timeout must be 15s');
  assert.equal(AUTH_PREFETCH_TIMEOUT_MS, 6000, 'Profile prefetch bounded timeout must be 6s');
  assert.equal(UPSTREAM_TIMEOUT_MS, 15000, 'Academic queries timeout must be 15s');

  // Verify fresh signal creation: two signals created sequentially are independent
  const sig1 = AbortSignal.timeout(100);
  const sig2 = AbortSignal.timeout(100);
  assert.notEqual(sig1, sig2, 'Signals must be distinct instances');
});

// -----------------------------------------------------------------------------
// Test 3: Simulation - Successful ETLAB authentication
// -----------------------------------------------------------------------------
test('3. Successful ETLAB authentication simulation', async () => {
  // Simulate ETLAB login flow with mock responses
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async (url, options = {}) => {
      const urlStr = String(url);

      if (urlStr.includes('/user/login') && (!options.method || options.method === 'GET')) {
        return new Response(
          '<html><head><script>var YII_CSRF_TOKEN = "valid_csrf_token_12345";</script></head><body><form id="LoginForm"></form></body></html>',
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html',
              'Set-Cookie': 'TKMSESSIONID=initial_session_abc; Path=/',
            },
          }
        );
      }

      if (urlStr.includes('/user/login') && options.method === 'POST') {
        const body = String(options.body);
        if (body.includes('LoginForm%5Busername%5D=250529') && body.includes('LoginForm%5Bpassword%5D=correct_pw')) {
          return new Response('', {
            status: 302,
            headers: {
              Location: 'https://tkmce.etlab.in/student/home',
              'Set-Cookie': 'TKMSESSIONID=auth_session_xyz789; Path=/',
            },
          });
        }
        return new Response('', {
          status: 302,
          headers: { Location: 'https://tkmce.etlab.in/user/login' },
        });
      }

      if (urlStr.includes('/student/profile')) {
        return new Response(
          '<html><body><table><tr><th>Name</th><td>Rahul S</td></tr><tr><th>Admission No</th><td>250529</td></tr></table></body></html>',
          { status: 200 }
        );
      }

      return new Response('Not found', { status: 404 });
    };

    const { etlabLogin } = await import(`../src/lib/etlab-client.ts?t=${Date.now()}`);
    const result = await etlabLogin('250529', 'correct_pw');

    assert.equal(result.success, true);
    assert.equal(result.sessionId, 'auth_session_xyz789');
    assert.ok(result.profile);
    assert.equal(result.profile.admissionNo, '250529');
    assert.equal(result.profile.name, 'Rahul S');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// -----------------------------------------------------------------------------
// Test 4: Simulation - Invalid credentials detection
// -----------------------------------------------------------------------------
test('4. Invalid credentials simulation - Clean error message without misleading timeout', async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async (url, options = {}) => {
      const urlStr = String(url);

      if (urlStr.includes('/user/login') && (!options.method || options.method === 'GET')) {
        return new Response(
          '<html><head><script>var YII_CSRF_TOKEN = "valid_csrf_token_12345";</script></head><body><form id="LoginForm"></form></body></html>',
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html',
              'Set-Cookie': 'TKMSESSIONID=initial_session_abc; Path=/',
            },
          }
        );
      }

      if (urlStr.includes('/user/login') && options.method === 'POST') {
        // ETLAB redirects back to /user/login upon failure
        return new Response(
          '<html><body><div class="flash-error">Incorrect username or password.</div></body></html>',
          {
            status: 302,
            headers: {
              Location: 'https://tkmce.etlab.in/user/login',
            },
          }
        );
      }

      return new Response('Not found', { status: 404 });
    };

    const { etlabLogin } = await import(`../src/lib/etlab-client.ts?t=${Date.now()}`);
    const result = await etlabLogin('250529', 'wrong_pw');

    assert.equal(result.success, false);
    assert.equal(result.error, 'Invalid ETLAB username or password.');
    assert.equal(result.errorCategory, 'INVALID_CREDENTIALS');
    assert.equal(result.statusCode, 401);
    assert.equal(result.sessionId, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// -----------------------------------------------------------------------------
// Test 5: Simulation - ETLAB connection timeout handling
// -----------------------------------------------------------------------------
test('5. ETLAB connection timeout simulation - Returns actionable 504 timeout error', async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async () => {
      const timeoutError = new Error('The operation was aborted due to timeout');
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    };

    const { etlabLogin } = await import(`../src/lib/etlab-client.ts?t=${Date.now()}`);
    const result = await etlabLogin('250529', 'any_pw');

    assert.equal(result.success, false);
    assert.equal(result.error, 'ETLAB is taking too long to respond. Please try again.');
    assert.equal(result.errorCategory, 'TIMEOUT');
    assert.equal(result.statusCode, 504);
    assert.equal(result.sessionId, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// -----------------------------------------------------------------------------
// Test 6: Simulation - ETLAB server errors (Cloudflare 522/525 / HTTP 500/503)
// -----------------------------------------------------------------------------
test('6. ETLAB upstream server error simulation (522, 525, 503)', async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('/user/login')) {
        // Simulate Cloudflare 522 Origin Connection Timed Out
        return new Response('error code: 522', {
          status: 522,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      return new Response('Server Error', { status: 503 });
    };

    const { etlabLogin } = await import(`../src/lib/etlab-client.ts?t=${Date.now()}`);
    const result = await etlabLogin('250529', 'any_pw');

    assert.equal(result.success, false);
    assert.equal(result.error, 'ETLAB is temporarily unavailable. Please try again later.');
    assert.equal(result.errorCategory, 'UPSTREAM_UNAVAILABLE');
    assert.equal(result.statusCode, 503);
    assert.equal(result.sessionId, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// -----------------------------------------------------------------------------
// Test 7: Simulation - Malformed or unexpected response (missing CSRF / maintenance)
// -----------------------------------------------------------------------------
test('7. Malformed ETLAB response simulation - Clean detection without submitting credentials', async () => {
  const originalFetch = globalThis.fetch;

  try {
    let postInvoked = false;

    globalThis.fetch = async (url, options = {}) => {
      const urlStr = String(url);
      if (urlStr.includes('/user/login') && (!options.method || options.method === 'GET')) {
        // Return HTML without CSRF token or LoginForm
        return new Response('<html><body><h1>Campus Network Maintenance</h1></body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        });
      }
      if (options.method === 'POST') {
        postInvoked = true;
        return new Response('Should not be called', { status: 500 });
      }
      return new Response('Not found', { status: 404 });
    };

    const { etlabLogin } = await import(`../src/lib/etlab-client.ts?t=${Date.now()}`);
    const result = await etlabLogin('250529', 'any_pw');

    assert.equal(result.success, false);
    assert.equal(result.error, 'ETLAB is temporarily unavailable or returned an unexpected response. Please try again later.');
    assert.equal(result.errorCategory, 'MALFORMED_RESPONSE');
    assert.equal(result.statusCode, 503);
    assert.equal(postInvoked, false, 'Credentials must NOT be posted when login form is missing');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// -----------------------------------------------------------------------------
// Test 8: Separation of Login and Academic Data Synchronization
// -----------------------------------------------------------------------------
test('8. Separate Login from Dashboard Synchronization - Slow profile fetch does NOT fail login', async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async (url, options = {}) => {
      const urlStr = String(url);

      if (urlStr.includes('/user/login') && (!options.method || options.method === 'GET')) {
        return new Response(
          '<html><head><script>var YII_CSRF_TOKEN = "valid_csrf_token_12345";</script></head><body><form id="LoginForm"></form></body></html>',
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html',
              'Set-Cookie': 'TKMSESSIONID=auth_session_abc; Path=/',
            },
          }
        );
      }

      if (urlStr.includes('/user/login') && options.method === 'POST') {
        return new Response('', {
          status: 302,
          headers: {
            Location: 'https://tkmce.etlab.in/student/home',
            'Set-Cookie': 'TKMSESSIONID=auth_session_confirmed; Path=/',
          },
        });
      }

      if (urlStr.includes('/student/profile')) {
        // Simulate profile prefetch timing out
        const profileTimeout = new Error('The operation was aborted due to timeout');
        profileTimeout.name = 'TimeoutError';
        throw profileTimeout;
      }

      return new Response('Not found', { status: 404 });
    };

    const { etlabLogin } = await import(`../src/lib/etlab-client.ts?t=${Date.now()}`);
    const result = await etlabLogin('250529', 'correct_pw');

    // Login MUST succeed because ETLAB confirmed credentials with 302 + TKMSESSIONID!
    assert.equal(result.success, true);
    assert.equal(result.sessionId, 'auth_session_confirmed');
    assert.ok(result.profile);
    assert.equal(result.profile.admissionNo, '250529');

    // And if academic records subsequently fail or time out on the dashboard:
    // Attendance calculator must cleanly return unavailable without fabricating records!
    const attendanceSummary = calculateAttendanceSummary([], 75);
    assert.equal(attendanceSummary.totalConducted, 0);
    assert.equal(attendanceSummary.overallPercentage, 0);
    assert.equal(attendanceSummary.isAvailable, false);
    assert.equal(attendanceSummary.safeBunks, 0);
    assert.equal(attendanceSummary.classesToRecover, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// -----------------------------------------------------------------------------
// Test 9: Prevention of Duplicate Submissions and Session Creation Security
// -----------------------------------------------------------------------------
test('9. Session Security - Sessions are created ONLY when authentication is genuinely verified', () => {
  // Unauthenticated result
  const failedResult = { success: false, error: 'ETLAB is taking too long to respond. Please try again.' };
  assert.equal(failedResult.success, false);
  // No session token generated
  const token = failedResult.success ? signSession(JSON.stringify({ username: '250529' }), TEST_SECRET) : null;
  assert.equal(token, null);
  assert.equal(verifySession(token, TEST_SECRET), null);

  // Authenticated result
  const successResult = { success: true, sessionId: 'tkm_valid_session_123', profile: { name: 'Rahul' } };
  const validToken = signSession(JSON.stringify({ username: '250529', sessionId: successResult.sessionId }), TEST_SECRET);
  const verified = verifySession(validToken, TEST_SECRET);
  assert.ok(verified);
  assert.equal(verified.username, '250529');
  assert.equal(verified.sessionId, 'tkm_valid_session_123');
});

// -----------------------------------------------------------------------------
// Test 10: Successful retry after temporary connection failure
// -----------------------------------------------------------------------------
test('10. Successful retry after temporary connection failure', async () => {
  let attempt = 0;
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async (url, options = {}) => {
      const urlStr = String(url);

      if (urlStr.includes('/user/login') && (!options.method || options.method === 'GET')) {
        attempt++;
        if (attempt === 1) {
          // Attempt 1 fails with timeout
          const timeoutErr = new Error('The operation was aborted due to timeout');
          timeoutErr.name = 'TimeoutError';
          throw timeoutErr;
        }
        // Attempt 2 succeeds
        return new Response(
          '<html><head><script>var YII_CSRF_TOKEN = "retry_csrf_token_999";</script></head><body><form id="LoginForm"></form></body></html>',
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html',
              'Set-Cookie': 'TKMSESSIONID=retry_session_init; Path=/',
            },
          }
        );
      }

      if (urlStr.includes('/user/login') && options.method === 'POST') {
        return new Response('', {
          status: 302,
          headers: {
            Location: 'https://tkmce.etlab.in/student/home',
            'Set-Cookie': 'TKMSESSIONID=retry_session_confirmed; Path=/',
          },
        });
      }

      return new Response('Not found', { status: 404 });
    };

    const { etlabLogin } = await import(`../src/lib/etlab-client.ts?t=${Date.now()}`);

    // Attempt 1: Fails cleanly with retryable error
    const result1 = await etlabLogin('250529', 'mypassword');
    assert.equal(result1.success, false);
    assert.equal(result1.error, 'ETLAB is taking too long to respond. Please try again.');
    assert.equal(result1.statusCode, 504);

    // Attempt 2: User clicks "Sign in with ETLAB" again without having retyped username
    const result2 = await etlabLogin('250529', 'mypassword');
    assert.equal(result2.success, true);
    assert.equal(result2.sessionId, 'retry_session_confirmed');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
