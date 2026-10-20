import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getCombinedMaterials, saveSharedMaterial } from '@/lib/materials-service';
import { DEMO_MATERIALS } from '@/lib/demo-data';
import { getCourseFullName } from '@/lib/course-catalog';
import { isSafeUrl } from '@/lib/security';
import { StudyMaterial } from '@/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const materials = await getCombinedMaterials(DEMO_MATERIALS);
    return NextResponse.json({ success: true, materials });
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
      category,
      subjectCode,
      downloadUrl,
      fileType,
      fileSize,
      semester,
      unit,
      tags,
    } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Material title is required.' }, { status: 400 });
    }
    if (!subjectCode || typeof subjectCode !== 'string' || !subjectCode.trim()) {
      return NextResponse.json({ error: 'Subject code is required.' }, { status: 400 });
    }
    if (!downloadUrl || typeof downloadUrl !== 'string' || !downloadUrl.trim()) {
      return NextResponse.json({ error: 'Resource URL or file path is required.' }, { status: 400 });
    }

    if (!isSafeUrl(downloadUrl.trim()) && !downloadUrl.startsWith('/api/materials/download/')) {
      return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 });
    }

    const materialId = `mat-adm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const resolvedSubject = getCourseFullName(subjectCode.trim().toUpperCase());
    const cleanDate = new Date().toISOString().split('T')[0];

    const newMaterial: StudyMaterial = {
      id: materialId,
      title: title.trim(),
      subject: resolvedSubject,
      subjectCode: subjectCode.trim().toUpperCase(),
      faculty: 'Admin Upload',
      uploadedDate: cleanDate,
      fileType: fileType || 'pdf',
      fileSize: fileSize || 'External Link',
      downloadUrl: downloadUrl.trim(),
      topic: (description || '').trim() || (category ? `${category.replace('_', ' ')} resource` : 'Course Resource'),
      category: category || 'notes',
      description: (description || '').trim(),
      uploadedBy: 'Administrator',
      uploaderUsername: 'admin',
      isShared: true,
      semester: semester || 3,
      unit: unit || undefined,
      tags: Array.isArray(tags) ? tags : undefined,
    };

    await saveSharedMaterial(newMaterial);

    return NextResponse.json({ success: true, material: newMaterial }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
