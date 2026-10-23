import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { AuthSession, StudentProfile } from '@/types';
import { getSessionSecret } from './security';

const SESSION_COOKIE_NAME = 'etlab_session';
export const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours server-side session validity

export { getSessionSecret };

export interface ExtendedSession extends AuthSession {
  profile?: StudentProfile;
}

/**
 * Sign payload using HMAC-SHA256
 */
function sign(data: string): string {
  const hmac = crypto.createHmac('sha256', getSessionSecret());
  hmac.update(data);
  const signature = hmac.digest('base64url');
  return `${Buffer.from(data).toString('base64url')}.${signature}`;
}

/**
 * Verify and parse signed session token
 */
function verify(token: string): ExtendedSession | null {
  try {
    const [encodedData, signature] = token.split('.');
    if (!encodedData || !signature) return null;

    const data = Buffer.from(encodedData, 'base64url').toString('utf-8');
    const expectedHmac = crypto.createHmac('sha256', getSessionSecret());
    expectedHmac.update(data);
    const expectedSignature = expectedHmac.digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
      const parsed = JSON.parse(data) as ExtendedSession;
      if (!parsed || typeof parsed !== 'object') return null;
      if (!parsed.username || typeof parsed.username !== 'string') return null;
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        return null; // Expired
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Set browser-session cookie in Next.js (cleared on browser session end)
 */
export async function createSession(
  sessionData: {
    mode: 'live' | 'demo';
    username: string;
    displayName: string;
    sessionId?: string;
    profile?: StudentProfile;
  }
): Promise<void> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const session: ExtendedSession = {
    ...sessionData,
    expiresAt,
  };

  const token = sign(JSON.stringify(session));
  const cookieStore = await cookies();

  // Browser-session cookie: omitting maxAge/expires ensures cookie expires when browser session ends.
  // Secure, HttpOnly, and SameSite=lax protect against tampering, leakage, and CSRF.
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Retrieve session from cookie
 */
export async function getSession(): Promise<ExtendedSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }
  return verify(sessionCookie.value);
}

/**
 * Clear session cookie
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
