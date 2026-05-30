/**
 * @medcode/core — shared types for MedCodeTranslator
 *
 * All types are re-exported from here so app/ and packages/search/ share
 * a single source of truth.
 */

export type SchemeKey =
  | 'atc1'
  | 'atc2'
  | 'atc3'
  | 'atc4'
  | 'atc5'
  | 'icd10'
  | 'icd9'
  | 'icd11'
  | 'loinc'
  | 'cpt'
  | 'hcpcs'
  | 'cvx';

export const SCHEME_KEYS: SchemeKey[] = [
  'atc1', 'atc2', 'atc3', 'atc4', 'atc5',
  'icd10', 'icd9', 'icd11', 'loinc', 'cpt', 'hcpcs', 'cvx',
];

/** A single terminology entry as stored in the database. */
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

/** How a result was matched — used for transparent ranking UI. */
export type MatchMethod =
  | 'exact'       // code or name_en is an exact case-insensitive match
  | 'prefix'      // starts-with match on code or name_en
  | 'substring'   // SQL LIKE wildcard match
  | 'fuzzy'       // Fuse.js approximate match
  | 'alias';      // matched via synonym/abbreviation table

/** A search result with provenance metadata for transparent ranking. */
export type ScoredEntry = CodeEntry & {
  /** Normalised relevance score in [0, 1]; higher is better. */
  score: number;
  /** Which retrieval layer produced this result. */
  matchMethod: MatchMethod;
  /**
   * Zero-indexed character ranges in name_en that matched the query.
   * Used for match highlighting in the UI.
   * Each element is [start, end] inclusive.
   */
  highlights?: [number, number][];
};
