import { NextResponse } from 'next/server';
import { getProfilePageData, invalidateStudentCache } from '@/lib/data-service';
import { getSession } from '@/lib/auth';
import { PRIVATE_CACHE_HEADERS } from '@/lib/security';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: PRIVATE_CACHE_HEADERS });
  }

  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get('refresh') === 'true';

  if (forceRefresh && session.username) {
    invalidateStudentCache(session.username);
  }

  const data = await getProfilePageData();
  if (!data) {
    return NextResponse.json({ error: 'Unauthorized or session expired' }, { status: 401, headers: PRIVATE_CACHE_HEADERS });
  }

  return NextResponse.json(
    {
      success: !data.teachersError,
      teachers: data.teachers || [],
      error: data.teachersError,
    },
    { headers: PRIVATE_CACHE_HEADERS }
  );
}
