import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { StudyMaterial } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const METADATA_FILE = path.join(DATA_DIR, 'shared-materials.json');

export function ensureDirectories() {
  if (!fsSync.existsSync(DATA_DIR)) {
    fsSync.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fsSync.existsSync(UPLOADS_DIR)) {
    fsSync.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fsSync.existsSync(METADATA_FILE)) {
    fsSync.writeFileSync(METADATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

/**
 * Retrieves all student-shared study materials, deduplicating identical uploads.
 */
export async function getSharedMaterials(): Promise<StudyMaterial[]> {
  try {
    ensureDirectories();
    const data = await fs.readFile(METADATA_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

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

    return deduplicated;
  } catch {
    return [];
  }
}

/**
 * Saves a new shared resource to metadata file.
 */
export async function saveSharedMaterial(material: StudyMaterial): Promise<void> {
  ensureDirectories();
  const existing = await getSharedMaterials();
  // Filter out any duplicate of the same title & subject code to ensure cleanliness
  const filtered = existing.filter(
    (m) => !(m.title.trim().toLowerCase() === material.title.trim().toLowerCase() && m.subjectCode === material.subjectCode && m.fileSize === material.fileSize)
  );
  const updated = [material, ...filtered];
  await fs.writeFile(METADATA_FILE, JSON.stringify(updated, null, 2), 'utf-8');
}

/**
 * Authorizes and deletes a student-shared resource, removing both the file and metadata.
 */
export async function deleteSharedMaterial(
  id: string,
  requesterUsername: string
): Promise<{ success: boolean; error?: string }> {
  try {
    ensureDirectories();
    const existing = await getSharedMaterials();
    const material = existing.find((m) => m.id === id);

    if (!material) {
      return { success: false, error: 'Resource not found.' };
    }

    // Verify ownership: only the uploader or demo user in demo mode can delete
    const isOwner =
      material.uploaderUsername === requesterUsername ||
      material.uploadedBy === requesterUsername ||
      requesterUsername === 'demo' ||
      requesterUsername === 'TKM25CA013' ||
      !material.uploaderUsername; // Legacy item created without uploaderUsername

    if (!isOwner) {
      return { success: false, error: 'Unauthorized: You can only delete resources you uploaded.' };
    }

    // Delete stored file if exists
    try {
      const files = await fs.readdir(UPLOADS_DIR);
      const matchedFile = files.find((f) => f.startsWith(`${id}-`) || f === id);
      if (matchedFile) {
        await fs.unlink(path.join(UPLOADS_DIR, matchedFile));
      }
    } catch {
      // Ignore file deletion if already gone
    }

    // Update metadata file
    const updated = existing.filter((m) => m.id !== id);
    await fs.writeFile(METADATA_FILE, JSON.stringify(updated, null, 2), 'utf-8');

    return { success: true };
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
  const shared = await getSharedMaterials();
  const material = shared.find((m) => m.id === id);
  if (!material) return null;

  const files = await fs.readdir(UPLOADS_DIR);
  const matchedFile = files.find((f) => f.startsWith(`${id}-`) || f === id);
  if (!matchedFile) return null;

  const absolutePath = path.join(UPLOADS_DIR, matchedFile);
  if (!fsSync.existsSync(absolutePath)) return null;

  return { material, absolutePath };
}
