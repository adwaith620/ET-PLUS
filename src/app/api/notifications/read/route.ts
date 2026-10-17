import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { markNotificationsAsRead, getReadNotificationIds } from '@/lib/notifications-service';

import { verifySameOrigin, PRIVATE_CACHE_HEADERS } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    if (!verifySameOrigin(req)) {
      return NextResponse.json({ error: 'Forbidden: Invalid request origin.' }, { status: 403 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: PRIVATE_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const rawIds: unknown[] = Array.isArray(body?.ids) ? body.ids : [];
    const validIds: string[] = rawIds
      .filter((id): id is string => typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id))
      .slice(0, 100);

    if (validIds.length > 0) {
      await markNotificationsAsRead(session.username, validIds);
    }

    const currentRead = await getReadNotificationIds(session.username);

    const response = NextResponse.json(
      { success: true, readIds: currentRead },
      { headers: PRIVATE_CACHE_HEADERS }
    );
    // Also persist in cookie for ultra-fast local hydration
    response.cookies.set(`etlab_read_notifs_${session.username}`, JSON.stringify(currentRead), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
