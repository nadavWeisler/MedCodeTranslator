import { getDB, ensureSchemeSeeded } from './database';
import type { SchemeKey } from './database';
import type { CodeConversion, CodeEntry } from '@medcode/core';

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

export type SchemeMappingRow = {
  source_scheme: SchemeKey;
  target_scheme: SchemeKey;
  source_code: string;
  target_code: string;
  target_name: string | null;
  is_common: number;
  mapping_source: string;
};

const ATC_LEVEL_LENGTHS: Partial<Record<SchemeKey, number>> = {
  atc1: 1,
  atc2: 3,
  atc3: 4,
  atc4: 5,
  atc5: 7,
};

/** Target schemes to surface conversions for, per active scheme. */
export const CONVERSION_TARGETS: Partial<Record<SchemeKey, SchemeKey[]>> = {
  icd9: ['icd10'],
  icd10: ['icd9', 'icd11'],
  icd11: ['icd10'],
  atc1: ['atc2'],
  atc2: ['atc1', 'atc3'],
  atc3: ['atc2', 'atc4'],
  atc4: ['atc3', 'atc5'],
  atc5: ['atc4', 'atc3', 'atc2', 'atc1'],
};

/** Normalize undotted ICD-9 codes (e.g. 25000 → 250.00) for GEM lookups. */
export function normalizeIcd9Code(code: string): string {
  const trimmed = code.trim();
  if (trimmed.includes('.')) return trimmed;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length === 4) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

/** Build lookup variants for ICD-9 (dotted, undotted, normalized). */
export function icd9LookupVariants(code: string): string[] {
  const variants = new Set<string>();
  const trimmed = code.trim();
  variants.add(trimmed);
  variants.add(normalizeIcd9Code(trimmed));
  variants.add(trimmed.replace(/\./g, ''));
  return [...variants];
}

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

export async function getEntryByCode(
  scheme: SchemeKey,
  code: string
): Promise<CodeEntry | null> {
  await ensureSchemeSeeded(scheme);
  const db = getDB();
  const row = await db.getFirstAsync<CodeEntry>(
    `SELECT code, name_en, name_he FROM ${scheme} WHERE code = ?`,
    [code]
  );
  return row ?? null;
}

/**
 * Returns ICD-10 crosswalk rows for a given ICD-9 code.
 * Source: CMS General Equivalence Mappings (GEM),
 * https://www.cms.gov/Medicare/Coding/ICD10/2018-ICD-10-CM-and-GEMs
 */
