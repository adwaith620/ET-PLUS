import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSafeUrl,
  validateFileBuffer,
  sanitizeFilename,
  verifySameOrigin,
  checkRateLimit,
  PRIVATE_CACHE_HEADERS,
  getSessionSecret,
} from '../src/lib/security.ts';
import { deleteSharedMaterial, saveSharedMaterial, ensureDirectories } from '../src/lib/materials-service.ts';
import { deleteCohortAnnouncement, saveCohortAnnouncement } from '../src/lib/announcements-service.ts';
import nextConfig from '../next.config.ts';

// -------------------------------------------------------------
// 1. URL Validation & Open Redirect / Stored XSS Prevention
// -------------------------------------------------------------
test('Security - isSafeUrl blocks dangerous protocols and open redirects', () => {
  // Reject javascript: URLs
  assert.equal(isSafeUrl('javascript:alert(1)'), false);
  assert.equal(isSafeUrl('javascript:void(0)'), false);
  assert.equal(isSafeUrl('JAVASCRIPT:alert(document.cookie)'), false);
  assert.equal(isSafeUrl(' javascript:alert(1) '), false);

  // Reject data: URLs
  assert.equal(isSafeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), false);
  assert.equal(isSafeUrl('data:image/svg+xml,<svg onload=alert(1)>'), false);

  // Reject vbscript: URLs
  assert.equal(isSafeUrl('vbscript:msgbox(1)'), false);

  // Reject protocol-relative URLs (open redirect vector)
  assert.equal(isSafeUrl('//evil.attacker.com/steal-session'), false);
  assert.equal(isSafeUrl('//google.com'), false);

  // Reject malformed/empty/null
  assert.equal(isSafeUrl(''), false);
  assert.equal(isSafeUrl(null), false);
  assert.equal(isSafeUrl(undefined), false);
  assert.equal(isSafeUrl('   '), false);
  assert.equal(isSafeUrl('not a url at all'), false);

  // Accept valid URLs
  assert.equal(isSafeUrl('https://tkmce.etlab.in/student/announcements'), true);
  assert.equal(isSafeUrl('https://ktu.edu.in/syllabus.pdf'), true);
  assert.equal(isSafeUrl('http://localhost:3000/dashboard'), true);

  // Accept safe internal paths
  assert.equal(isSafeUrl('/dashboard/materials'), true);
  assert.equal(isSafeUrl('/api/auth/session'), true);
});

// -------------------------------------------------------------
// 2. File Upload Magic Byte Signature & Extension Verification
// -------------------------------------------------------------
test('Security - validateFileBuffer checks true magic bytes and blocks active files', () => {
  // 1. Valid PDF with %PDF- header
  const validPdf = Buffer.from('%PDF-1.7\n%some content');
  assert.deepEqual(validateFileBuffer(validPdf, '.pdf'), { valid: true });

  // 2. Spoofed PDF containing HTML/JavaScript
  const spoofedPdf = Buffer.from('<script>alert("xss")</script>');
  const spoofResult = validateFileBuffer(spoofedPdf, '.pdf');
  assert.equal(spoofResult.valid, false);
  assert.match(spoofResult.error || '', /valid PDF signature/i);

  // 3. Valid OpenXML Document (DOCX / PPTX) with PK\x03\x04
  const validDocx = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
  assert.deepEqual(validateFileBuffer(validDocx, '.docx'), { valid: true });
  assert.deepEqual(validateFileBuffer(validDocx, '.pptx'), { valid: true });

  // 4. Spoofed DOCX with executable content
  const spoofedDocx = Buffer.from('MZ\x90\x00\x03\x00\x00\x00'); // Windows PE header
  const docxResult = validateFileBuffer(spoofedDocx, '.docx');
  assert.equal(docxResult.valid, false);

  // 5. Valid legacy Office binary with \xD0\xCF\x11\xE0
  const validLegacyDoc = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  assert.deepEqual(validateFileBuffer(validLegacyDoc, '.doc'), { valid: true });
  assert.deepEqual(validateFileBuffer(validLegacyDoc, '.ppt'), { valid: true });

  // 6. Zero-length buffer
  const emptyBuf = Buffer.alloc(0);
  assert.equal(validateFileBuffer(emptyBuf, '.pdf').valid, false);

  // 7. Dangerous and unauthorized extensions
  assert.equal(validateFileBuffer(validPdf, '.exe').valid, false);
  assert.equal(validateFileBuffer(validPdf, '.sh').valid, false);
  assert.equal(validateFileBuffer(validPdf, '.js').valid, false);
  assert.equal(validateFileBuffer(validPdf, '.html').valid, false);
});

