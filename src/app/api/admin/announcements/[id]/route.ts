import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import {
  getCohortAnnouncements,
  updateCohortAnnouncement,
  deleteCohortAnnouncement,
} from '@/lib/announcements-service';
import { deleteAssignment, saveAssignment, getSavedAssignments } from '@/lib/assignment-service';
import { getCourseFullName } from '@/lib/course-catalog';
import { isSafeUrl } from '@/lib/security';
import { Assignment } from '@/types';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const announcements = await getCohortAnnouncements();
  const found = announcements.find((a) => a.id === id);
  if (!found) {
    return NextResponse.json({ error: 'Announcement not found.' }, { status: 404 });
  }
  return NextResponse.json({ success: true, announcement: found });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const {
      title,
      content,
      category,
      pinned,
      link,
      subjectCode,
      deadlineDate,
      deadlineTime,
      isAssignment,
      status,
    } = body;

    if (link && typeof link === 'string' && link.trim() && !isSafeUrl(link.trim())) {
      return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 });
    }

    const resolvedSubject = subjectCode ? getCourseFullName(subjectCode) : undefined;

    const updates = {
      ...(title !== undefined && { title: title.trim() }),
      ...(content !== undefined && { content: content.trim() }),
      ...(category !== undefined && { category }),
      ...(pinned !== undefined && { pinned: Boolean(pinned) }),
      ...(link !== undefined && { link: link ? link.trim() : undefined }),
      ...(subjectCode !== undefined && { subjectCode, subject: resolvedSubject }),
      ...(deadlineDate !== undefined && { deadlineDate: deadlineDate || undefined }),
      ...(deadlineTime !== undefined && { deadlineTime: deadlineTime || undefined }),
      ...(isAssignment !== undefined && { isAssignment: Boolean(isAssignment) }),
      ...(status !== undefined && { status }),
    };

    const result = await updateCohortAnnouncement(id, updates);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to update announcement.' }, { status: 400 });
    }

    // Sync corresponding assignment
    const savedAssignments = await getSavedAssignments();
    const existingAsg = savedAssignments.find((a) => a.announcementId === id || a.id === `asg-${id}`);

    if (isAssignment) {
      const assignmentDueDate = deadlineDate
        ? (deadlineTime ? `${deadlineDate}T${deadlineTime}` : deadlineDate)
        : (result.announcement?.date || 'Not specified');

      const syncedAsg: Assignment = {
        id: existingAsg ? existingAsg.id : `asg-${id}`,
        title: title ? title.trim() : (result.announcement?.title || 'Assignment'),
        subject: resolvedSubject || existingAsg?.subject || 'General Academic Coursework',
        subjectCode: subjectCode || existingAsg?.subjectCode || '24CSP304',
        faculty: existingAsg?.faculty || 'Administrator',
        publishDate: existingAsg?.publishDate || result.announcement?.date || 'Today',
        dueDate: assignmentDueDate,
        deadlineDate: deadlineDate || undefined,
        deadlineTime: deadlineTime || undefined,
        status: existingAsg?.status || 'upcoming',
        description: content ? content.trim() : (result.announcement?.content || ''),
        externalUrl: link || existingAsg?.externalUrl || 'https://tkmce.etlab.in/student/assignments',
        announcementId: id,
      };

      await saveAssignment(syncedAsg);
    } else if (existingAsg) {
      // If assignment flag was disabled, remove linked assignment
      await deleteAssignment(existingAsg.id);
    }

    return NextResponse.json({ success: true, announcement: result.announcement });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const result = await deleteCohortAnnouncement(id, undefined, true);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to delete announcement.' }, { status: 400 });
    }

    // Also delete any linked assignment
    const savedAssignments = await getSavedAssignments();
    const linkedAsg = savedAssignments.find((a) => a.announcementId === id || a.id === `asg-${id}`);
    if (linkedAsg) {
      await deleteAssignment(linkedAsg.id);
    }

    return NextResponse.json({ success: true, message: 'Announcement deleted successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
