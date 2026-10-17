import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getSession } from '@/lib/auth';
import { getCourseFullName, SEMESTER_3_COURSES } from '@/lib/course-catalog';
import { saveSharedMaterial, ensureDirectories } from '@/lib/materials-service';
import { StudyMaterial } from '@/types';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Student login session required' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string || '').trim();
    const description = (formData.get('description') as string || '').trim();
    const category = (formData.get('category') as string || 'notes') as 'pyq' | 'notes';
    const subjectCode = (formData.get('subjectCode') as string || '').trim();

    if (!file || !title || !subjectCode) {
      return NextResponse.json(
        { error: 'Missing required fields: file, title, and subject code are mandatory.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds maximum limit of 25MB.' },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type. Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    ensureDirectories();

    const id = `mat-shared-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFileName = `${id}-${sanitizedOriginalName}`;
    const destinationPath = path.join(process.cwd(), 'data', 'uploads', storedFileName);

    // Save buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(destinationPath, buffer);

    const subjectName = getCourseFullName(subjectCode, subjectCode);
    const uploaderName = session.displayName || session.username || 'Adwaith Krishna M H';
    const cleanExt = ext.replace('.', '');

    const newMaterial: StudyMaterial = {
      id,
      title,
      subject: subjectName,
      subjectCode,
      faculty: `Uploaded by ${uploaderName}`,
      uploadedDate: new Date().toISOString().split('T')[0],
      fileType: cleanExt as 'pdf' | 'ppt' | 'doc',
      fileSize: formatFileSize(file.size),
      downloadUrl: `/api/materials/download/${id}`,
      topic: description || (category === 'pyq' ? 'Previous Year Questions' : 'Student Study Notes'),
      category,
      description,
      uploadedBy: uploaderName,
      uploaderUsername: session.username,
      isShared: true,
    };

    await saveSharedMaterial(newMaterial);

    return NextResponse.json({ success: true, material: newMaterial }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
