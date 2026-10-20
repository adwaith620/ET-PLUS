import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import type { Announcement } from '../types/index.ts';
import {
  isSupabaseConfigured,
  getSupabaseClient,
  isFilesystemStorageAvailable,
} from './supabase-client.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, 'cohort-announcements.json');

export function ensureAnnouncementsDirectory(): void {
  if (!isFilesystemStorageAvailable()) {
    return;
  }
  try {
    if (!fsSync.existsSync(DATA_DIR)) {
      fsSync.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fsSync.existsSync(ANNOUNCEMENTS_FILE)) {
      fsSync.writeFileSync(ANNOUNCEMENTS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch {
    // Gracefully handle filesystem limitations
  }
}

let cachedAnnouncements: Announcement[] | null = null;
let lastAnnouncementsReadTime = 0;
const ANNOUNCEMENTS_CACHE_TTL = 30000;

export function invalidateCohortAnnouncementsCache(): void {
  cachedAnnouncements = null;
  lastAnnouncementsReadTime = 0;
}

// Supabase row mapper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAnnouncement(row: any): Announcement {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category || 'Academic',
    date: row.date,
    author: row.author,
    authorUsername: row.author_username || undefined,
    pinned: Boolean(row.pinned),
    link: row.link || undefined,
    isCohortShared: Boolean(row.is_cohort_shared),
    cohort: row.cohort || 'R3AI',
    isAssignment: Boolean(row.is_assignment),
    deadlineDate: row.deadline_date || undefined,
    deadlineTime: row.deadline_time || undefined,
    subjectCode: row.subject_code || undefined,
    subject: row.subject || undefined,
    status: (row.status as Announcement['status']) || 'published',
  };
}

function announcementToRow(a: Announcement) {
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    category: a.category || 'Academic',
    date: a.date,
    author: a.author || 'Administrator',
    author_username: a.authorUsername || null,
    pinned: Boolean(a.pinned),
    link: a.link || null,
    is_cohort_shared: a.isCohortShared !== false,
    cohort: a.cohort || 'R3AI',
    is_assignment: Boolean(a.isAssignment),
    deadline_date: a.deadlineDate || null,
    deadline_time: a.deadlineTime || null,
    subject_code: a.subjectCode || null,
    subject: a.subject || null,
    status: a.status || 'published',
    updated_at: new Date().toISOString(),
  };
}

/**
 * Retrieves all cohort-wide announcements.
 */
export async function getCohortAnnouncements(): Promise<Announcement[]> {
  const now = Date.now();
  if (cachedAnnouncements && now - lastAnnouncementsReadTime < ANNOUNCEMENTS_CACHE_TTL) {
    return cachedAnnouncements;
  }

  // 1. Supabase persistent backend
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const list = data.map(rowToAnnouncement);
          cachedAnnouncements = list;
          lastAnnouncementsReadTime = now;
          return list;
        }
      }
    } catch {
      // Fall through to fallback
    }
  }

  // 2. Local filesystem storage (local dev / testing only)
  if (isFilesystemStorageAvailable()) {
    try {
      ensureAnnouncementsDirectory();
      const data = await fs.readFile(ANNOUNCEMENTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        const formatted = parsed.map((item) => ({
          ...item,
          isCohortShared: true,
          cohort: item.cohort || 'R3AI',
        }));
        cachedAnnouncements = formatted;
        lastAnnouncementsReadTime = now;
        return formatted;
      }
    } catch {
      return [];
    }
  }

  return cachedAnnouncements || [];
}

/**
 * Saves or updates a cohort announcement.
 */
export async function saveCohortAnnouncement(announcement: Announcement): Promise<void> {
  // 1. Supabase persistent backend
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const row = announcementToRow(announcement);
      const { error } = await supabase.from('announcements').upsert(row);
      if (error) {
        throw new Error(`Database error saving announcement: ${error.message}`);
      }
      invalidateCohortAnnouncementsCache();
      return;
    }
  }

  // 2. Local filesystem storage (local dev / testing only)
  if (isFilesystemStorageAvailable()) {
    ensureAnnouncementsDirectory();
    const existing = await getCohortAnnouncements();
    const filtered = existing.filter((a) => a.id !== announcement.id);
    const updated = [announcement, ...filtered];
    await fs.writeFile(ANNOUNCEMENTS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    invalidateCohortAnnouncementsCache();
    return;
  }

  // 3. In production serverless without database, reject cleanly without filesystem crashes
  throw new Error(
    'Persistent storage unavailable: Supabase database credentials (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) must be configured in environment variables.'
  );
}

/**
 * Updates an existing announcement metadata.
 */
export async function updateCohortAnnouncement(
  id: string,
  updates: Partial<Announcement>
): Promise<{ success: boolean; announcement?: Announcement; error?: string }> {
  // 1. Supabase persistent backend
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.pinned !== undefined) dbUpdates.pinned = Boolean(updates.pinned);
      if (updates.link !== undefined) dbUpdates.link = updates.link;
      if (updates.isCohortShared !== undefined) dbUpdates.is_cohort_shared = Boolean(updates.isCohortShared);
      if (updates.cohort !== undefined) dbUpdates.cohort = updates.cohort;
      if (updates.isAssignment !== undefined) dbUpdates.is_assignment = Boolean(updates.isAssignment);
      if (updates.deadlineDate !== undefined) dbUpdates.deadline_date = updates.deadlineDate;
      if (updates.deadlineTime !== undefined) dbUpdates.deadline_time = updates.deadlineTime;
      if (updates.subjectCode !== undefined) dbUpdates.subject_code = updates.subjectCode;
      if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
      if (updates.status !== undefined) dbUpdates.status = updates.status;

      const { data, error } = await supabase
        .from('announcements')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        return { success: false, error: error?.message || 'Announcement not found.' };
      }
      invalidateCohortAnnouncementsCache();
      return { success: true, announcement: rowToAnnouncement(data) };
    }
  }

  // 2. Local filesystem storage (local dev / testing only)
  if (isFilesystemStorageAvailable()) {
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

  return {
    success: false,
    error: 'Persistent storage unavailable: Supabase database credentials must be configured.',
  };
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

    // 1. Supabase persistent backend
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        if (!isAdmin) {
          const { data: existing } = await supabase
            .from('announcements')
            .select('author_username')
            .eq('id', id)
            .single();

          if (!existing) {
            return { success: false, error: 'Announcement not found.' };
          }

          const isOwner = Boolean(
            existing.author_username && existing.author_username === requesterUsername
          );
          if (!isOwner) {
            return { success: false, error: 'Unauthorized: You can only delete announcements created by you.' };
          }
        }

        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error) {
          return { success: false, error: error.message };
        }
        invalidateCohortAnnouncementsCache();
        return { success: true };
      }
    }

    // 2. Local filesystem storage (local dev / testing only)
    if (isFilesystemStorageAvailable()) {
      ensureAnnouncementsDirectory();
      const existing = await getCohortAnnouncements();
      const announcement = existing.find((a) => a.id === id);

      if (!announcement) {
        return { success: false, error: 'Announcement not found.' };
      }

      if (!isAdmin) {
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
    }

    return {
      success: false,
      error: 'Persistent storage unavailable: Supabase database credentials must be configured.',
    };
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
