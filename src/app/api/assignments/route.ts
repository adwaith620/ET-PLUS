import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSynchronizedAssignments } from '@/lib/assignment-service';

import { PRIVATE_CACHE_HEADERS } from '@/lib/security';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Session required.' }, { status: 401, headers: PRIVATE_CACHE_HEADERS });
    }

    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const syncResult = await getSynchronizedAssignments(session, forceRefresh);

    return NextResponse.json(syncResult, { headers: PRIVATE_CACHE_HEADERS });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: PRIVATE_CACHE_HEADERS });
  }
}
