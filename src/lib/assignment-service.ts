import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import type { Assignment, AuthSession } from '../types/index.ts';
import { getCourseFullName } from './course-catalog.ts';
import { getAssignmentEffectiveStatus, isUpcomingAssignment } from './assignment-utils.ts';
import { DEMO_ASSIGNMENTS } from './demo-data.ts';
import { getCohortAnnouncements } from './announcements-service.ts';
import {
  isSupabaseConfigured,
  getSupabaseClient,
  isFilesystemStorageAvailable,
} from './supabase-client.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const ASSIGNMENTS_FILE = path.join(DATA_DIR, 'assignments.json');

export function ensureAssignmentsDirectory(): void {
  if (!isFilesystemStorageAvailable()) {
    return;
  }
  try {
    if (!fsSync.existsSync(DATA_DIR)) {
      fsSync.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fsSync.existsSync(ASSIGNMENTS_FILE)) {
      fsSync.writeFileSync(ASSIGNMENTS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch {
    // Gracefully ignore filesystem restrictions
  }
}

let cachedAssignmentsList: Assignment[] | null = null;
let lastAssignmentsReadTime = 0;
const ASSIGNMENTS_FILE_CACHE_TTL = 15000;

export function invalidateAssignmentsFileCache(): void {
  cachedAssignmentsList = null;
  lastAssignmentsReadTime = 0;
  clearAllAssignmentCaches();
}

// Supabase row mapper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAssignment(row: any): Assignment {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    subject: row.subject,
    subjectCode: row.subject_code,
    faculty: row.faculty || 'Administrator',
    publishDate: row.publish_date,
    dueDate: row.due_date,
    deadlineDate: row.deadline_date || undefined,
    deadlineTime: row.deadline_time || undefined,
    status: (row.status as Assignment['status']) || 'upcoming',
    submissionMode: (row.submission_mode as Assignment['submissionMode']) || 'Online',
    maxMarks: row.max_marks != null ? Number(row.max_marks) : undefined,
    obtainedMarks: row.obtained_marks != null ? Number(row.obtained_marks) : undefined,
    attachmentName: row.attachment_name || undefined,
    attachmentUrl: row.attachment_url || undefined,
    externalUrl: row.external_url || 'https://tkmce.etlab.in/student/assignments',
    announcementId: row.announcement_id || undefined,
  };
}

function assignmentToRow(asg: Assignment) {
  return {
    id: asg.id,
    title: asg.title,
    description: asg.description || '',
    subject: asg.subject,
    subject_code: asg.subjectCode,
    faculty: asg.faculty || 'Administrator',
    publish_date: asg.publishDate,
    due_date: asg.dueDate,
    deadline_date: asg.deadlineDate || null,
    deadline_time: asg.deadlineTime || null,
    status: asg.status || 'upcoming',
    submission_mode: asg.submissionMode || 'Online',
    max_marks: asg.maxMarks != null ? asg.maxMarks : null,
    obtained_marks: asg.obtainedMarks != null ? asg.obtainedMarks : null,
    attachment_name: asg.attachmentName || null,
    attachment_url: asg.attachmentUrl || null,
    external_url: asg.externalUrl || 'https://tkmce.etlab.in/student/assignments',
    announcement_id: asg.announcementId || null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Retrieves all saved assignments.
 */
export async function getSavedAssignments(): Promise<Assignment[]> {
  const now = Date.now();
  if (cachedAssignmentsList && now - lastAssignmentsReadTime < ASSIGNMENTS_FILE_CACHE_TTL) {
    return cachedAssignmentsList;
  }

  // 1. Supabase persistent backend
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('assignments')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const list = data.map(rowToAssignment);
          cachedAssignmentsList = list;
          lastAssignmentsReadTime = now;
          return list;
        }
      }
    } catch {
      // Fall through
    }
  }

  // 2. Local filesystem storage (local dev / testing only)
  if (isFilesystemStorageAvailable()) {
    try {
      ensureAssignmentsDirectory();
      const data = await fs.readFile(ASSIGNMENTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        cachedAssignmentsList = parsed;
        lastAssignmentsReadTime = now;
        return parsed;
      }
    } catch {
      return [];
    }
  }

  return cachedAssignmentsList || [];
}

/**
 * Saves a new or updated assignment.
 */
export async function saveAssignment(asg: Assignment): Promise<void> {
  // 1. Supabase persistent backend
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const row = assignmentToRow(asg);
      const { error } = await supabase.from('assignments').upsert(row);
      if (error) {
        throw new Error(`Database error saving assignment: ${error.message}`);
      }
      invalidateAssignmentsFileCache();
      return;
    }
  }

  // 2. Local filesystem storage (local dev / testing only)
  if (isFilesystemStorageAvailable()) {
    ensureAssignmentsDirectory();
    const existing = await getSavedAssignments();
    const filtered = existing.filter((a) => a.id !== asg.id);
    const updated = [asg, ...filtered];
    await fs.writeFile(ASSIGNMENTS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    invalidateAssignmentsFileCache();
    return;
  }

  // 3. In production serverless without database, reject cleanly without filesystem crashes
  throw new Error(
    'Persistent storage unavailable: Supabase database credentials (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) must be configured in environment variables.'
  );
}

