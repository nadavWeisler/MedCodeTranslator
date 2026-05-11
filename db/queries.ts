import { fetchDetailedMetadata, getDB, MetadataFetchError } from './database';
import type { DetailedCodeMetadata, SchemeKey } from './database';

export type CodeEntry = {
  code: string;
  name_en: string;
  name_he: string | null;
};

export type CodeEntryWithMetadata = CodeEntry & {
  metadata: DetailedCodeMetadata | null;
};

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

export async function searchBySchemeWithMetadata(
  scheme: SchemeKey,
  query: string,
  lang = 'en'
): Promise<CodeEntryWithMetadata[]> {
  const base = await searchByScheme(scheme, query, lang);
  return Promise.all(
    base.map(async (entry) => {
      try {
        const { metadata } = await fetchDetailedMetadata({ scheme, code: entry.code });
        return { ...entry, metadata };
      } catch (error) {
        if (error instanceof MetadataFetchError && error.code === 'METADATA_NOT_FOUND') {
          return { ...entry, metadata: null };
        }
        throw error;
      }
    })
  );
}

// Keep old helpers for backward compatibility
export const searchATC5  = (q: string, l?: string) => searchByScheme('atc5',  q, l);
export const searchICD10 = (q: string, l?: string) => searchByScheme('icd10', q, l);
