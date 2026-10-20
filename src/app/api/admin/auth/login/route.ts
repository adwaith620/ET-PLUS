import { NextRequest, NextResponse } from 'next/server';
import { validateAdminCredentials, signAdminToken, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';
import { checkRateLimit } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const rateCheck = checkRateLimit('admin_login_attempt', 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait a minute.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    const isValid = validateAdminCredentials(username.trim(), password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid administrator credentials.' },
        { status: 401 }
      );
    }

    const token = signAdminToken(username.trim());
    const response = NextResponse.json({
      success: true,
      token,
      user: { username: username.trim(), role: 'admin' },
      message: 'Admin authenticated successfully.',
    });

    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