// -------------------------------------------------------------
// 3. Path Traversal & Filename Sanitization
// -------------------------------------------------------------
test('Security - sanitizeFilename strips directory traversal sequences', () => {
  // POSIX directory traversal
  assert.equal(sanitizeFilename('../../etc/passwd'), 'passwd');
  assert.equal(sanitizeFilename('../../../var/log/secret.txt'), 'secret.txt');

  // Windows directory traversal
  assert.equal(sanitizeFilename('..\\..\\windows\\system32\\config'), 'config');

  // Dangerous shell and injection characters
  assert.equal(sanitizeFilename('notes;rm -rf;payload.pdf'), 'notes_rm_-rf_payload.pdf');
  assert.equal(sanitizeFilename('notes;rm -rf /;payload.pdf'), '_payload.pdf');
  assert.equal(sanitizeFilename('file`id`.pdf'), 'file_id_.pdf');
  assert.equal(sanitizeFilename('test $(calc).pdf'), 'test___calc_.pdf');

  // Standard safe filenames remain clean
  assert.equal(sanitizeFilename('Linear_Algebra_Notes-v2.pdf'), 'Linear_Algebra_Notes-v2.pdf');
  assert.equal(sanitizeFilename('module-3-handout.docx'), 'module-3-handout.docx');
});

// -------------------------------------------------------------
// 4. CSRF & Same-Origin Verification
// -------------------------------------------------------------
test('Security - verifySameOrigin enforces strict origin host checking', () => {
  // Legitimate same-origin request with Origin header
  const validReqWithOrigin = new Request('https://et-plus.vercel.app/api/materials/upload', {
    method: 'POST',
    headers: {
      host: 'et-plus.vercel.app',
      origin: 'https://et-plus.vercel.app',
    },
  });
  assert.equal(verifySameOrigin(validReqWithOrigin), true);

  // Legitimate same-origin request with Referer header
  const validReqWithReferer = new Request('https://et-plus.vercel.app/api/materials/upload', {
    method: 'POST',
    headers: {
      host: 'et-plus.vercel.app',
      referer: 'https://et-plus.vercel.app/dashboard/materials',
    },
  });
  assert.equal(verifySameOrigin(validReqWithReferer), true);

  // Cross-site attacker attempting CSRF from external site
  const csrfAttackOrigin = new Request('https://et-plus.vercel.app/api/materials/upload', {
    method: 'POST',
    headers: {
      host: 'et-plus.vercel.app',
      origin: 'https://malicious-site.attacker.com',
    },
  });
  assert.equal(verifySameOrigin(csrfAttackOrigin), false);

  // Cross-site attacker with Referer
  const csrfAttackReferer = new Request('https://et-plus.vercel.app/api/materials/upload', {
    method: 'POST',
    headers: {
      host: 'et-plus.vercel.app',
      referer: 'https://evil-phishing.org/steal',
    },
  });
  assert.equal(verifySameOrigin(csrfAttackReferer), false);

  // Direct same-origin navigation (neither header present)
  const directNav = new Request('https://et-plus.vercel.app/api/auth/session', {
    method: 'GET',
    headers: {},
  });
  assert.equal(verifySameOrigin(directNav), true);
});

// -------------------------------------------------------------
// 5. Sliding Window Rate Limiter
// -------------------------------------------------------------
test('Security - checkRateLimit throttles burst attacks correctly', () => {
  const testKey = `test-ip-${Date.now()}`;
  const max = 3;

  const res1 = checkRateLimit(testKey, max, 10000);
  assert.equal(res1.allowed, true);
  assert.equal(res1.remaining, 2);

  const res2 = checkRateLimit(testKey, max, 10000);
  assert.equal(res2.allowed, true);
  assert.equal(res2.remaining, 1);

  const res3 = checkRateLimit(testKey, max, 10000);
  assert.equal(res3.allowed, true);
  assert.equal(res3.remaining, 0);

  // 4th request must be blocked
  const res4 = checkRateLimit(testKey, max, 10000);
  assert.equal(res4.allowed, false);
  assert.equal(res4.remaining, 0);
});

// -------------------------------------------------------------
// 6. Broken Access Control & IDOR Prevention
// -------------------------------------------------------------
test('Security - deleteSharedMaterial prevents IDOR and rejects path traversal IDs', async () => {
  ensureDirectories();

  // Test 1: Reject path traversal / invalid ID format
  const traversalResult = await deleteSharedMaterial('../../etc/passwd', 'student_1');
  assert.equal(traversalResult.success, false);
  assert.match(traversalResult.error || '', /invalid resource identifier/i);

  const invalidCharsResult = await deleteSharedMaterial('id with spaces', 'student_1');
  assert.equal(invalidCharsResult.success, false);

  // Test 2: Create a test material owned by student_A
  const testMaterialId = `sec-test-${Date.now()}`;
  await saveSharedMaterial({
    id: testMaterialId,
    title: 'Security Test Lecture Notes',
    subjectCode: '24EST382',
    subjectName: 'Discrete Mathematics',
    fileSize: '1.2 MB',
    fileType: 'pdf',
    uploadedAt: new Date().toISOString(),
    uploaderName: 'Student Alice',
    uploaderUsername: 'student_alice',
    isShared: true,
  });

  // Test 3: Unauthorized student_bob tries to delete Alice's material -> Must FAIL
  const unauthorizedBob = await deleteSharedMaterial(testMaterialId, 'student_bob');
  assert.equal(unauthorizedBob.success, false);
  assert.match(unauthorizedBob.error || '', /unauthorized/i);

  // Test 4: Backdoor bypass usernames (e.g. 'demo', 'TKM25CA013') cannot delete Alice's material
  const demoBypass = await deleteSharedMaterial(testMaterialId, 'demo');
  assert.equal(demoBypass.success, false);

  const adminBypass = await deleteSharedMaterial(testMaterialId, 'TKM25CA013');
  assert.equal(adminBypass.success, false);

  // Test 5: Legitimate owner (student_alice) can delete their own material
  const legitimateDelete = await deleteSharedMaterial(testMaterialId, 'student_alice');
  assert.equal(legitimateDelete.success, true);
});

