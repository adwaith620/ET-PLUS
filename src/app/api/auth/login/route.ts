import { NextResponse } from 'next/server';
import { etlabLogin } from '@/lib/etlab-client';
import { studentsEtlabLogin } from '@/lib/students-etlab-client';
import { resolveInstitution, DEFAULT_INSTITUTION } from '@/lib/institution-config';
import { createSession } from '@/lib/auth';
import { DEMO_PROFILE, DEMO_PROFILE_B } from '@/lib/demo-data';
import { clearAssignmentCache } from '@/lib/assignment-service';
import { invalidateStudentCache, setCachedStudentData } from '@/lib/data-service';
import { verifySameOrigin, checkRateLimit, PRIVATE_CACHE_HEADERS } from '@/lib/security';
import { verifyIdentityConsistency } from '@/lib/unified-academic-service';
import type { StudentProfile } from '@/types';

export async function POST(request: Request) {
  try {
    if (!verifySameOrigin(request)) {
      return NextResponse.json({ success: false, error: 'Forbidden: Invalid request origin.' }, { status: 403 });
    }

    const body = await request.json();
    const { mode, username, password, account, instituteId } = body;
    const targetInstitution = resolveInstitution(instituteId || DEFAULT_INSTITUTION.id);

    const rateKey = `login_${(username && typeof username === 'string' ? username.trim() : 'anon')}`;
    const rateCheck = checkRateLimit(rateKey, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please wait a minute and try again.' },
        { status: 429, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    if (mode === 'demo') {
      const isAccountB =
        account === 'B' ||
        (username && (username.trim().toLowerCase() === 'student-b' || username.trim().toLowerCase() === 'demo-b' || username.trim() === '25CTA99'));
      const activeProfile = isAccountB ? DEMO_PROFILE_B : DEMO_PROFILE;

      clearAssignmentCache({ mode: 'demo', username: activeProfile.admissionNo });
      invalidateStudentCache(activeProfile.admissionNo);

      await createSession({
        mode: 'demo',
        username: activeProfile.admissionNo,
        displayName: activeProfile.name,
        instituteId: targetInstitution.id,
        sourcesConnected: { etlab: true, studentsEtlab: true },
        profile: activeProfile,
      });

      return NextResponse.json({
        success: true,
        mode: 'demo',
        profile: activeProfile,
        account: isAccountB ? 'B' : 'A',
        institution: targetInstitution,
        sourcesConnected: { etlab: true, studentsEtlab: true },
        message: `Signed in successfully in Demo Mode as ${activeProfile.name}.`,
      });
    }

    // Live mode authentication
    const cleanUsername = username ? String(username).trim() : '';
    if (!cleanUsername || !password) {
      return NextResponse.json(
        { success: false, error: 'Please enter your username and password.' },
        { status: 400, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    // Authenticate against both sources in parallel
    const [s1Result, s2Result] = await Promise.allSettled([
      etlabLogin(cleanUsername, password),
      studentsEtlabLogin(cleanUsername, password, targetInstitution.id),
    ]);

    const s1 = s1Result.status === 'fulfilled' ? s1Result.value : null;
    const s2 = s2Result.status === 'fulfilled' ? s2Result.value : null;

    const s1Success = Boolean(s1 && s1.success && s1.sessionId);
    const s2Success = Boolean(s2 && s2.success && s2.token);

    // If neither source succeeded, determine the appropriate failure status
    if (!s1Success && !s2Success) {
      const isInvalidCredentials =
        s1?.errorCategory === 'INVALID_CREDENTIALS' ||
        s2?.errorCategory === 'INVALID_CREDENTIALS';

      const isTimeout =
        s1?.errorCategory === 'TIMEOUT' && s2?.errorCategory === 'TIMEOUT';

      const statusCode = isInvalidCredentials ? 401 : isTimeout ? 504 : 503;
      const errorMessage = isInvalidCredentials
        ? 'Invalid ETLAB username or password.'
        : isTimeout
        ? 'ETLAB servers are taking too long to respond. Please try again.'
        : s1?.error || s2?.error || 'Authentication failed. Please try again later.';

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          category: isInvalidCredentials ? 'INVALID_CREDENTIALS' : isTimeout ? 'TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
        },
        { status: statusCode, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    invalidateStudentCache(cleanUsername);

    // Profile resolution & consistency check
    let resolvedProfile: StudentProfile | undefined = s1?.profile;

    if (s2Success && s2?.userData) {
      const u = s2.userData;
      const s2Profile: Partial<StudentProfile> = {
        name: String(u.profile_name || u.uname || u.name || ''),
        admissionNo: String(u.admission_no || u.username || cleanUsername),
        registerNo: String(u.ktuid || u.register_no || ''),
        department: String(u.department || 'Computer Science (AI)'),
        batch: String(u.batch || '2025-29'),
        semester: Number(u.semester || 3),
      };

      if (resolvedProfile && verifyIdentityConsistency(resolvedProfile, s2Profile as StudentProfile)) {
        // Safely merge secondary fields without overriding primary verified credentials
        resolvedProfile = {
          ...resolvedProfile,
          email: resolvedProfile.email || (typeof u.email === 'string' ? u.email : undefined),
          mobile: resolvedProfile.mobile || (typeof u.mobile === 'string' ? u.mobile : undefined),
        };
      } else if (!resolvedProfile) {
        resolvedProfile = {
          name: String(u.profile_name || u.uname || cleanUsername),
          admissionNo: cleanUsername,
          registerNo: String(u.ktuid || u.register_no || cleanUsername),
          department: String(u.department || 'Computer Science (AI)'),
          programme: 'B.Tech',
          semester: Number(u.semester || 3),
          batch: String(u.batch || '2025-29'),
          academicYear: '2025 - 2026',
          institution: targetInstitution.name,
        };
      }
    }

    if (resolvedProfile) {
      setCachedStudentData(cleanUsername, 'profile', resolvedProfile);
    }

    const sourcesConnected = {
      etlab: s1Success,
      studentsEtlab: s2Success,
    };

    // Store secure HttpOnly session with multi-source tokens
    await createSession({
      mode: 'live',
      username: cleanUsername,
      displayName: resolvedProfile?.name || cleanUsername,
      sessionId: s1?.sessionId,
      studentsToken: s2?.token,
      instituteId: targetInstitution.id,
      sourcesConnected,
      profile: resolvedProfile,
    });

    const sourceStatusMessage = s1Success && s2Success
      ? 'Authenticated with both ETLAB Classic and Students ETLAB.'
      : s1Success
      ? 'Authenticated with ETLAB Classic.'
      : 'Authenticated with Students ETLAB.';

    return NextResponse.json(
      {
        success: true,
        mode: 'live',
        profile: resolvedProfile,
        institution: targetInstitution,
        sourcesConnected,
        message: sourceStatusMessage,
      },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === 'TimeoutError' ||
        error.name === 'AbortError' ||
        error.message.toLowerCase().includes('timeout') ||
        error.message.toLowerCase().includes('aborted'));

    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? 'ETLAB is taking too long to respond. Please try again.'
          : 'Unable to connect to authentication server. Please try again.',
      },
      { status: isTimeout ? 504 : 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }
}
