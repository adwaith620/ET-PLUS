import { NextResponse } from 'next/server';
import { getSession, destroySession } from '@/lib/auth';
import { etlabLogout } from '@/lib/etlab-client';
import { clearAssignmentCache } from '@/lib/assignment-service';
import { invalidateStudentCache } from '@/lib/data-service';

import { verifySameOrigin, PRIVATE_CACHE_HEADERS } from '@/lib/security';

export async function POST(request: Request) {
  try {
    if (!verifySameOrigin(request)) {
      return NextResponse.json({ success: false, error: 'Forbidden: Invalid request origin.' }, { status: 403 });
    }

    const session = await getSession();
    if (session) {
      clearAssignmentCache(session);
      if (session.username) {
        invalidateStudentCache(session.username);
      }
      if (session.sessionId) {
        await etlabLogout(session.sessionId);
      }
    }
    await destroySession();
    return NextResponse.json(
      { success: true, message: 'Signed out successfully.' },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  } catch {
    await destroySession();
    return NextResponse.json(
      { success: true, message: 'Signed out.' },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  }
}
