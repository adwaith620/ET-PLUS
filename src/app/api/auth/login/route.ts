import { NextResponse } from 'next/server';
import { etlabLogin } from '@/lib/etlab-client';
import { createSession } from '@/lib/auth';
import { DEMO_PROFILE } from '@/lib/demo-data';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode, username, password } = body;

    if (mode === 'demo') {
      await createSession({
        mode: 'demo',
        username: DEMO_PROFILE.admissionNo,
        displayName: DEMO_PROFILE.name,
        profile: DEMO_PROFILE,
      });

      return NextResponse.json({
        success: true,
        mode: 'demo',
        profile: DEMO_PROFILE,
        message: 'Signed in successfully in Demo Mode.',
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
