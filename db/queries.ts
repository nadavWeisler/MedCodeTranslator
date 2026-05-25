import { getDB } from './database';
import type { SchemeKey } from './database';

// Re-export shared types from @medcode/core so existing consumers keep working
export type { CodeEntry, CodeMetadata, CodeMetadataValue, ScoredEntry } from '@medcode/core';

export type CrosswalkRow = {
  icd9_code: string;
  icd10_code: string;
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
    `SELECT icd9_code, icd10_code, cardinality, is_one_to_one, is_one_to_many, is_many_to_one
     FROM icd9_to_icd10_gem
     WHERE icd9_code = ?
     ORDER BY icd10_code`,
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
    `SELECT icd9_code, icd10_code, cardinality, is_one_to_one, is_one_to_many, is_many_to_one
     FROM icd9_to_icd10_gem
     WHERE icd10_code = ?
     ORDER BY icd9_code`,
    [icd10Code]
  );
}

// Keep old helpers for backward compatibility
export const searchATC5  = (q: string, l?: string) => searchByScheme('atc5',  q, l);
export const searchICD10 = (q: string, l?: string) => searchByScheme('icd10', q, l);
