import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import type { StudyMaterial } from '../types/index.ts';
import {
  isSupabaseConfigured,
  getSupabaseClient,
  isFilesystemStorageAvailable,
} from './supabase-client.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const METADATA_FILE = path.join(DATA_DIR, 'shared-materials.json');

export function ensureDirectories(): void {
  if (!isFilesystemStorageAvailable()) {
    return;
  }
  try {
    if (!fsSync.existsSync(DATA_DIR)) {
      fsSync.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fsSync.existsSync(UPLOADS_DIR)) {
      fsSync.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    if (!fsSync.existsSync(METADATA_FILE)) {
      fsSync.writeFileSync(METADATA_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch {
    // Gracefully ignore filesystem restrictions
  }
}

let cachedMaterials: StudyMaterial[] | null = null;
let lastMaterialsReadTime = 0;
const MATERIALS_CACHE_TTL = 30000;

export function invalidateSharedMaterialsCache(): void {
  cachedMaterials = null;
  lastMaterialsReadTime = 0;
}

// Supabase row mapper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMaterial(row: any): StudyMaterial {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    subjectCode: row.subject_code,
    faculty: row.faculty || 'Faculty',
    uploadedDate: row.uploaded_date,
    fileType: (row.file_type as StudyMaterial['fileType']) || 'pdf',
    fileSize: row.file_size || '0 KB',
    downloadUrl: row.download_url,
    topic: row.topic || '',
    category: (row.category as StudyMaterial['category']) || 'notes',
    description: row.description || '',
    uploadedBy: row.uploaded_by || 'Administrator',
    uploaderUsername: row.uploader_username || undefined,
    isShared: Boolean(row.is_shared),
    semester: row.semester != null ? Number(row.semester) : 3,
    unit: row.unit || undefined,
    tags: row.tags || undefined,
  };
}

function materialToRow(m: StudyMaterial) {
  return {
    id: m.id,
    title: m.title,
    subject: m.subject,
    subject_code: m.subjectCode,
    faculty: m.faculty || 'Faculty',
    uploaded_date: m.uploadedDate,
    file_type: m.fileType || 'pdf',
    file_size: m.fileSize || '0 KB',
    download_url: m.downloadUrl,
    topic: m.topic || null,
    category: m.category || 'notes',
    description: m.description || null,
    uploaded_by: m.uploadedBy || 'Administrator',
    uploader_username: m.uploaderUsername || null,
    is_shared: m.isShared !== false,
    semester: m.semester != null ? m.semester : 3,
    unit: m.unit || null,
    tags: m.tags || null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Retrieves all student-shared study materials, deduplicating identical uploads.
 */
export async function getSharedMaterials(): Promise<StudyMaterial[]> {
  const now = Date.now();
  if (cachedMaterials && now - lastMaterialsReadTime < MATERIALS_CACHE_TTL) {
    return cachedMaterials;
  }

  // 1. Supabase persistent backend
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('study_materials')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const mapped = data.map(rowToMaterial);
          cachedMaterials = mapped;
          lastMaterialsReadTime = now;
          return mapped;
        }
      }
    } catch {
      // Fall through
    }
  }

  // 2. Local filesystem storage (local dev / testing only)
  if (isFilesystemStorageAvailable()) {
    try {
      ensureDirectories();
      const data = await fs.readFile(METADATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        // Deduplicate shared materials using title + subjectCode + fileSize
        const seen = new Set<string>();
        const deduplicated: StudyMaterial[] = [];

        for (const item of parsed) {
          if (!item || !item.id) continue;
          const key = `${(item.title || '').trim().toLowerCase()}_${(item.subjectCode || '').trim()}_${item.fileSize || ''}`;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          deduplicated.push(item);
        }

        cachedMaterials = deduplicated;
        lastMaterialsReadTime = now;
        return deduplicated;
      }
    } catch {
      return [];
    }
  }

  return cachedMaterials || [];
}

