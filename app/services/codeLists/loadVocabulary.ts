import type { SchemeKey } from '@medcode/core';
import { getAllEntries } from '../../../db/database';
import type { VocabEntry } from './types';
import { buildVocabIndex, type VocabIndex } from './vocabulary';

const cache = new Map<SchemeKey, VocabEntry[]>();

export async function loadVocabIndex(schemes: readonly SchemeKey[]): Promise<VocabIndex> {
  const entries: VocabEntry[] = [];
  for (const scheme of schemes) {
    entries.push(...await loadSchemeEntries(scheme));
  }
  return buildVocabIndex(entries);
}

export async function loadSchemeEntries(scheme: SchemeKey): Promise<VocabEntry[]> {
  const cached = cache.get(scheme);
  if (cached) return cached;
  const rows = await getAllEntries(scheme);
  const entries = rows.map(row => ({
    scheme,
    code: row.code,
    name_en: row.name_en,
    name_he: row.name_he ?? null,
  }));
  cache.set(scheme, entries);
  return entries;
}

export function clearVocabCache(): void {
  cache.clear();
}
