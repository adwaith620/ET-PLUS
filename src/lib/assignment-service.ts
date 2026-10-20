import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import type { Assignment, AuthSession } from '../types/index.ts';
import { etlabFetchAssignments } from './etlab-client.ts';
import { getCourseFullName, SEMESTER_3_COURSES } from './course-catalog.ts';
import { getAssignmentEffectiveStatus, isUpcomingAssignment, parseDeadline } from './assignment-utils.ts';
import { DEMO_ASSIGNMENTS } from './demo-data.ts';
import { getCohortAnnouncements } from './announcements-service.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const ASSIGNMENTS_FILE = path.join(DATA_DIR, 'assignments.json');

export function ensureAssignmentsDirectory() {
  if (!fsSync.existsSync(DATA_DIR)) {
    fsSync.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fsSync.existsSync(ASSIGNMENTS_FILE)) {
    fsSync.writeFileSync(ASSIGNMENTS_FILE, JSON.stringify([], null, 2), 'utf-8');
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

/**
 * Retrieves all saved assignments from data/assignments.json.
 */
export async function getSavedAssignments(): Promise<Assignment[]> {
  const now = Date.now();
  if (cachedAssignmentsList && now - lastAssignmentsReadTime < ASSIGNMENTS_FILE_CACHE_TTL) {
    return cachedAssignmentsList;
  }

  try {
    ensureAssignmentsDirectory();
    const data = await fs.readFile(ASSIGNMENTS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    cachedAssignmentsList = parsed;
    lastAssignmentsReadTime = now;
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Saves a new or updated assignment to data/assignments.json.
 */
export async function saveAssignment(asg: Assignment): Promise<void> {
  ensureAssignmentsDirectory();
  const existing = await getSavedAssignments();
  const filtered = existing.filter((a) => a.id !== asg.id);
  const updated = [asg, ...filtered];
  await fs.writeFile(ASSIGNMENTS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  invalidateAssignmentsFileCache();
}

/**
 * Updates an existing assignment in data/assignments.json.
 */
export async function updateAssignment(
  id: string,
  updates: Partial<Assignment>
): Promise<{ success: boolean; assignment?: Assignment; error?: string }> {
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

/**
 * Deletes an assignment by ID.
 */
export async function deleteAssignment(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return { success: false, error: 'Invalid assignment identifier.' };
    }
    ensureAssignmentsDirectory();
    const existing = await getSavedAssignments();
    const updated = existing.filter((a) => a.id !== id);
    await fs.writeFile(ASSIGNMENTS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    invalidateAssignmentsFileCache();
    return { success: true };
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
 * Known fabricated assignment IDs and titles permanently excluded from the system.
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

  // 1. Load saved assignments from data/assignments.json
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
export function clearAssignmentCache(session?: { mode?: string; username?: string } | null) {
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

