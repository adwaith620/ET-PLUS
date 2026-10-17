import type { Assignment } from '../types/index.ts';

/**
 * Parses an assignment deadline string into a Date object in IST timezone (+05:30).
 * If only YYYY-MM-DD is given, sets deadline to 23:59:59 IST on that day.
 */
export function parseDeadline(dateStr: string): Date {
  if (!dateStr) return new Date();

  const trimmed = dateStr.trim();

  // If already contains time
  if (trimmed.includes('T') || trimmed.includes(':')) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  // If date-only format (YYYY-MM-DD)
  const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    // 23:59:59 at end of that calendar day in local context
    return new Date(year, month, day, 23, 59, 59, 999);
  }

  // Fallback
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export interface DeadlineCountdown {
  text: string;
  isPast: boolean;
  diffMs: number;
  diffHours: number;
  diffDays: number;
}

/**
 * Calculates a live countdown string for an upcoming assignment deadline.
 * Examples: 'Due in 2 days', 'Due in 5 hours', 'Due in 45 minutes'.
 */
export function getDeadlineCountdown(dueDateStr: string, referenceDate: Date = new Date()): DeadlineCountdown {
  const deadline = parseDeadline(dueDateStr);
  const diffMs = deadline.getTime() - referenceDate.getTime();

  if (diffMs <= 0) {
    return {
      text: 'Deadline passed',
      isPast: true,
      diffMs,
      diffHours: 0,
      diffDays: 0,
    };
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  let text: string;
  if (diffDays >= 2) {
    text = `Due in ${diffDays} days`;
  } else if (diffDays === 1 && diffHours >= 20) {
    text = 'Due in 1 day';
  } else if (diffHours >= 2) {
    text = `Due in ${diffHours} hours`;
  } else if (diffHours === 1) {
    text = 'Due in 1 hour';
  } else if (diffMinutes >= 2) {
    text = `Due in ${diffMinutes} minutes`;
  } else {
    text = 'Due in less than a minute';
  }

  return {
    text,
    isPast: false,
    diffMs,
    diffHours,
    diffDays,
  };
}

/**
 * Determines whether an assignment is genuinely upcoming (deadline in future and not yet submitted/completed).
 */
export function isUpcomingAssignment(asg: Assignment, referenceDate: Date = new Date()): boolean {
  if (asg.status === 'submitted' || asg.status === 'completed' || asg.status === 'graded') {
    return false;
  }
  const deadline = parseDeadline(asg.dueDate);
  return deadline.getTime() > referenceDate.getTime();
}

/**
 * Resolves the precise status of an assignment without conflating upcoming, submitted, overdue, and completed.
 */
export function getAssignmentEffectiveStatus(
  asg: Assignment,
  referenceDate: Date = new Date()
): 'upcoming' | 'submitted' | 'completed' | 'overdue' {
  if (asg.status === 'submitted') return 'submitted';
  if (asg.status === 'completed' || asg.status === 'graded') return 'completed';

  const deadline = parseDeadline(asg.dueDate);
  if (deadline.getTime() <= referenceDate.getTime()) {
    return 'overdue';
  }
  return 'upcoming';
}
