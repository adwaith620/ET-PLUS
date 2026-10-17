import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { NotificationItem, SubjectAttendance, Assignment, Announcement, StudyMaterial } from '@/types';
import { isUpcomingAssignment, getDeadlineCountdown } from './assignment-utils';

const DATA_DIR = path.join(process.cwd(), 'data');
const READ_NOTIFS_FILE = path.join(DATA_DIR, 'read-notifications.json');

export function ensureNotificationsDirectory() {
  if (!fsSync.existsSync(DATA_DIR)) {
    fsSync.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fsSync.existsSync(READ_NOTIFS_FILE)) {
    fsSync.writeFileSync(READ_NOTIFS_FILE, JSON.stringify({}, null, 2), 'utf-8');
  }
}

let cachedReadNotifs: Record<string, string[]> | null = null;
let lastReadNotifsReadTime = 0;
const READ_NOTIFS_CACHE_TTL = 30000;

export function invalidateReadNotificationsCache(): void {
  cachedReadNotifs = null;
  lastReadNotifsReadTime = 0;
}

/**
 * Returns read notification IDs for a specific user.
 */
export async function getReadNotificationIds(username: string): Promise<string[]> {
  const now = Date.now();
  if (cachedReadNotifs && now - lastReadNotifsReadTime < READ_NOTIFS_CACHE_TTL) {
    return cachedReadNotifs[username] || [];
  }

  try {
    ensureNotificationsDirectory();
    const data = await fs.readFile(READ_NOTIFS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    cachedReadNotifs = parsed && typeof parsed === 'object' ? parsed : {};
    lastReadNotifsReadTime = now;
    if (parsed && Array.isArray(parsed[username])) {
      return parsed[username];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Marks notification IDs as read for a specific user.
 */
export async function markNotificationsAsRead(username: string, ids: string[]): Promise<void> {
  try {
    ensureNotificationsDirectory();
    let currentMap: Record<string, string[]> = {};
    try {
      const data = await fs.readFile(READ_NOTIFS_FILE, 'utf-8');
      currentMap = JSON.parse(data) || {};
    } catch {
      currentMap = {};
    }

    const userReads = new Set<string>(currentMap[username] || []);
    for (const id of ids) {
      if (id) userReads.add(id);
    }
    currentMap[username] = Array.from(userReads);

    await fs.writeFile(READ_NOTIFS_FILE, JSON.stringify(currentMap, null, 2), 'utf-8');
    cachedReadNotifs = currentMap;
    lastReadNotifsReadTime = Date.now();
  } catch (err) {
    console.error('Failed to save read notifications state:', err);
  }
}

export interface DynamicNotificationParams {
  username: string;
  subjects?: SubjectAttendance[];
  assignments?: Assignment[];
  cohortAnnouncements?: Announcement[];
  sharedMaterials?: StudyMaterial[];
  targetPercentage?: number;
}

/**
 * Dynamically generates real notification events derived strictly from:
 * 1. Attendance shortages below target percentage
 * 2. Upcoming assignment deadlines within 7 days
 * 3. Recent collaborative cohort announcements
 * 4. Shared cohort study materials
 */
export async function generateDynamicNotifications(
  params: DynamicNotificationParams
): Promise<NotificationItem[]> {
  const {
    username,
    subjects = [],
    assignments = [],
    cohortAnnouncements = [],
    sharedMaterials = [],
    targetPercentage = 75,
  } = params;

  const readIds = new Set(await getReadNotificationIds(username));
  const notifications: NotificationItem[] = [];

  // 1. Attendance Shortage Notifications
  for (const sub of subjects) {
    if (sub.percentage < targetPercentage) {
      const id = `notif-att-${sub.code}`;
      const needed = sub.classesToRecover > 0 ? sub.classesToRecover : 1;
      notifications.push({
        id,
        type: 'attendance',
        title: `Attendance Shortage: ${sub.code}`,
        message: `${sub.name} is at ${sub.percentage}%, below your target of ${targetPercentage}%. Attend next ${needed} class(es) to recover.`,
        timestamp: 'Current Academic Term',
        read: readIds.has(id),
        link: '/dashboard/attendance',
        isSystemWarning: true,
      });
    }
  }

  // 2. Upcoming Assignment Deadlines within 7 days
  for (const asg of assignments) {
    if (isUpcomingAssignment(asg)) {
      const countdown = getDeadlineCountdown(asg.dueDate);
      if (countdown.diffDays <= 7 && !countdown.isPast) {
        const id = `notif-asg-${asg.id}`;
        notifications.push({
          id,
          type: 'assignment',
          title: `Upcoming Deadline: ${asg.subjectCode}`,
          message: `${asg.title} (${asg.submissionMode || 'Submission'}) is due on ${asg.dueDate}. ${countdown.text}.`,
          timestamp: countdown.text,
          read: readIds.has(id),
          link: '/dashboard/assignments',
          isSystemWarning: countdown.diffHours <= 24,
        });
      }
    }
  }

  // 3. Cohort Announcements
  for (const ann of cohortAnnouncements.slice(0, 5)) {
    const id = `notif-ann-${ann.id}`;
    notifications.push({
      id,
      type: 'announcement',
      title: ann.isCohortShared ? `[Cohort R3AI] ${ann.title}` : ann.title,
      message: ann.content.length > 95 ? `${ann.content.substring(0, 95)}...` : ann.content,
      timestamp: ann.date,
      read: readIds.has(id),
      link: '/dashboard/announcements',
    });
  }

  // 4. Shared Study Materials
  for (const mat of sharedMaterials.slice(0, 4)) {
    const id = `notif-mat-${mat.id}`;
    notifications.push({
      id,
      type: 'material',
      title: `Shared Material: ${mat.subjectCode}`,
      message: `${mat.title} was shared by ${mat.uploadedBy || 'student'}.`,
      timestamp: mat.uploadedDate,
      read: readIds.has(id),
      link: '/dashboard/materials',
    });
  }

  return notifications;
}