/**
 * Updates an existing assignment.
 */
export async function updateAssignment(
  id: string,
  updates: Partial<Assignment>
): Promise<{ success: boolean; assignment?: Assignment; error?: string }> {
  // 1. Supabase persistent backend
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
      if (updates.subjectCode !== undefined) dbUpdates.subject_code = updates.subjectCode;
      if (updates.faculty !== undefined) dbUpdates.faculty = updates.faculty;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.deadlineDate !== undefined) dbUpdates.deadline_date = updates.deadlineDate;
      if (updates.deadlineTime !== undefined) dbUpdates.deadline_time = updates.deadlineTime;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.submissionMode !== undefined) dbUpdates.submission_mode = updates.submissionMode;
      if (updates.maxMarks !== undefined) dbUpdates.max_marks = updates.maxMarks;
      if (updates.obtainedMarks !== undefined) dbUpdates.obtained_marks = updates.obtainedMarks;
      if (updates.attachmentName !== undefined) dbUpdates.attachment_name = updates.attachmentName;
      if (updates.attachmentUrl !== undefined) dbUpdates.attachment_url = updates.attachmentUrl;
      if (updates.externalUrl !== undefined) dbUpdates.external_url = updates.externalUrl;

      const { data, error } = await supabase
        .from('assignments')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        return { success: false, error: error?.message || 'Assignment not found.' };
      }
      invalidateAssignmentsFileCache();
      return { success: true, assignment: rowToAssignment(data) };
    }
  }

  // 2. Local filesystem storage (local dev / testing only)
  if (isFilesystemStorageAvailable()) {
    try {
      ensureAssignmentsDirectory();
      const existing = await getSavedAssignments();
      const index = existing.findIndex((a) => a.id === id);
      if (index === -1) {
        return { success: false, error: 'Assignment not found.' };
      }
      const current = existing[index];
      const updatedAsg: Assignment = {
        ...current,
        ...updates,
        id, // Preserve ID
      };
      existing[index] = updatedAsg;
      await fs.writeFile(ASSIGNMENTS_FILE, JSON.stringify(existing, null, 2), 'utf-8');
      invalidateAssignmentsFileCache();
      return { success: true, assignment: updatedAsg };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update assignment.';
      return { success: false, error: message };
    }
  }

  return {
    success: false,
    error: 'Persistent storage unavailable: Supabase database credentials must be configured.',
  };
}

/**
 * Deletes an assignment by ID.
 */
export async function deleteAssignment(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return { success: false, error: 'Invalid assignment identifier.' };
    }

    // 1. Supabase persistent backend
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase.from('assignments').delete().eq('id', id);
        if (error) {
          return { success: false, error: error.message };
        }
        invalidateAssignmentsFileCache();
        return { success: true };
      }
    }

    // 2. Local filesystem storage (local dev / testing only)
    if (isFilesystemStorageAvailable()) {
      ensureAssignmentsDirectory();
      const existing = await getSavedAssignments();
      const updated = existing.filter((a) => a.id !== id);
      await fs.writeFile(ASSIGNMENTS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
      invalidateAssignmentsFileCache();
      return { success: true };
    }

    return {
      success: false,
      error: 'Persistent storage unavailable: Supabase database credentials must be configured.',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete assignment.';
    return { success: false, error: message };
  }
}

export interface AssignmentSyncResult {
  success: boolean;
  assignments: Assignment[];
  upcomingAssignments: Assignment[];
  upcomingCount: number;
  totalCount: number;
  submittedCount: number;
  completedCount: number;
  overdueCount: number;
  error?: string;
  source: 'live' | 'demo';
  lastSynced: string;
}

interface CacheEntry {
  timestamp: number;
  result: AssignmentSyncResult;
}

const assignmentCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 20 * 1000; // 20 seconds short cache to deduplicate simultaneous requests

/**
 * Known fabricated assignment IDs permanently excluded from the system.
 */
export const FABRICATED_ASSIGNMENT_IDS = new Set([
  'asg-01',
  'asg-02',
  'asg-03',
  'asg-04',
  'asg-05',
]);

export function isFabricatedAssignment(asg: Assignment): boolean {
  if (!asg) return true;
  if (asg.id && FABRICATED_ASSIGNMENT_IDS.has(asg.id)) return true;
  const title = (asg.title || '').toLowerCase();
  if (
    title.includes('gradient descent & linear regression from scratch') ||
    title.includes('avl tree balancing and red-black tree rotations') ||
    title.includes('singular value decomposition and fourier transforms') ||
    title.includes('cpu pipelining hazard simulation') ||
    title.includes('combinatorics, generating functions & graph proofs')
  ) {
    return true;
  }
  return false;
}

/**
 * Deduplicates assignments by unique subjectCode + title + dueDate
 */
