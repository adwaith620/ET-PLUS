import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/data-service';

import { PRIVATE_CACHE_HEADERS } from '@/lib/security';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const targetParam = url.searchParams.get('target');
  const target = targetParam ? parseFloat(targetParam) : 75;

  const validTarget = !isNaN(target) && target >= 0 && target <= 100 ? target : 75;
  const data = await getDashboardData(validTarget);

  if (!data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: PRIVATE_CACHE_HEADERS });
  }

  return NextResponse.json(
    {
      attendance: data.attendance,
      lastSynced: data.lastSynced,
    },
    { headers: PRIVATE_CACHE_HEADERS }
  );
}
