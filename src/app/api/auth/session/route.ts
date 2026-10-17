import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

import { PRIVATE_CACHE_HEADERS } from '@/lib/security';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, session: null }, { status: 401, headers: PRIVATE_CACHE_HEADERS });
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
  }, { headers: PRIVATE_CACHE_HEADERS });
}
