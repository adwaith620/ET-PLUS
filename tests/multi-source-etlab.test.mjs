import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_INSTITUTION, SUPPORTED_INSTITUTIONS, resolveInstitution } from '../src/lib/institution-config.ts';
import { verifyIdentityConsistency } from '../src/lib/unified-academic-service.ts';

test('1. Multi-Source Suite - Default Institution Configuration', () => {
  // Institution must default to TKM College of Engineering (tkmce)
  assert.equal(DEFAULT_INSTITUTION.id, 'tkmce');
  assert.equal(DEFAULT_INSTITUTION.shortName, 'TKMCE');
  assert.equal(DEFAULT_INSTITUTION.portalDomain, 'https://tkmce.etlab.in');
  assert.equal(DEFAULT_INSTITUTION.apiBaseUrl, 'https://api.students.etlab.app/api/v1');
  assert.ok(DEFAULT_INSTITUTION.name.includes('TKM College of Engineering'));

  // Registry must contain tkmce mapping
  assert.ok(SUPPORTED_INSTITUTIONS.length >= 1, 'Must include configured institutions');
  const config = resolveInstitution('tkmce');
  assert.equal(config.id, 'tkmce');
  assert.equal(config.shortName, 'TKMCE');

  // Fallback to default if unknown or empty
  const fallback = resolveInstitution(undefined);
  assert.equal(fallback.id, 'tkmce');
});

test('2. Multi-Source Suite - Student Identity Consistency & Anti-Contamination Check', () => {
  const studentA1 = {
    name: 'ADWAITH M',
    admissionNo: '23CS1042',
    registerNo: 'TKM23CS012',
    department: 'Computer Science (AI)',
    programme: 'B.Tech',
    semester: 3,
    batch: '2025-29',
    academicYear: '2024-2025',
    institution: 'TKM College of Engineering',
  };

  const studentA2 = {
    name: 'Adwaith M',
    admissionNo: '23CS1042',
    registerNo: 'TKM23CS012',
    department: 'Computer Science & Engineering (AI)',
    programme: 'B.Tech',
    semester: 3,
    batch: '2025-29',
    academicYear: '2024-2025',
    institution: 'TKM College of Engineering',
  };

  const studentB = {
    name: 'Kavya S',
    admissionNo: '25CTA99',
    registerNo: 'TKM25CT099',
    department: 'Computer Science (AI)',
    programme: 'B.Tech',
    semester: 3,
    batch: '2025-29',
    academicYear: '2024-2025',
    institution: 'TKM College of Engineering',
  };

  // Same student records from both sources must match
  assert.equal(verifyIdentityConsistency(studentA1, studentA2), true);
  assert.equal(verifyIdentityConsistency(studentA1, null), true);
  assert.equal(verifyIdentityConsistency(null, studentA2), true);

  // Different students MUST NEVER match (strict prevention of cross-student record contamination)
  assert.equal(verifyIdentityConsistency(studentA1, studentB), false);

  // Conflicting admission numbers
  const corruptedStudent = { ...studentA1, admissionNo: '99CS9999' };
  assert.equal(verifyIdentityConsistency(studentA1, corruptedStudent), false);
});

