import { getDB } from './database';
import type { SchemeKey } from './database';

export type CodeEntry = {
  code: string;
  name_en: string;
  name_he: string | null;
  metadata?: CodeMetadata | null;
};

export type CodeMetadataValue =
  | string
  | number
  | boolean
  | null
  | CodeMetadataValue[]
  | { [key: string]: CodeMetadataValue };

export type CodeMetadata = Record<string, CodeMetadataValue>;

export async function searchByScheme(
  scheme: SchemeKey,
  query: string,
  _lang = 'en'
): Promise<CodeEntry[]> {
  const db = getDB();
  const q = `%${query.trim()}%`;
  return db.getAllAsync<CodeEntry>(
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
