import { NextResponse } from 'next/server';
import { getSession, destroySession } from '@/lib/auth';
import { etlabLogout } from '@/lib/etlab-client';

export async function POST() {
  try {
    const session = await getSession();
    if (session?.sessionId) {
      await etlabLogout(session.sessionId);
    }
    await destroySession();
    return NextResponse.json({ success: true, message: 'Signed out successfully.' });
  } catch {
    await destroySession();
    return NextResponse.json({
      success: true,
      message: 'Signed out.',
    });
  }
}
