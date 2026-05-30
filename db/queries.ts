import { getDB } from './database';
import type { SchemeKey } from './database';

// Re-export shared types from @medcode/core so existing consumers keep working
export type { CodeEntry, CodeMetadata, CodeMetadataValue, ScoredEntry } from '@medcode/core';

export type CrosswalkRow = {
  icd9_code: string;
  icd10_code: string;
  target_name: string | null;
  cardinality: string;
  is_one_to_one: number;
  is_one_to_many: number;
  is_many_to_one: number;
};

export async function searchByScheme(
  scheme: SchemeKey,
  query: string,
  _lang = 'en'
): Promise<import('@medcode/core').CodeEntry[]> {
  const db = getDB();
  const q = `%${query.trim()}%`;
  return db.getAllAsync<import('@medcode/core').CodeEntry>(
    `SELECT code, name_en, name_he FROM ${scheme}
     WHERE code LIKE ? OR name_en LIKE ? OR (name_he IS NOT NULL AND name_he LIKE ?)
     ORDER BY
       CASE WHEN code LIKE ? THEN 0 ELSE 1 END,
       code
     LIMIT 100`,
    [q, q, q, q]
  );
}

/**
 * Returns ICD-10 crosswalk rows for a given ICD-9 code.
 * Source: CMS General Equivalence Mappings (GEM),
 * https://www.cms.gov/Medicare/Coding/ICD10/2018-ICD-10-CM-and-GEMs
 */
export async function getCrosswalkFromIcd9(icd9Code: string): Promise<CrosswalkRow[]> {
  const db = getDB();
  return db.getAllAsync<CrosswalkRow>(
    `SELECT gem.icd9_code, gem.icd10_code, icd10.name_en AS target_name,
            gem.cardinality, gem.is_one_to_one, gem.is_one_to_many, gem.is_many_to_one
     FROM icd9_to_icd10_gem AS gem
     LEFT JOIN icd10 ON icd10.code = gem.icd10_code
     WHERE icd9_code = ?
     ORDER BY gem.icd10_code`,
    [icd9Code]
  );
}

/**
 * Returns ICD-9 crosswalk rows for a given ICD-10 code.
 * Source: CMS General Equivalence Mappings (GEM),
 * https://www.cms.gov/Medicare/Coding/ICD10/2018-ICD-10-CM-and-GEMs
 */
export async function getCrosswalkFromIcd10(icd10Code: string): Promise<CrosswalkRow[]> {
  const db = getDB();
  return db.getAllAsync<CrosswalkRow>(
    `SELECT gem.icd9_code, gem.icd10_code, icd9.name_en AS target_name,
            gem.cardinality, gem.is_one_to_one, gem.is_one_to_many, gem.is_many_to_one
     FROM icd9_to_icd10_gem AS gem
     LEFT JOIN icd9 ON icd9.code = gem.icd9_code
     WHERE icd10_code = ?
     ORDER BY gem.icd9_code`,
    [icd10Code]
  );
}

// Keep old helpers for backward compatibility
export const searchATC5  = (q: string, l?: string) => searchByScheme('atc5',  q, l);
export const searchICD10 = (q: string, l?: string) => searchByScheme('icd10', q, l);
