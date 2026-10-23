import { NextResponse } from 'next/server';
import { etlabLogin } from '@/lib/etlab-client';
import { createSession } from '@/lib/auth';
import { DEMO_PROFILE, DEMO_PROFILE_B } from '@/lib/demo-data';
import { clearAssignmentCache } from '@/lib/assignment-service';
import { invalidateStudentCache, setCachedStudentData } from '@/lib/data-service';
import { verifySameOrigin, checkRateLimit, PRIVATE_CACHE_HEADERS } from '@/lib/security';

export async function POST(request: Request) {
  try {
    if (!verifySameOrigin(request)) {
      return NextResponse.json({ success: false, error: 'Forbidden: Invalid request origin.' }, { status: 403 });
    }

    const body = await request.json();
    const { mode, username, password, account } = body;

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
        profile: activeProfile,
      });

      return NextResponse.json({
        success: true,
        mode: 'demo',
        profile: activeProfile,
        account: isAccountB ? 'B' : 'A',
        message: `Signed in successfully in Demo Mode as ${activeProfile.name}.`,
      });
    }

    // Live mode authentication
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Please enter your username and password.' },
        { status: 400, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    const result = await etlabLogin(username, password);

    if (!result.success || !result.sessionId) {
      const statusCode =
        result.statusCode ||
        (result.errorCategory === 'TIMEOUT'
          ? 504
          : result.errorCategory === 'INVALID_CREDENTIALS'
          ? 401
          : 503);

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Authentication failed against TKMCE ETLAB. Please check credentials.',
          category: result.errorCategory,
        },
        { status: statusCode, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    invalidateStudentCache(username.trim());

    if (result.profile) {
      setCachedStudentData(username.trim(), 'profile', result.profile);
    }

    // Store secure HttpOnly session with retrieved profile
    await createSession({
      mode: 'live',
      username: username.trim(),
      displayName: result.profile?.name || username.trim(),
      sessionId: result.sessionId,
      profile: result.profile,
    });

    return NextResponse.json(
      {
        success: true,
        mode: 'live',
        profile: result.profile,
        message: 'Authenticated successfully with TKMCE ETLAB.',
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