export async function getCrosswalkFromIcd9(icd9Code: string): Promise<CrosswalkRow[]> {
  const db = getDB();
  const variants = icd9LookupVariants(icd9Code);
  const placeholders = variants.map(() => '?').join(', ');
  return db.getAllAsync<CrosswalkRow>(
    `SELECT gem.icd9_code, gem.icd10_code, icd10.name_en AS target_name,
            gem.cardinality, gem.is_one_to_one, gem.is_one_to_many, gem.is_many_to_one
     FROM icd9_to_icd10_gem AS gem
     LEFT JOIN icd10 ON icd10.code = gem.icd10_code
     WHERE gem.icd9_code IN (${placeholders})
     ORDER BY gem.is_one_to_one DESC, gem.icd10_code`,
    variants
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
     ORDER BY gem.is_one_to_one DESC, gem.icd9_code`,
    [icd10Code]
  );
}

function getAtcHierarchyConversions(
  scheme: SchemeKey,
  code: string
): Omit<CodeConversion, 'targetName'>[] {
  const currentLen = ATC_LEVEL_LENGTHS[scheme];
  if (!currentLen) return [];

  const conversions: Omit<CodeConversion, 'targetName'>[] = [];
  const parents: { targetScheme: SchemeKey; len: number }[] = [];

  for (const [targetScheme, len] of Object.entries(ATC_LEVEL_LENGTHS) as [SchemeKey, number][]) {
    if (targetScheme === scheme) continue;
    if (len >= currentLen) continue;
    if (code.length < len) continue;
    parents.push({ targetScheme, len });
  }

  parents.sort((a, b) => b.len - a.len);

  for (const [index, parent] of parents.entries()) {
    conversions.push({
      sourceScheme: scheme,
      targetScheme: parent.targetScheme,
      sourceCode: code,
      targetCode: code.slice(0, parent.len),
      isCommon: index < 3,
      mappingSource: 'ATC hierarchy',
      relation: 'hierarchy',
    });
  }

  return conversions;
}

async function crosswalkToConversions(
  scheme: 'icd9' | 'icd10',
  code: string
): Promise<CodeConversion[]> {
  const rows =
    scheme === 'icd9'
      ? await getCrosswalkFromIcd9(code)
      : await getCrosswalkFromIcd10(code);

  const targetScheme = scheme === 'icd9' ? 'icd10' : 'icd9';

  return rows.map(row => ({
    sourceScheme: scheme,
    targetScheme,
    sourceCode: code,
    targetCode: scheme === 'icd9' ? row.icd10_code : row.icd9_code,
    targetName: row.target_name,
    isCommon: row.is_one_to_one === 1,
    cardinality: row.cardinality,
    mappingSource: 'CMS GEM',
    relation: 'crosswalk' as const,
  }));
}

async function curatedMappingsToConversions(
  scheme: SchemeKey,
  code: string,
  targetScheme: SchemeKey
): Promise<CodeConversion[]> {
  await ensureSchemeSeeded(targetScheme);
  const db = getDB();
  const rows = await db.getAllAsync<SchemeMappingRow>(
    `SELECT m.source_scheme, m.target_scheme, m.source_code, m.target_code,
            t.name_en AS target_name, m.is_common, m.mapping_source
     FROM scheme_mappings AS m
     LEFT JOIN ${targetScheme} AS t ON t.code = m.target_code
     WHERE m.source_scheme = ? AND m.source_code = ? AND m.target_scheme = ?
     ORDER BY m.is_common DESC, m.target_code`,
    [scheme, code, targetScheme]
  );

  return rows.map(row => ({
    sourceScheme: row.source_scheme,
    targetScheme: row.target_scheme,
    sourceCode: row.source_code,
    targetCode: row.target_code,
    targetName: row.target_name,
    isCommon: row.is_common === 1,
    mappingSource: row.mapping_source,
    relation: 'mapping' as const,
  }));
}

async function atcHierarchyWithNames(
  scheme: SchemeKey,
  code: string
): Promise<CodeConversion[]> {
  const partial = getAtcHierarchyConversions(scheme, code);
  const results: CodeConversion[] = [];

  for (const item of partial) {
    const entry = await getEntryByCode(item.targetScheme, item.targetCode);
    results.push({
      ...item,
      targetName: entry?.name_en ?? null,
    });
  }

  return results;
}

/**
 * Returns all code conversions for a source code across configured target schemes.
 */
export async function getCodeConversions(
  scheme: SchemeKey,
  sourceCode: string
): Promise<CodeConversion[]> {
  const targets = CONVERSION_TARGETS[scheme] ?? [];
  const conversions: CodeConversion[] = [];

  for (const targetScheme of targets) {
    if (scheme === 'icd9' && targetScheme === 'icd10') {
      conversions.push(...(await crosswalkToConversions('icd9', sourceCode)));
      continue;
    }
    if (scheme === 'icd10' && targetScheme === 'icd9') {
      conversions.push(...(await crosswalkToConversions('icd10', sourceCode)));
      continue;
    }
    if (
      (scheme === 'icd10' && targetScheme === 'icd11') ||
      (scheme === 'icd11' && targetScheme === 'icd10')
    ) {
      conversions.push(...(await curatedMappingsToConversions(scheme, sourceCode, targetScheme)));
      continue;
    }
    if (scheme.startsWith('atc') && targetScheme.startsWith('atc')) {
      conversions.push(...(await atcHierarchyWithNames(scheme, sourceCode)));
      break;
    }
  }

  return conversions;
}

// Keep old helpers for backward compatibility
export const searchATC5  = (q: string, l?: string) => searchByScheme('atc5',  q, l);
export const searchICD10 = (q: string, l?: string) => searchByScheme('icd10', q, l);