test('Security - deleteCohortAnnouncement prevents IDOR and unauthorized removal', async () => {
  // Test 1: Reject invalid identifier format
  const invalidId = await deleteCohortAnnouncement('../bad/id', 'student_alice');
  assert.equal(invalidId.success, false);

  // Test 2: Create announcement owned by Alice
  const testAnnId = `ann-sec-${Date.now()}`;
  await saveCohortAnnouncement({
    id: testAnnId,
    title: 'Cohort Hackathon Announcement',
    content: 'Registration is open until Friday.',
    date: '18 Oct 2026',
    author: 'Alice',
    authorUsername: 'student_alice',
    isCohortShared: true,
    cohort: 'R3AI',
  });

  // Test 3: Bob tries to delete Alice's announcement -> Must FAIL
  const bobAttempt = await deleteCohortAnnouncement(testAnnId, 'student_bob');
  assert.equal(bobAttempt.success, false);
  assert.match(bobAttempt.error || '', /unauthorized/i);

  // Test 4: Alice deletes her own announcement -> Success
  const aliceDelete = await deleteCohortAnnouncement(testAnnId, 'student_alice');
  assert.equal(aliceDelete.success, true);
});

// -------------------------------------------------------------
// 7. Production Secret Hardening
// -------------------------------------------------------------
test('Security - getSessionSecret enforces minimum length and production checks', () => {
  const origEnv = process.env.NODE_ENV;
  const origSecret = process.env.SESSION_SECRET;

  try {
    // 1. In production, missing secret throws critical error
    process.env.NODE_ENV = 'production';
    delete process.env.SESSION_SECRET;
    assert.throws(
      () => getSessionSecret(),
      /CRITICAL SECURITY ERROR: SESSION_SECRET environment variable is missing/
    );

    // 2. In production, weak secret (< 32 chars) throws critical error
    process.env.SESSION_SECRET = 'short-secret';
    assert.throws(
      () => getSessionSecret(),
      /CRITICAL SECURITY ERROR: SESSION_SECRET in production must be at least 32 characters/
    );

    // 3. In production, valid 32+ char secret succeeds
    process.env.SESSION_SECRET = 'a'.repeat(32);
    assert.equal(getSessionSecret(), 'a'.repeat(32));

    // 4. In development, fallback secret is provided if unset
    process.env.NODE_ENV = 'development';
    delete process.env.SESSION_SECRET;
    assert.ok(getSessionSecret().length >= 32);
  } finally {
    process.env.NODE_ENV = origEnv;
    if (origSecret !== undefined) {
      process.env.SESSION_SECRET = origSecret;
    } else {
      delete process.env.SESSION_SECRET;
    }
  }
});

// -------------------------------------------------------------
// 8. HTTP Security Headers Verification
// -------------------------------------------------------------
test('Security - next.config.ts configures comprehensive HTTP security headers', async () => {
  assert.ok(nextConfig.headers, 'nextConfig must define headers()');
  const headersList = await nextConfig.headers();
  assert.ok(Array.isArray(headersList));

  const rootRule = headersList.find((h) => h.source === '/:path*');
  assert.ok(rootRule, 'Must configure security headers for /:path*');

  const headersMap = new Map();
  for (const h of rootRule.headers) {
    headersMap.set(h.key.toLowerCase(), h.value);
  }

  // 1. X-Content-Type-Options: nosniff
  assert.equal(headersMap.get('x-content-type-options'), 'nosniff');

  // 2. X-Frame-Options: DENY
  assert.equal(headersMap.get('x-frame-options'), 'DENY');

  // 3. Referrer-Policy: strict-origin-when-cross-origin
  assert.equal(headersMap.get('referrer-policy'), 'strict-origin-when-cross-origin');

  // 4. Strict-Transport-Security with preload
  assert.match(headersMap.get('strict-transport-security') || '', /max-age=\d+/);
  assert.match(headersMap.get('strict-transport-security') || '', /includeSubDomains/);

  // 5. Content-Security-Policy
  const csp = headersMap.get('content-security-policy');
  assert.ok(csp, 'CSP header must be present');
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /base-uri 'self'/);
  assert.match(csp, /form-action 'self'/);

  // 6. Permissions-Policy
  assert.ok(headersMap.get('permissions-policy'), 'Permissions-Policy must be set');

  // 7. Standard Private Cache Headers for authenticated responses
  assert.equal(PRIVATE_CACHE_HEADERS['Cache-Control'], 'private, no-cache, no-store, must-revalidate');
});
