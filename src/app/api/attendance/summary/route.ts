import { NextResponse } from 'next/server';
import { getAttendancePageData, invalidateStudentCache } from '@/lib/data-service';
import { getSession } from '@/lib/auth';
import { PRIVATE_CACHE_HEADERS } from '@/lib/security';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const targetParam = url.searchParams.get('target');
  const forceRefresh = url.searchParams.get('refresh') === 'true';
  const target = targetParam ? parseFloat(targetParam) : 75;

  const validTarget = !isNaN(target) && target >= 0 && target <= 100 ? target : 75;

  if (forceRefresh) {
    const session = await getSession();
    if (session?.username) {
      invalidateStudentCache(session.username);
    }
  }

  const data = await getAttendancePageData(validTarget);

  if (!data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: PRIVATE_CACHE_HEADERS });
  }

  const now = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return NextResponse.json(
    {
      attendance: data.attendance,
      lastSynced: now,
    },
    { headers: PRIVATE_CACHE_HEADERS }
  );
}