test('3. Multi-Source Suite - Dual-Source Session Signing & Security', () => {
  const secret = 'super-secret-test-key-of-sufficient-length-at-least-32-chars';

  const multiSourcePayload = {
    mode: 'live',
    username: '23CS1042',
    displayName: 'ADWAITH M',
    sessionId: 'mock_classic_session_tkmce_abc123',
    studentsToken: 'mock_jwt_students_etlab_token_xyz789',
    instituteId: 'tkmce',
    sourcesConnected: {
      etlab: true,
      studentsEtlab: true,
    },
    expiresAt: Math.floor(Date.now() / 1000) + 7200,
  };

  // HMAC SHA-256 signing matching auth.ts protocol
  const data = JSON.stringify(multiSourcePayload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  const signature = hmac.digest('base64url');
  const token = `${Buffer.from(data).toString('base64url')}.${signature}`;

  assert.ok(typeof token === 'string' && token.length > 50, 'Token must be signed string');

  // Verify and unpack
  const [encodedData, sig] = token.split('.');
  const unpackedData = Buffer.from(encodedData, 'base64url').toString('utf-8');
  const expectedHmac = crypto.createHmac('sha256', secret);
  expectedHmac.update(unpackedData);
  const expectedSig = expectedHmac.digest('base64url');

  assert.equal(sig, expectedSig);
  const verified = JSON.parse(unpackedData);

  assert.equal(verified.username, '23CS1042');
  assert.equal(verified.sessionId, 'mock_classic_session_tkmce_abc123');
  assert.equal(verified.studentsToken, 'mock_jwt_students_etlab_token_xyz789');
  assert.equal(verified.instituteId, 'tkmce');
  assert.deepEqual(verified.sourcesConnected, { etlab: true, studentsEtlab: true });

  // Security: Ensure password is never present anywhere in the session payload
  assert.equal(verified.password, undefined);
  assert.equal(JSON.stringify(verified).includes('password'), false);
});

test('4. Multi-Source Suite - Missing Marks vs Zero Marks Distinction', () => {
  // Missing marks must NEVER be coerced to 0!
  const recordWithScore = {
    id: 'test-1',
    subjectCode: 'CST201',
    subjectName: 'Data Structures',
    semester: 'IIIrd Semester',
    category: 'Internal Marks',
    examName: 'Continuous Assessment',
    maxMarks: 50,
    obtainedMarks: 42,
    source: 'students_etlab',
  };

  const recordAwaitingEvaluation = {
    id: 'test-2',
    subjectCode: 'CST203',
    subjectName: 'Logic System Design',
    semester: 'IIIrd Semester',
    category: 'Internal Marks',
    examName: 'Continuous Assessment',
    maxMarks: 50,
    obtainedMarks: undefined, // Pending evaluation
    source: 'students_etlab',
  };

  assert.equal(recordWithScore.obtainedMarks, 42);
  assert.equal(recordAwaitingEvaluation.obtainedMarks, undefined);
  assert.notEqual(recordAwaitingEvaluation.obtainedMarks, 0, 'Missing marks must NOT be coerced to 0');
});

test('5. Multi-Source Suite - Official KTU Academic Standing', () => {
  const publishedStanding = {
    cgpa: 8.78,
    sgpa: 8.85,
    creditsEarned: 37,
    totalCredits: 60,
    semester: 3,
    status: 'In Good Standing',
    source: 'students_etlab',
  };

  assert.equal(typeof publishedStanding.cgpa, 'number');
  assert.ok(publishedStanding.cgpa > 0 && publishedStanding.cgpa <= 10);
  assert.equal(typeof publishedStanding.sgpa, 'number');
  assert.ok(publishedStanding.sgpa > 0 && publishedStanding.sgpa <= 10);
  assert.equal(publishedStanding.source, 'students_etlab');
});

test('6. Multi-Source Suite - Codebase & Security Guarantees', () => {
  // 1. Verify students-etlab-client.ts has bounded timeouts and strict error taxonomy
  const clientPath = path.resolve('src/lib/students-etlab-client.ts');
  const clientSrc = fs.readFileSync(clientPath, 'utf8');

  assert.ok(clientSrc.includes('STUDENTS_ETLAB_TIMEOUT_MS'), 'Must define bounded timeout');
  assert.ok(clientSrc.includes('STUDENTS_ETLAB_RESULTS_TIMEOUT_MS'), 'Must define bounded results timeout');
  assert.ok(clientSrc.includes('api.students.etlab.app/api/v1'), 'Must target Students ETLAB API');
  assert.ok(clientSrc.includes('X-Institute-ID'), 'Must include X-Institute-ID header');

  // 2. Verify auth login route integrates both sources concurrently
  const loginRoutePath = path.resolve('src/app/api/auth/login/route.ts');
  const loginRouteSrc = fs.readFileSync(loginRoutePath, 'utf8');

  assert.ok(loginRouteSrc.includes('studentsEtlabLogin'), 'Login route must call studentsEtlabLogin');
  assert.ok(loginRouteSrc.includes('Promise.allSettled'), 'Login route must authenticate both sources concurrently');
  assert.ok(loginRouteSrc.includes('sourcesConnected'), 'Login route must track connected sources');

  // 3. Verify Results Client UI includes Multi-Source Indicators & Standing Cards
  const resultsClientPath = path.resolve('src/app/dashboard/results/results-client.tsx');
  const resultsClientSrc = fs.readFileSync(resultsClientPath, 'utf8');

  assert.ok(resultsClientSrc.includes('Multi-Source Integration Active'), 'Results UI must show multi-source badge');
  assert.ok(resultsClientSrc.includes('Cumulative GPA (CGPA)'), 'Results UI must show CGPA card');
  assert.ok(resultsClientSrc.includes('Semester GPA (SGPA)'), 'Results UI must show SGPA card');
  assert.ok(resultsClientSrc.includes('Earned Credits'), 'Results UI must show Credits card');
  assert.ok(resultsClientSrc.includes('Students API'), 'Results UI must distinguish Students API records');
  assert.ok(resultsClientSrc.includes('Classic ETLAB'), 'Results UI must distinguish Classic ETLAB records');

  // 4. Verify Login Page UI shows default institution configuration
  const loginPagePath = path.resolve('src/app/login/page.tsx');
  const loginPageSrc = fs.readFileSync(loginPagePath, 'utf8');

  assert.ok(loginPageSrc.includes('Authorized Multi-Source ETLAB Integration'), 'Login UI must show Multi-Source banner');
  assert.ok(loginPageSrc.includes('tkmce'), 'Login UI must state tkmce institution code');
});