export function deduplicateAssignments(assignments: Assignment[]): Assignment[] {
  const seen = new Set<string>();
  const result: Assignment[] = [];

  for (const asg of assignments) {
    if (!asg || isFabricatedAssignment(asg)) continue;
    const key = `${(asg.subjectCode || '').trim().toUpperCase()}::${(asg.title || '').trim().toLowerCase()}::${(asg.dueDate || '').trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(asg);
    }
  }

  return result;
}

/**
 * Normalizes an assignment with canonical course names, effective status, and validated submission mode.
 */
export function normalizeAssignment(asg: Assignment): Assignment {
  const code = (asg.subjectCode || '').trim().toUpperCase();
  const canonicalName = getCourseFullName(code, asg.subject);
  const effectiveStatus = getAssignmentEffectiveStatus(asg);

  // Validate submission mode
  let submissionMode: Assignment['submissionMode'] = 'Submission mode not specified';
  if (asg.submissionMode === 'Online' || asg.submissionMode === 'Offline') {
    submissionMode = asg.submissionMode;
  }

  return {
    ...asg,
    id: asg.id || `asg-${code}-${Math.random().toString(36).substring(2, 7)}`,
    subjectCode: code,
    subject: canonicalName,
    title: (asg.title || 'Untitled Assignment').trim(),
    status: effectiveStatus,
    submissionMode,
    publishDate: asg.publishDate || 'Not specified',
    dueDate: asg.dueDate || 'Not specified',
    description: asg.description || `Coursework assignment for ${canonicalName}`,
    externalUrl: asg.externalUrl || 'https://tkmce.etlab.in/student/assignments',
  };
}

/**
 * Single shared function for obtaining normalized, synchronized assignment data for both Overview and Assignments pages.
 */
export async function getSynchronizedAssignments(
  session: AuthSession | null,
  forceRefresh: boolean = false
): Promise<AssignmentSyncResult> {
  const nowStr = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const cacheKey = `${session?.mode || 'live'}_${session?.username || 'anonymous'}`;
  if (!forceRefresh) {
    const cached = assignmentCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.result;
    }
  }

  // 1. Load saved assignments
  const saved = await getSavedAssignments();

  // 2. Load cohort announcements and check for any marked as assignment
  const cohortAnnouncements = await getCohortAnnouncements();
  const announcementAssignments: Assignment[] = [];
  for (const ann of cohortAnnouncements) {
    if (ann.isAssignment || ann.category === 'Assignment') {
      const existingInSaved = saved.some(
        (s) => s.announcementId === ann.id || s.id === `asg-${ann.id}`
      );
      if (!existingInSaved) {
        const dueDate = ann.deadlineDate
          ? (ann.deadlineTime ? `${ann.deadlineDate}T${ann.deadlineTime}` : ann.deadlineDate)
          : (ann.date || 'Not specified');
        announcementAssignments.push({
          id: `asg-${ann.id}`,
          title: ann.title,
          subject: ann.subject || getCourseFullName(ann.subjectCode || '', 'General Coursework'),
          subjectCode: ann.subjectCode || '24CSP304',
          faculty: ann.author || 'Admin / Faculty',
          publishDate: ann.date,
          dueDate,
          deadlineDate: ann.deadlineDate,
          deadlineTime: ann.deadlineTime,
          status: 'upcoming',
          description: ann.content,
          externalUrl: ann.link || 'https://tkmce.etlab.in/student/assignments',
          announcementId: ann.id,
        });
      }
    }
  }

  // Combine and deduplicate
  const rawList = [...saved, ...announcementAssignments, ...DEMO_ASSIGNMENTS];
  const normalized = rawList.map(normalizeAssignment);
  const deduplicated = deduplicateAssignments(normalized);

  const upcomingList = deduplicated.filter((a) => isUpcomingAssignment(a));
  const submittedCount = deduplicated.filter((a) => a.status === 'submitted').length;
  const completedCount = deduplicated.filter((a) => a.status === 'completed').length;
  const overdueCount = deduplicated.filter((a) => a.status === 'overdue').length;

  const result: AssignmentSyncResult = {
    success: true,
    assignments: deduplicated,
    upcomingAssignments: upcomingList,
    upcomingCount: upcomingList.length,
    totalCount: deduplicated.length,
    submittedCount,
    completedCount,
    overdueCount,
    source: session?.mode || 'live',
    lastSynced: nowStr,
  };

  assignmentCache.set(cacheKey, { timestamp: Date.now(), result });
  return result;
}

/**
 * Clears cached assignments for a user.
 */
export function clearAssignmentCache(session?: { mode?: string; username?: string } | null): void {
  if (!session || !session.username) {
    assignmentCache.clear();
    return;
  }
  const cacheKey = `${session.mode || 'live'}_${session.username}`;
  assignmentCache.delete(cacheKey);
}

/**
 * Completely invalidates all in-memory assignment caches.
 */
export function clearAllAssignmentCaches(): void {
  assignmentCache.clear();
}
