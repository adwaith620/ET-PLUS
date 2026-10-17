import { NextResponse } from 'next/server';
import { etlabLogin } from '@/lib/etlab-client';
import { createSession } from '@/lib/auth';
import { DEMO_PROFILE, DEMO_PROFILE_B } from '@/lib/demo-data';
import { clearAssignmentCache } from '@/lib/assignment-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode, username, password, account } = body;

    if (mode === 'demo') {
      const isAccountB =
        account === 'B' ||
        (username && (username.trim().toLowerCase() === 'student-b' || username.trim().toLowerCase() === 'demo-b' || username.trim() === '25CTA99'));
      const activeProfile = isAccountB ? DEMO_PROFILE_B : DEMO_PROFILE;

      clearAssignmentCache({ mode: 'demo', username: activeProfile.admissionNo });

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
        { status: 400 }
      );
    }

    const result = await etlabLogin(username, password);

    if (!result.success || !result.sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Authentication failed against TKMCE ETLAB. Please check credentials.',
        },
        { status: 401 }
      );
    }

    // Store secure HttpOnly session with retrieved profile
    await createSession({
      mode: 'live',
      username: username.trim(),
      displayName: result.profile?.name || username.trim(),
      sessionId: result.sessionId,
      profile: result.profile,
    });

    return NextResponse.json({
      success: true,
      mode: 'live',
      profile: result.profile,
      message: 'Authenticated successfully with TKMCE ETLAB.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during authentication.',
      },
      { status: 500 }
    );
  }
}
