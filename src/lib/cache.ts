/**
 * Safe, Session-Scoped In-Memory Cache and In-Flight Request Deduplication
 *
 * Guarantees:
 * 1. Strict student-data isolation: entries are partitioned by authenticated username.
 *    Account A and Account B can never access or leak each other's data.
 * 2. Short TTL (60s default) prevents stale academic records.
 * 3. In-flight promise deduplication collapses concurrent identical requests into one.
 * 4. Explicit invalidation on logout, account switch, or manual sync/refresh.
 * 5. In-memory only: zero persistent disk caching of sensitive upstream data.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  username: string;
}

const memoryStore = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Default TTL for student academic records in memory: 60 seconds.
 */
export const DEFAULT_CACHE_TTL_MS = 60 * 1000;

/**
 * Retrieve cached data for a specific authenticated student.
 */
export function getCachedStudentData<T>(username: string, key: string): T | undefined {
  if (!username || !key) return undefined;

  const compositeKey = `${username.trim()}::${key.trim()}`;
  const entry = memoryStore.get(compositeKey);

  if (!entry) return undefined;

  // Strict ownership check
  if (entry.username !== username.trim()) {
    memoryStore.delete(compositeKey);
    return undefined;
  }

  // Check TTL expiration
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(compositeKey);
    return undefined;
  }

  return entry.value as T;
}

/**
 * Store data in the student-scoped cache.
 */
export function setCachedStudentData<T>(
  username: string,
  key: string,
  value: T,
  ttlMs: number = DEFAULT_CACHE_TTL_MS
): void {
  if (!username || !key || value === undefined || value === null) return;

  const compositeKey = `${username.trim()}::${key.trim()}`;
  memoryStore.set(compositeKey, {
    value,
    expiresAt: Date.now() + ttlMs,
    username: username.trim(),
  });
}

/**
 * Purge all cached records for a specific student.
 * Must be invoked on logout, account switching, or explicit manual refresh.
 */
export function invalidateStudentCache(username?: string): void {
  if (!username) return;

  const cleanUsername = username.trim();
  const prefix = `${cleanUsername}::`;

  for (const key of Array.from(memoryStore.keys())) {
    if (key.startsWith(prefix)) {
      memoryStore.delete(key);
    }
  }

  for (const key of Array.from(inFlightRequests.keys())) {
    if (key.startsWith(prefix)) {
      inFlightRequests.delete(key);
    }
  }
}

/**
 * Completely wipe the in-memory cache (for test suites or server restarts).
 */
export function clearAllStudentCache(): void {
  memoryStore.clear();
  inFlightRequests.clear();
}

/**
 * Deduplicates in-flight asynchronous operations.
 * If multiple concurrent requests arrive for the exact same composite key,
 * only one operation is executed and its promise is shared among all callers.
 */
export async function deduplicateRequest<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = (async () => {
    try {
      return await fetcher();
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, promise);
  return promise;
}
