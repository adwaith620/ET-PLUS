import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSynchronizedAssignments } from '@/lib/assignment-service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Session required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const syncResult = await getSynchronizedAssignments(session, forceRefresh);

    return NextResponse.json(syncResult);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
