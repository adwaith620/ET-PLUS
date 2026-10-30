import type { InstitutionConfig } from '../types/index.ts';

/**
 * Default Institution Configuration
 * Institution: TKM College of Engineering, Kollam, Kerala, India
 * Verified Students ETLAB Identifier: 'tkmce'
 * Verified Classic ETLAB Portal: 'tkmce.etlab.in'
 */
export const DEFAULT_INSTITUTION: InstitutionConfig = {
  id: 'tkmce',
  name: 'TKM College of Engineering, Kollam',
  shortName: 'TKMCE',
  apiBaseUrl: process.env.STUDENTS_ETLAB_API_BASE || 'https://api.students.etlab.app/api/v1',
  portalDomain: process.env.ETLAB_BASE_URL || 'https://tkmce.etlab.in',
};

/**
 * Curated list of verified ETLAB institutions with TKMCE as the top canonical default.
 */
export const SUPPORTED_INSTITUTIONS: InstitutionConfig[] = [
  DEFAULT_INSTITUTION,
  {
    id: 'gcek',
    name: 'Government College of Engineering, Kannur',
    shortName: 'GCEK',
    apiBaseUrl: 'https://api.students.etlab.app/api/v1',
    portalDomain: 'https://gcek.etlab.in',
  },
  {
    id: 'mace',
    name: 'Mar Athanasius College of Engineering, Kothamangalam',
    shortName: 'MACE',
    apiBaseUrl: 'https://api.students.etlab.app/api/v1',
    portalDomain: 'https://mace.etlab.in',
  },
  {
    id: 'rit',
    name: 'Rajiv Gandhi Institute Of Technology, Kottayam',
    shortName: 'RIT',
    apiBaseUrl: 'https://api.students.etlab.app/api/v1',
    portalDomain: 'https://rit.etlab.in',
  },
  {
    id: 'gecb',
    name: 'Government Engineering College Barton Hill, Thiruvananthapuram',
    shortName: 'GECB',
    apiBaseUrl: 'https://api.students.etlab.app/api/v1',
    portalDomain: 'https://gecb.etlab.in',
  },
];

/**
 * Returns the default institution configuration (TKMCE).
 */
export function getDefaultInstitution(): InstitutionConfig {
  return { ...DEFAULT_INSTITUTION };
}

/**
 * Resolves an institution by its ID, defaulting to TKMCE if unspecified or unrecognized.
 */
export function resolveInstitution(id?: string): InstitutionConfig {
  if (!id || typeof id !== 'string') {
    return getDefaultInstitution();
  }

  const cleanId = id.trim().toLowerCase();
  const match = SUPPORTED_INSTITUTIONS.find(
    (inst) => inst.id.toLowerCase() === cleanId || inst.shortName.toLowerCase() === cleanId
  );

  return match ? { ...match } : { ...DEFAULT_INSTITUTION, id: cleanId };
}
