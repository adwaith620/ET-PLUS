import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getCombinedAnnouncements, saveCohortAnnouncement } from '@/lib/announcements-service';
import { saveAssignment } from '@/lib/assignment-service';
import { DEMO_ANNOUNCEMENTS } from '@/lib/demo-data';
import { getCourseFullName } from '@/lib/course-catalog';
import { isSafeUrl } from '@/lib/security';
import { Announcement, Assignment } from '@/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const announcements = await getCombinedAnnouncements(DEMO_ANNOUNCEMENTS);
    return NextResponse.json({ success: true, announcements });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
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

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Announcement title is required.' }, { status: 400 });
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Announcement content is required.' }, { status: 400 });
    }

    if (link && typeof link === 'string' && link.trim() && !isSafeUrl(link.trim())) {
      return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 });
    }

    const formattedDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const announcementId = `ann-adm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const resolvedSubject = subjectCode ? getCourseFullName(subjectCode) : undefined;

    const newAnnouncement: Announcement = {
      id: announcementId,
      title: title.trim(),
      content: content.trim(),
      category: category || 'Academic',
      date: formattedDate,
      author: 'Administrator',
      authorUsername: 'admin',
      pinned: Boolean(pinned),
      link: link && link.trim() ? link.trim() : undefined,
      isCohortShared: true,
      cohort: 'All Cohorts',
      isAssignment: Boolean(isAssignment),
      deadlineDate: deadlineDate || undefined,
      deadlineTime: deadlineTime || undefined,
      subjectCode: subjectCode || undefined,
      subject: resolvedSubject,
      status: status || 'published',
    };

    await saveCohortAnnouncement(newAnnouncement);

    // If marked as assignment, create corresponding assignment
    if (isAssignment) {
      const assignmentDueDate = deadlineDate
        ? (deadlineTime ? `${deadlineDate}T${deadlineTime}` : deadlineDate)
        : formattedDate;

      const newAssignment: Assignment = {
        id: `asg-${announcementId}`,
        title: title.trim(),
        subject: resolvedSubject || 'General Academic Coursework',
        subjectCode: subjectCode || '24CSP304',
        faculty: 'Administrator',
        publishDate: formattedDate,
        dueDate: assignmentDueDate,
        deadlineDate: deadlineDate || undefined,
        deadlineTime: deadlineTime || undefined,
        status: 'upcoming',
        description: content.trim(),
        externalUrl: link || 'https://tkmce.etlab.in/student/assignments',
        announcementId,
      };

      await saveAssignment(newAssignment);
    }

    return NextResponse.json({ success: true, announcement: newAnnouncement }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
