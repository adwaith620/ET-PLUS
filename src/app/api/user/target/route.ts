import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  const cookieStore = await cookies();
  const userCookie = session?.username ? cookieStore.get(`etlab_target_${session.username}`) : undefined;
  const generalCookie = cookieStore.get('etlab_target');

  const val = userCookie?.value || generalCookie?.value;
  const parsed = val ? parseFloat(val) : 75;
  const target = !isNaN(parsed) && parsed >= 50 && parsed <= 100 ? parsed : 75;

  return NextResponse.json({ success: true, target });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawTarget = typeof body.target === 'number' ? body.target : parseFloat(body.target);

    if (isNaN(rawTarget) || rawTarget < 50 || rawTarget > 100) {
      return NextResponse.json(
        { success: false, error: 'Target percentage must be a valid number between 50 and 100.' },
        { status: 400 }
      );
    }

    const target = Math.round(rawTarget * 10) / 10;
    const session = await getSession();
    const cookieStore = await cookies();

    // Set general target cookie
    cookieStore.set('etlab_target', target.toString(), {
      path: '/',
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    // Set user-specific target cookie if session exists
    if (session?.username) {
      cookieStore.set(`etlab_target_${session.username}`, target.toString(), {
        path: '/',
        maxAge: 365 * 24 * 60 * 60, // 1 year
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    return NextResponse.json({ success: true, target });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to process target update request.' },
      { status: 500 }
    );
  }
}