/**
 * Saves a new shared resource to metadata store.
 */
export async function saveSharedMaterial(material: StudyMaterial): Promise<void> {
  // 1. Supabase persistent backend
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const row = materialToRow(material);
      const { error } = await supabase.from('study_materials').upsert(row);
      if (error) {
        throw new Error(`Database error saving study material: ${error.message}`);
      }
      invalidateSharedMaterialsCache();
      return;
    }
  }

  // 2. Local filesystem storage (local dev / testing only)
  if (isFilesystemStorageAvailable()) {
    ensureDirectories();
    const existing = await getSharedMaterials();
    // Filter out any duplicate of the same title & subject code to ensure cleanliness
    const filtered = existing.filter(
      (m) => !(m.title.trim().toLowerCase() === material.title.trim().toLowerCase() && m.subjectCode === material.subjectCode && m.fileSize === material.fileSize)
    );
    const updated = [material, ...filtered];
    await fs.writeFile(METADATA_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    invalidateSharedMaterialsCache();
    return;
  }

  // 3. In production serverless without database, reject cleanly without filesystem crashes
  throw new Error(
    'Persistent storage unavailable: Supabase database credentials (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) must be configured in environment variables.'
  );
}

/**
 * Updates an existing shared material's metadata while preserving original uploader attribution.
 */
export async function updateSharedMaterial(
  id: string,
  updates: Partial<StudyMaterial>
): Promise<{ success: boolean; material?: StudyMaterial; error?: string }> {
  // 1. Supabase persistent backend
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      // First fetch current record to preserve uploadedBy & uploaderUsername
      const { data: current, error: fetchErr } = await supabase
        .from('study_materials')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !current) {
        return { success: false, error: 'Resource not found.' };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
      if (updates.subjectCode !== undefined) dbUpdates.subject_code = updates.subjectCode;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.topic !== undefined) dbUpdates.topic = updates.topic;
      if (updates.semester !== undefined) dbUpdates.semester = updates.semester;
      if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.fileType !== undefined) dbUpdates.file_type = updates.fileType;
      if (updates.fileSize !== undefined) dbUpdates.file_size = updates.fileSize;
      if (updates.downloadUrl !== undefined) dbUpdates.download_url = updates.downloadUrl;

      const { data: updated, error: updateErr } = await supabase
        .from('study_materials')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (updateErr || !updated) {
        return { success: false, error: updateErr?.message || 'Failed to update resource.' };
      }
      invalidateSharedMaterialsCache();
      return { success: true, material: rowToMaterial(updated) };
    }
  }

  // 2. Local filesystem storage (local dev / testing only)
  if (isFilesystemStorageAvailable()) {
    try {
      ensureDirectories();
      const existing = await getSharedMaterials();
      const index = existing.findIndex((m) => m.id === id);
      if (index === -1) {
        return { success: false, error: 'Resource not found.' };
      }
      const current = existing[index];
      const updatedMaterial: StudyMaterial = {
        ...current,
        ...updates,
        id, // Preserve ID
        uploadedBy: current.uploadedBy, // Preserve original uploader attribution
        uploaderUsername: current.uploaderUsername,
      };
      existing[index] = updatedMaterial;
      await fs.writeFile(METADATA_FILE, JSON.stringify(existing, null, 2), 'utf-8');
      invalidateSharedMaterialsCache();
      return { success: true, material: updatedMaterial };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update resource.';
      return { success: false, error: message };
    }
  }

  return {
    success: false,
    error: 'Persistent storage unavailable: Supabase database credentials must be configured.',
  };
}

/**
 * Authorizes and deletes a student-shared resource, removing both the file and metadata.
 */
