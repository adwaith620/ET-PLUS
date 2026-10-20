import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getSynchronizedAssignments, saveAssignment, getSavedAssignments } from '@/lib/assignment-service';
import { getCourseFullName } from '@/lib/course-catalog';
import { isSafeUrl } from '@/lib/security';
import { Assignment } from '@/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const sync = await getSynchronizedAssignments(null, true);
    return NextResponse.json({ success: true, assignments: sync.assignments });
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
      description,
      subjectCode,
      faculty,
      deadlineDate,
      deadlineTime,
      submissionMode,
      maxMarks,
      externalUrl,
      attachmentUrl,
      status,
    } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Assignment title is required.' }, { status: 400 });
    }
    if (!subjectCode || typeof subjectCode !== 'string' || !subjectCode.trim()) {
      return NextResponse.json({ error: 'Subject code is required.' }, { status: 400 });
    }

    if (externalUrl && typeof externalUrl !== 'string' && !isSafeUrl(externalUrl)) {
      return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 });
    }

    const formattedPublishDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const assignmentId = `asg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const resolvedSubject = getCourseFullName(subjectCode.trim());

    const dueDate = deadlineDate
      ? (deadlineTime ? `${deadlineDate}T${deadlineTime}` : deadlineDate)
      : formattedPublishDate;

    const newAssignment: Assignment = {
      id: assignmentId,
      title: title.trim(),
      description: (description || '').trim(),
      subject: resolvedSubject,
      subjectCode: subjectCode.trim().toUpperCase(),
      faculty: (faculty || 'Administrator').trim(),
      publishDate: formattedPublishDate,
      dueDate,
      deadlineDate: deadlineDate || undefined,
      deadlineTime: deadlineTime || undefined,
      status: status || 'upcoming',
      submissionMode: submissionMode || 'Online',
      maxMarks: maxMarks ? Number(maxMarks) : undefined,
      externalUrl: externalUrl || 'https://tkmce.etlab.in/student/assignments',
      attachmentUrl: attachmentUrl || undefined,
    };

    await saveAssignment(newAssignment);

    return NextResponse.json({ success: true, assignment: newAssignment }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
