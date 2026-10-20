import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getSharedMaterials, updateSharedMaterial, deleteSharedMaterial } from '@/lib/materials-service';
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
  const materials = await getSharedMaterials();
  const found = materials.find((m) => m.id === id);
  if (!found) {
    return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
  }
  return NextResponse.json({ success: true, material: found });
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
      category,
      subjectCode,
      downloadUrl,
      fileType,
      semester,
      unit,
      tags,
    } = body;

    if (downloadUrl && typeof downloadUrl === 'string' && !isSafeUrl(downloadUrl) && !downloadUrl.startsWith('/api/materials/download/')) {
      return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 });
    }

    const resolvedSubject = subjectCode ? getCourseFullName(subjectCode.trim().toUpperCase()) : undefined;

    const updates = {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description.trim(), topic: description.trim() }),
      ...(category !== undefined && { category }),
      ...(subjectCode !== undefined && { subjectCode: subjectCode.trim().toUpperCase(), subject: resolvedSubject }),
      ...(downloadUrl !== undefined && { downloadUrl: downloadUrl.trim() }),
      ...(fileType !== undefined && { fileType }),
      ...(semester !== undefined && { semester }),
      ...(unit !== undefined && { unit }),
      ...(tags !== undefined && { tags }),
    };

    const result = await updateSharedMaterial(id, updates);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to update resource.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, material: result.material });
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
    const result = await deleteSharedMaterial(id, undefined, true);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to delete resource.' }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: 'Resource deleted successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