export async function deleteSharedMaterial(
  id: string,
  requesterUsername?: string,
  isAdmin: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return { success: false, error: 'Invalid resource identifier.' };
    }

    // 1. Supabase persistent backend
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: current, error: fetchErr } = await supabase
          .from('study_materials')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchErr || !current) {
          return { success: false, error: 'Resource not found.' };
        }

        if (!isAdmin) {
          if (!current.uploader_username || current.uploader_username !== requesterUsername) {
            return { success: false, error: 'Unauthorized: You can only delete resources you uploaded.' };
          }
        }

        // If stored in supabase storage, delete object
        if (current.download_url && current.download_url.includes('/storage/v1/object/public/materials/')) {
          try {
            const parts = current.download_url.split('/materials/');
            if (parts[1]) {
              await supabase.storage.from('materials').remove([decodeURIComponent(parts[1])]);
            }
          } catch {
            // Ignore storage deletion errors
          }
        }

        const { error: delErr } = await supabase.from('study_materials').delete().eq('id', id);
        if (delErr) {
          return { success: false, error: delErr.message };
        }
        invalidateSharedMaterialsCache();
        return { success: true };
      }
    }

    // 2. Local filesystem storage (local dev / testing only)
    if (isFilesystemStorageAvailable()) {
      ensureDirectories();
      const existing = await getSharedMaterials();
      const material = existing.find((m) => m.id === id);

      if (!material) {
        return { success: false, error: 'Resource not found.' };
      }

      if (!isAdmin) {
        // Verify ownership: strictly check that authenticated username matches uploader
        const isOwner = Boolean(
          material.uploaderUsername && material.uploaderUsername === requesterUsername
        );

        if (!isOwner) {
          return { success: false, error: 'Unauthorized: You can only delete resources you uploaded.' };
        }
      }

      // Delete stored file if exists with strict path boundary check
      try {
        const files = await fs.readdir(UPLOADS_DIR);
        const matchedFile = files.find((f) => f.startsWith(`${id}-`) || f === id);
        if (matchedFile) {
          const targetPath = path.resolve(UPLOADS_DIR, path.basename(matchedFile));
          if (targetPath.startsWith(path.resolve(UPLOADS_DIR) + path.sep)) {
            await fs.unlink(targetPath);
          }
        }
      } catch {
        // Ignore file deletion if already gone
      }

      // Update metadata file
      const updated = existing.filter((m) => m.id !== id);
      await fs.writeFile(METADATA_FILE, JSON.stringify(updated, null, 2), 'utf-8');
      invalidateSharedMaterialsCache();

      return { success: true };
    }

    return {
      success: false,
      error: 'Persistent storage unavailable: Supabase database credentials must be configured.',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete resource.';
    return { success: false, error: message };
  }
}

/**
 * Combines official faculty materials with shared cohort resources.
 */
export async function getCombinedMaterials(officialMaterials: StudyMaterial[]): Promise<StudyMaterial[]> {
  const shared = await getSharedMaterials();
  const taggedOfficial: StudyMaterial[] = (officialMaterials || []).map((m) => ({
    ...m,
    category: m.category || 'courseware',
    isShared: false,
  }));

  // Shared student resources listed with official courseware
  return [...shared, ...taggedOfficial];
}

export async function getSharedMaterialFile(id: string): Promise<{ material: StudyMaterial; absolutePath: string } | null> {
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return null;
  }

  if (!isFilesystemStorageAvailable()) {
    return null;
  }

  try {
    const shared = await getSharedMaterials();
    const material = shared.find((m) => m.id === id);
    if (!material) return null;

    const files = await fs.readdir(UPLOADS_DIR);
    const matchedFile = files.find((f) => f.startsWith(`${id}-`) || f === id);
    if (!matchedFile) return null;

    const absolutePath = path.resolve(UPLOADS_DIR, path.basename(matchedFile));
    if (!absolutePath.startsWith(path.resolve(UPLOADS_DIR) + path.sep)) return null;
    if (!fsSync.existsSync(absolutePath)) return null;

    return { material, absolutePath };
  } catch {
    return null;
  }
}
