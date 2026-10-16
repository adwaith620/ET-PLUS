import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, session: null }, { status: 401 });
  }

  // Safe public session projection (no private session keys)
  return NextResponse.json({
    authenticated: true,
    session: {
      mode: session.mode,
      username: session.username,
      displayName: session.displayName,
      profile: session.profile,
    },
  });
}
