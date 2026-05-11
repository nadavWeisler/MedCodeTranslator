import { getDB, MetadataFetchError, validateMetadataPayload } from './database';
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
  query: string
): Promise<CodeEntryWithMetadata[]> {
  const db = getDB();
  const q = `%${query.trim()}%`;
  const rows = await db.getAllAsync<CodeEntry & { metadata_json: string | null }>(
    `SELECT s.code, s.name_en, s.name_he, m.metadata_json
     FROM ${scheme} s
     LEFT JOIN code_metadata m ON m.scheme = ? AND m.code = s.code
     WHERE s.code LIKE ? OR s.name_en LIKE ? OR (s.name_he IS NOT NULL AND s.name_he LIKE ?)
     ORDER BY
       CASE WHEN s.code LIKE ? THEN 0 ELSE 1 END,
       s.code
     LIMIT 100`,
    [scheme, q, q, q, q]
  );

  return rows.map((row) => {
    if (!row.metadata_json) {
      return { code: row.code, name_en: row.name_en, name_he: row.name_he, metadata: null };
    }

    try {
      const parsed = JSON.parse(row.metadata_json) as DetailedCodeMetadata;
      return {
        code: row.code,
        name_en: row.name_en,
        name_he: row.name_he,
        metadata: validateMetadataPayload(parsed),
      };
    } catch (error) {
      if (error instanceof MetadataFetchError) throw error;
      throw new MetadataFetchError(
        'INVALID_METADATA_PAYLOAD',
        `Stored detailed metadata is invalid for ${scheme}:${row.code}.`
      );
    }
  });
}

// Keep old helpers for backward compatibility
export const searchATC5  = (q: string, l?: string) => searchByScheme('atc5',  q, l);
export const searchICD10 = (q: string, l?: string) => searchByScheme('icd10', q, l);
