import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getSessionSecret } from './security';

export const ADMIN_COOKIE_NAME = 'etplus_admin_session';

export function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'ETPLUS@Admin2026';
  const apiSecret = process.env.ADMIN_API_SECRET || getSessionSecret();
  return { username, password, apiSecret };
}

/**
 * Validates admin username and password safely using timing-safe comparison.
 */
export function validateAdminCredentials(user: string, pass: string): boolean {
  const { username, password } = getAdminCredentials();
  if (!user || !pass) return false;

  const userBuf = Buffer.from(user);
  const targetUserBuf = Buffer.from(username);
  const passBuf = Buffer.from(pass);
  const targetPassBuf = Buffer.from(password);

  const userMatch = userBuf.length === targetUserBuf.length && crypto.timingSafeEqual(userBuf, targetUserBuf);
  const passMatch = passBuf.length === targetPassBuf.length && crypto.timingSafeEqual(passBuf, targetPassBuf);

  return userMatch && passMatch;
}

/**
 * Creates signed admin session token.
 */
export function signAdminToken(username: string): string {
  const { apiSecret } = getAdminCredentials();
  const payload = JSON.stringify({
    username,
    role: 'admin',
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  const hmac = crypto.createHmac('sha256', apiSecret);
  hmac.update(payload);
  const signature = hmac.digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${signature}`;
}

/**
 * Verifies signed admin session token.
 */
export function verifyAdminToken(token: string): boolean {
  try {
    const { apiSecret } = getAdminCredentials();
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) return false;

    const payloadStr = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const hmac = crypto.createHmac('sha256', apiSecret);
    hmac.update(payloadStr);
    const expectedSignature = hmac.digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }

    const payload = JSON.parse(payloadStr);
    if (!payload || payload.role !== 'admin') return false;
    if (payload.expiresAt && Date.now() > payload.expiresAt) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Verifies incoming request for admin authorization.
 * Accepts either:
 * 1. Authorization: Bearer <token_or_secret>
 * 2. etplus_admin_session cookie
 */
export async function verifyAdminRequest(req: NextRequest): Promise<{ authorized: boolean; error?: string }> {
  const { apiSecret } = getAdminCredentials();

  // 1. Check Bearer Authorization Header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === apiSecret) {
      return { authorized: true };
    }
    if (verifyAdminToken(token)) {
      return { authorized: true };
    }
  }

  // 2. Check Admin Session Cookie
  try {
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get(ADMIN_COOKIE_NAME);
    if (adminCookie && adminCookie.value && verifyAdminToken(adminCookie.value)) {
      return { authorized: true };
    }
  } catch {
    // Cookie store error fallback
  }

  return { authorized: false, error: 'Unauthorized: Administrative access required.' };
}
