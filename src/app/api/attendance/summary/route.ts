import { NextResponse } from 'next/server';
import { getAttendancePageData, invalidateStudentCache } from '@/lib/data-service';
import { getSession } from '@/lib/auth';
import { PRIVATE_CACHE_HEADERS } from '@/lib/security';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: PRIVATE_CACHE_HEADERS });
  }

  const url = new URL(request.url);
  const targetParam = url.searchParams.get('target');
  const forceRefresh = url.searchParams.get('refresh') === 'true';
  const target = targetParam ? parseFloat(targetParam) : 75;

  const validTarget = !isNaN(target) && target > 0 && target <= 100 ? target : 75;

  if (forceRefresh && session.username) {
    invalidateStudentCache(session.username);
  }

  const data = await getAttendancePageData(validTarget, forceRefresh);

  if (!data) {
    return NextResponse.json({ error: 'Unauthorized or session expired' }, { status: 401, headers: PRIVATE_CACHE_HEADERS });
  }

  return NextResponse.json(
    {
      attendance: data.attendance,
      lastSynced: data.lastSynced,
      syncSuccess: data.syncSuccess,
    },
    { headers: PRIVATE_CACHE_HEADERS }
  );
}
