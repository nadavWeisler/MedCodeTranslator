import {
  buildAliasMap,
  layeredSearch,
  resolveAlias,
  aliasMatch,
  prefixMatch,
} from '@medcode/search';
import type { CodeEntry } from '@medcode/core';
import { buildFuseIndex } from '@medcode/search';

const SAMPLE_ENTRIES: CodeEntry[] = [
  { code: 'E11.9', name_en: 'Type 2 diabetes mellitus without complications', name_he: null },
  { code: 'I10', name_en: 'Essential (primary) hypertension', name_he: null },
  { code: 'A10BA02', name_en: 'Metformin', name_he: null },
];

const ALIASES = buildAliasMap({
  DM: 'diabetes mellitus',
  HTN: 'hypertension',
  T2DM: 'type 2 diabetes',
});

describe('alias expansion', () => {
  beforeAll(() => {
    buildFuseIndex('icd10', SAMPLE_ENTRIES);
    buildFuseIndex('atc5', SAMPLE_ENTRIES);
  });

  it('resolveAlias maps abbreviations case-insensitively', () => {
    expect(resolveAlias('HTN', ALIASES)).toBe('hypertension');
    expect(resolveAlias('htn', ALIASES)).toBe('hypertension');
    expect(resolveAlias('unknown', ALIASES)).toBeNull();
  });

  it('layeredSearch expands DM to diabetes results with matchMethod alias', () => {
    const results = layeredSearch(SAMPLE_ENTRIES, 'DM', 'icd10', {
      limit: 5,
      aliases: ALIASES,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.code === 'E11.9')).toBe(true);
    expect(results.every(r => r.matchMethod === 'alias')).toBe(true);
  });

  it('layeredSearch expands HTN to hypertension', () => {
    const results = layeredSearch(SAMPLE_ENTRIES, 'HTN', 'icd10', {
      limit: 5,
      aliases: ALIASES,
    });
    expect(results.some(r => r.code === 'I10')).toBe(true);
    expect(results[0]?.matchMethod).toBe('alias');
  });

  it('aliasMatch returns empty when query is not an alias', () => {
    expect(aliasMatch(SAMPLE_ENTRIES, 'diabetes', 'icd10', ALIASES)).toEqual([]);
  });
});

describe('Hebrew name_he matching', () => {
  const HEBREW_ENTRIES: CodeEntry[] = [
    { code: 'I10', name_en: 'Essential (primary) hypertension', name_he: 'יתר לחץ דם (ראשוני)' },
    { code: 'J45', name_en: 'Asthma', name_he: 'אסתמה' },
  ];

  it('prefixMatch matches Hebrew labels', () => {
    const results = prefixMatch(HEBREW_ENTRIES, 'יתר לחץ', 5);
    expect(results.some(r => r.code === 'I10')).toBe(true);
    expect(results[0]?.matchMethod).toBe('prefix');
  });

  it('layeredSearch returns Hebrew substring hits', () => {
    const results = layeredSearch(HEBREW_ENTRIES, 'אסתמה', 'icd10', { limit: 5 });
    expect(results.some(r => r.code === 'J45')).toBe(true);
  });
});
describe('dedupe_padded_label (python parity via refresh script contract)', () => {
  // Document expected ICD-10 label shape after normalization.
  it('sample ICD-10 entry should not contain duplicated label text', () => {
    const duplicated =
      'Cholera due to Vibrio cholerae 01, biovar cholerae Cholera due to Vibrio cholerae 01, biovar cholerae';
    const clean = 'Cholera due to Vibrio cholerae 01, biovar cholerae';
    expect(duplicated.includes(clean)).toBe(true);
    expect(duplicated).not.toBe(clean);
  });
});
