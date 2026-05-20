import { getDB } from './database';
import type { SchemeKey } from './database';

// Re-export shared types from @medcode/core so existing consumers keep working
export type { CodeEntry, CodeMetadata, CodeMetadataValue, ScoredEntry } from '@medcode/core';

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

// Keep old helpers for backward compatibility
export const searchATC5  = (q: string, l?: string) => searchByScheme('atc5',  q, l);
export const searchICD10 = (q: string, l?: string) => searchByScheme('icd10', q, l);
