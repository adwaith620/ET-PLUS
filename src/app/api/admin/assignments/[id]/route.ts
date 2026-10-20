import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getSavedAssignments, updateAssignment, deleteAssignment } from '@/lib/assignment-service';
import { getCourseFullName } from '@/lib/course-catalog';
import { isSafeUrl } from '@/lib/security';

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
  const assignments = await getSavedAssignments();
  const found = assignments.find((a) => a.id === id);
  if (!found) {
    return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  return NextResponse.json({ success: true, assignment: found });
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

    const resolvedSubject = subjectCode ? getCourseFullName(subjectCode.trim()) : undefined;

    let dueDate: string | undefined = undefined;
    if (deadlineDate) {
      dueDate = deadlineTime ? `${deadlineDate}T${deadlineTime}` : deadlineDate;
    }

    const updates = {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(subjectCode !== undefined && { subjectCode: subjectCode.trim().toUpperCase(), subject: resolvedSubject }),
      ...(faculty !== undefined && { faculty: faculty.trim() }),
      ...(deadlineDate !== undefined && { deadlineDate: deadlineDate || undefined }),
      ...(deadlineTime !== undefined && { deadlineTime: deadlineTime || undefined }),
      ...(dueDate !== undefined && { dueDate }),
      ...(submissionMode !== undefined && { submissionMode }),
      ...(maxMarks !== undefined && { maxMarks: maxMarks ? Number(maxMarks) : undefined }),
      ...(externalUrl !== undefined && { externalUrl }),
      ...(attachmentUrl !== undefined && { attachmentUrl }),
      ...(status !== undefined && { status }),
    };

    const result = await updateAssignment(id, updates);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to update assignment.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, assignment: result.assignment });
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
    const result = await deleteAssignment(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to delete assignment.' }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: 'Assignment deleted successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
