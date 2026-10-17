import path from 'path';

/**
 * Retrieves the session signing secret.
 * Enforces production safety: fails immediately if missing or shorter than 32 characters.
 */
export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL SECURITY ERROR: SESSION_SECRET environment variable is missing in production.'
      );
    }
    return 'etlab-modern-tkmce-portal-secure-key-2026';
  }
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error(
      'CRITICAL SECURITY ERROR: SESSION_SECRET in production must be at least 32 characters long.'
    );
  }
  return secret;
}

/**
 * Validates that a URL uses safe protocols (http, https) or is an absolute internal path.
 * Rejects javascript:, data:, vbscript:, and protocol-relative (//) URLs.
 */
export function isSafeUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();

  // Allow internal paths (/path/to/page) but disallow protocol-relative URLs (//evil.com)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Verifies that state-changing requests originate from the same host (CSRF protection).
 */
export function verifySameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      return false;
    }
  }

  const referer = req.headers.get('referer');
  if (referer && host) {
    try {
      const refererHost = new URL(referer).host;
      return refererHost === host;
    } catch {
      return false;
    }
  }

  // Same-origin if neither origin nor referer is set (standard direct/same-origin navigation)
  return true;
}

/**
 * Sanitizes a filename to prevent path traversal (../) and strip invalid characters.
 */
export function sanitizeFilename(filename: string): string {
  const base = path.basename(filename);
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Validates magic bytes / file signatures to prevent file spoofing and stored active content.
 * Supported types: PDF, DOC, DOCX, PPT, PPTX
 */
export function validateFileBuffer(
  buffer: Buffer,
  ext: string
): { valid: boolean; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'File is empty.' };
  }

  const lowerExt = ext.toLowerCase().trim();

  // PDF Signature: %PDF- (0x25 0x50 0x44 0x46)
  if (lowerExt === '.pdf') {
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return { valid: true };
    }
    return { valid: false, error: 'File content does not match a valid PDF signature.' };
  }

  // OpenXML Document (DOCX, PPTX) or ZIP: PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (lowerExt === '.docx' || lowerExt === '.pptx') {
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    ) {
      return { valid: true };
    }
    return { valid: false, error: 'File content does not match a valid OpenXML Office document signature.' };
  }

  // Legacy Microsoft Office Binary Format (DOC, PPT): 0xD0 0xCF 0x11 0xE0 0xA1 0xB1 0x1A 0xE1
  if (lowerExt === '.doc' || lowerExt === '.ppt') {
    if (
      buffer.length >= 4 &&
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0
    ) {
      return { valid: true };
    }
    return { valid: false, error: 'File content does not match a valid Microsoft Office document signature.' };
  }

  return { valid: false, error: `Unsupported or unverified file extension: ${ext}` };
}

/**
 * In-memory sliding window rate limiter for resource-intensive and sensitive endpoints.
 * Note: Distributed deployments across multiple independent serverless workers require
 * a centralized store (e.g. Upstash Redis / Vercel KV) for cross-instance enforcement.
 */
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitBuckets = new Map<string, RateLimitBucket>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 20,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (bucket.count < maxRequests) {
    bucket.count += 1;
    return { allowed: true, remaining: maxRequests - bucket.count };
  }

  return { allowed: false, remaining: 0 };
}

/**
 * Cache-Control header object for authenticated private student data.
 */
export const PRIVATE_CACHE_HEADERS = {
  'Cache-Control': 'private, no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};
