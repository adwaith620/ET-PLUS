import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const TEST_SECRET = 'etlab-test-secret-key-32-bytes-long!';

function sign(data, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  const signature = hmac.digest('base64url');
  return `${Buffer.from(data).toString('base64url')}.${signature}`;
}

function verify(token, secret) {
  try {
    const [encodedData, signature] = token.split('.');
    if (!encodedData || !signature) return null;

    const data = Buffer.from(encodedData, 'base64url').toString('utf-8');
    const expectedHmac = crypto.createHmac('sha256', secret);
    expectedHmac.update(data);
    const expectedSignature = expectedHmac.digest('base64url');

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      const parsed = JSON.parse(data);
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        return null; // Expired
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

test('Session Security - valid signature authenticates correctly', () => {
  const session = {
    mode: 'live',
    username: '23CS1042',
    displayName: 'Adwait S.',
    sessionId: 'mock_tkm_session_12345',
    expiresAt: Date.now() + 100000,
  };

  const token = sign(JSON.stringify(session), TEST_SECRET);
  const parsed = verify(token, TEST_SECRET);

  assert.ok(parsed);
  assert.equal(parsed.username, '23CS1042');
  assert.equal(parsed.mode, 'live');
  // Passwords MUST NOT exist in session
  assert.equal(parsed.password, undefined);
});

test('Session Security - tampered tokens are rejected', () => {
  const session = {
    mode: 'live',
    username: '23CS1042',
    displayName: 'Adwait S.',
    expiresAt: Date.now() + 100000,
  };

  const token = sign(JSON.stringify(session), TEST_SECRET);
  // Attacker tampers username to access another student's account
  const parts = token.split('.');
  const tamperedData = Buffer.from(JSON.stringify({ ...session, username: '23CS9999' })).toString('base64url');
  const tamperedToken = `${tamperedData}.${parts[1]}`;

  const parsed = verify(tamperedToken, TEST_SECRET);
  assert.equal(parsed, null, 'Tampered token must be rejected!');
});

test('Session Security - expired tokens are rejected', () => {
  const session = {
    mode: 'live',
    username: '23CS1042',
    displayName: 'Adwait S.',
    expiresAt: Date.now() - 1000, // expired in past
  };

  const token = sign(JSON.stringify(session), TEST_SECRET);
  const parsed = verify(token, TEST_SECRET);
  assert.equal(parsed, null, 'Expired session must be rejected!');
});

test('Session Security - wrong secret key is rejected', () => {
  const session = {
    mode: 'live',
    username: '23CS1042',
    expiresAt: Date.now() + 100000,
  };

  const token = sign(JSON.stringify(session), TEST_SECRET);
  const parsed = verify(token, 'different-wrong-secret-key');
  assert.equal(parsed, null, 'Token signed with different secret must be rejected!');
});
