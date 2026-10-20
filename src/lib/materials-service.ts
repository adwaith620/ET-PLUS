import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import type { StudyMaterial } from '../types/index.ts';

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

let cachedMaterials: StudyMaterial[] | null = null;
let lastMaterialsReadTime = 0;
const MATERIALS_CACHE_TTL = 30000;

export function invalidateSharedMaterialsCache(): void {
  cachedMaterials = null;
  lastMaterialsReadTime = 0;
}

/**
 * Retrieves all student-shared study materials, deduplicating identical uploads.
 */
export async function getSharedMaterials(): Promise<StudyMaterial[]> {
  const now = Date.now();
  if (cachedMaterials && now - lastMaterialsReadTime < MATERIALS_CACHE_TTL) {
    return cachedMaterials;
  }

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

    cachedMaterials = deduplicated;
    lastMaterialsReadTime = now;
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
  invalidateSharedMaterialsCache();
}

/**
 * Updates an existing shared material's metadata while preserving original uploader attribution.
 */
export async function updateSharedMaterial(
  id: string,
  updates: Partial<StudyMaterial>
): Promise<{ success: boolean; material?: StudyMaterial; error?: string }> {
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
}
