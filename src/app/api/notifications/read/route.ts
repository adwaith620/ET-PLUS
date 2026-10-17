import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { markNotificationsAsRead, getReadNotificationIds } from '@/lib/notifications-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];

    if (ids.length > 0) {
      await markNotificationsAsRead(session.username, ids);
    }

    const currentRead = await getReadNotificationIds(session.username);

    const response = NextResponse.json({ success: true, readIds: currentRead });
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
