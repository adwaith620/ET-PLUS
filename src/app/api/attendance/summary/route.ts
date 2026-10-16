import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/data-service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const targetParam = url.searchParams.get('target');
  const target = targetParam ? parseFloat(targetParam) : 75;

  const validTarget = !isNaN(target) && target >= 0 && target <= 100 ? target : 75;
  const data = await getDashboardData(validTarget);

  if (!data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    attendance: data.attendance,
    lastSynced: data.lastSynced,
  });
}
