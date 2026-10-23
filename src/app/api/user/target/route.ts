import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { invalidateStudentCache } from '@/lib/data-service';
import { verifySameOrigin, PRIVATE_CACHE_HEADERS } from '@/lib/security';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: PRIVATE_CACHE_HEADERS });
  }

  const cookieStore = await cookies();
  const userCookie = session.username ? cookieStore.get(`etlab_target_${session.username}`) : undefined;
  const generalCookie = cookieStore.get('etlab_target');

  const val = userCookie?.value || generalCookie?.value;
  const parsed = val ? parseFloat(val) : 75;
  const target = !isNaN(parsed) && parsed > 0 && parsed <= 100 ? parsed : 75;

  return NextResponse.json({ success: true, target }, { headers: PRIVATE_CACHE_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    if (!verifySameOrigin(req)) {
      return NextResponse.json({ success: false, error: 'Forbidden: Invalid request origin.' }, { status: 403 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const rawTarget = typeof body.target === 'number' ? body.target : parseFloat(body.target);

    if (isNaN(rawTarget) || rawTarget <= 0 || rawTarget > 100) {
      return NextResponse.json(
        { success: false, error: 'Target percentage must be a valid number greater than 0 and up to 100.' },
        { status: 400 }
      );
    }

    const target = Math.round(rawTarget * 10) / 10;
    const cookieStore = await cookies();

    // Set general target cookie
    cookieStore.set('etlab_target', target.toString(), {
      path: '/',
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    // Set user-specific target cookie if session exists
    if (session.username) {
      cookieStore.set(`etlab_target_${session.username}`, target.toString(), {
        path: '/',
        maxAge: 365 * 24 * 60 * 60, // 1 year
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      invalidateStudentCache(session.username);
    }

    return NextResponse.json({ success: true, target }, { headers: PRIVATE_CACHE_HEADERS });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to process target update request.' },
      { status: 500 }
    );
  }
}
