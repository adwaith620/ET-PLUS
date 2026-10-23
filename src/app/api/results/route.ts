import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getResultsPageData } from '@/lib/data-service';
import { PRIVATE_CACHE_HEADERS } from '@/lib/security';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Session required.' },
        { status: 401, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const data = await getResultsPageData(forceRefresh);
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Unable to retrieve examination records.' },
        { status: 500, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: !data.resultsError,
        records: data.assessmentRecords || [],
        results: data.results || [],
        resultsError: data.resultsError,
        mode: data.mode,
        lastSynced: data.lastSynced || 'Just now',
      },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }
}
