import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { Announcement } from '@/types';

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

/**
 * Retrieves all cohort-wide announcements.
 */
export async function getCohortAnnouncements(): Promise<Announcement[]> {
  try {
    ensureAnnouncementsDirectory();
    const data = await fs.readFile(ANNOUNCEMENTS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      isCohortShared: true,
      cohort: item.cohort || 'R3AI',
    }));
  } catch {
    return [];
  }
}

/**
 * Saves a new cohort announcement.
 */
export async function saveCohortAnnouncement(announcement: Announcement): Promise<void> {
  ensureAnnouncementsDirectory();
  const existing = await getCohortAnnouncements();
  const filtered = existing.filter((a) => a.id !== announcement.id);
  const updated = [announcement, ...filtered];
  await fs.writeFile(ANNOUNCEMENTS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
}

/**
 * Deletes a cohort announcement with server-side authorization check.
 */
export async function deleteCohortAnnouncement(
  id: string,
  requesterUsername: string
): Promise<{ success: boolean; error?: string }> {
  try {
    ensureAnnouncementsDirectory();
    const existing = await getCohortAnnouncements();
    const announcement = existing.find((a) => a.id === id);

    if (!announcement) {
      return { success: false, error: 'Announcement not found.' };
    }

    // Verify authorization: only the author or admin/demo user can delete
    const isOwner =
      announcement.authorUsername === requesterUsername ||
      announcement.author === requesterUsername ||
      requesterUsername === 'demo' ||
      requesterUsername === 'TKM25CA013' ||
      !announcement.authorUsername;

    if (!isOwner) {
      return { success: false, error: 'Unauthorized: You can only delete announcements created by you.' };
    }

    const updated = existing.filter((a) => a.id !== id);
    await fs.writeFile(ANNOUNCEMENTS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
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
