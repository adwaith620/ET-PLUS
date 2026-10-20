import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { ensureDirectories } from '@/lib/materials-service';
import { sanitizeFilename, validateFileBuffer } from '@/lib/security';
import {
  isSupabaseConfigured,
  getSupabaseClient,
  isFilesystemStorageAvailable,
} from '@/lib/supabase-client';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for admin uploads
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip', '.txt'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds maximum limit of 50MB.' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Uploaded file cannot be empty.' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file format. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate magic bytes
    const contentValidation = validateFileBuffer(buffer, ext);
    if (!contentValidation.valid) {
      return NextResponse.json({ error: contentValidation.error || 'Invalid file content.' }, { status: 400 });
    }

    const id = `mat-file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const sanitizedOriginalName = sanitizeFilename(file.name);
    const storedFileName = `${id}-${sanitizedOriginalName}`;

    // 1. Supabase Storage (Persistent)
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error: uploadError } = await supabase.storage
          .from('materials')
          .upload(storedFileName, buffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: true,
          });

        if (uploadError) {
          return NextResponse.json(
            { error: `Storage upload failed: ${uploadError.message}` },
            { status: 500 }
          );
        }

        const { data: urlData } = supabase.storage
          .from('materials')
          .getPublicUrl(storedFileName);

        return NextResponse.json({
          success: true,
          fileId: id,
          fileName: sanitizedOriginalName,
          fileSize: formatFileSize(file.size),
          fileType: ext.replace('.', ''),
          downloadUrl: urlData.publicUrl,
        });
      }
    }

    // 2. Local filesystem storage (local dev / testing only)
    if (isFilesystemStorageAvailable()) {
      ensureDirectories();
      const uploadsDir = path.resolve(process.cwd(), 'data', 'uploads');
      const destinationPath = path.resolve(uploadsDir, storedFileName);

      if (!destinationPath.startsWith(uploadsDir + path.sep)) {
        return NextResponse.json({ error: 'Invalid file destination path.' }, { status: 400 });
      }

      await fs.writeFile(destinationPath, buffer);

      return NextResponse.json({
        success: true,
        fileId: id,
        fileName: sanitizedOriginalName,
        fileSize: formatFileSize(file.size),
        fileType: ext.replace('.', ''),
        downloadUrl: `/api/materials/download/${id}`,
      });
    }

    return NextResponse.json(
      {
        error:
          'Persistent file storage is not configured. Please configure Supabase storage in project settings.',
      },
      { status: 503 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
