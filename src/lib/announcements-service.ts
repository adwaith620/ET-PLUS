import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import type { Announcement } from '../types/index.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, 'cohort-announcements.json');

export function ensureAnnouncementsDirectory() {
  if (!fsSync.existsSync(DATA_DIR)) {
    fsSync.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fsSync.existsSync(ANNOUNCEMENTS_FILE)) {
    fsSync.writeFileSync(ANNOUNCEMENTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

let cachedAnnouncements: Announcement[] | null = null;
let lastAnnouncementsReadTime = 0;
const ANNOUNCEMENTS_CACHE_TTL = 30000;

export function invalidateCohortAnnouncementsCache(): void {
  cachedAnnouncements = null;
  lastAnnouncementsReadTime = 0;
}

/**
 * Retrieves all cohort-wide announcements.
 */
export async function getCohortAnnouncements(): Promise<Announcement[]> {
  const now = Date.now();
  if (cachedAnnouncements && now - lastAnnouncementsReadTime < ANNOUNCEMENTS_CACHE_TTL) {
    return cachedAnnouncements;
  }

  try {
    ensureAnnouncementsDirectory();
    const data = await fs.readFile(ANNOUNCEMENTS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    const formatted = parsed.map((item) => ({
      ...item,
      isCohortShared: true,
      cohort: item.cohort || 'R3AI',
    }));
    cachedAnnouncements = formatted;
    lastAnnouncementsReadTime = now;
    return formatted;
  } catch {
    return [];
  }
}

/**
 * Saves or updates a cohort announcement.
 */
export async function saveCohortAnnouncement(announcement: Announcement): Promise<void> {
  ensureAnnouncementsDirectory();
  const existing = await getCohortAnnouncements();
  const filtered = existing.filter((a) => a.id !== announcement.id);
  const updated = [announcement, ...filtered];
  await fs.writeFile(ANNOUNCEMENTS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  invalidateCohortAnnouncementsCache();
}

/**
 * Updates an existing announcement metadata.
 */
export async function updateCohortAnnouncement(
  id: string,
  updates: Partial<Announcement>
): Promise<{ success: boolean; announcement?: Announcement; error?: string }> {
  try {
    ensureAnnouncementsDirectory();
    const existing = await getCohortAnnouncements();
    const index = existing.findIndex((a) => a.id === id);
    if (index === -1) {
      return { success: false, error: 'Announcement not found.' };
    }
    const updatedAnnouncement: Announcement = {
      ...existing[index],
      ...updates,
      id, // Preserve ID
    };
    existing[index] = updatedAnnouncement;
    await fs.writeFile(ANNOUNCEMENTS_FILE, JSON.stringify(existing, null, 2), 'utf-8');
    invalidateCohortAnnouncementsCache();
    return { success: true, announcement: updatedAnnouncement };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update announcement.';
    return { success: false, error: message };
  }
}

/**
 * Deletes a cohort announcement with server-side authorization check.
 */
export async function deleteCohortAnnouncement(
  id: string,
  requesterUsername?: string,
  isAdmin: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return { success: false, error: 'Invalid announcement identifier.' };
    }

    ensureAnnouncementsDirectory();
    const existing = await getCohortAnnouncements();
    const announcement = existing.find((a) => a.id === id);

    if (!announcement) {
      return { success: false, error: 'Announcement not found.' };
    }

    if (!isAdmin) {
      // Verify authorization: strictly check that authenticated username matches author
      const isOwner = Boolean(
        announcement.authorUsername && announcement.authorUsername === requesterUsername
      );

      if (!isOwner) {
        return { success: false, error: 'Unauthorized: You can only delete announcements created by you.' };
      }
    }

    const updated = existing.filter((a) => a.id !== id);
    await fs.writeFile(ANNOUNCEMENTS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    invalidateCohortAnnouncementsCache();
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete announcement.';
    return { success: false, error: message };
  }
}

/**
 * Combines official college notices with cohort-wide announcements.
 */
export async function getCombinedAnnouncements(officialAnnouncements: Announcement[]): Promise<Announcement[]> {
  const cohortAnnouncements = await getCohortAnnouncements();
  const taggedOfficial: Announcement[] = (officialAnnouncements || []).map((a) => ({
    ...a,
    isCohortShared: false,
  }));

  // Place pinned items at the top, then cohort items, then official items
  const combined = [...cohortAnnouncements, ...taggedOfficial];
  return combined.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });
}
