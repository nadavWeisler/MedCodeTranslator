import type { SchemeKey } from '@medcode/core';
import { canonicalCategoryCode, descendantItems, findDescendantEntries, normalizeIcd10, normalizeIcd11, normalizeIcd9 } from './descendants';
import { cleanNote, type GroupItem, type ResolvedCode, type VocabEntry } from './types';

export type VocabIndex = {
  entries: VocabEntry[];
  byKey: Map<string, VocabEntry>;
};

export function buildVocabIndex(entries: readonly VocabEntry[]): VocabIndex {
  const byKey = new Map<string, VocabEntry>();
  for (const entry of entries) {
    for (const key of lookupKeys(entry.scheme, entry.code)) {
      const mapKey = `${entry.scheme}:${key}`;
      if (!byKey.has(mapKey)) byKey.set(mapKey, entry);
    }
  }
  return { entries: [...entries], byKey };
}

export function findEntry(index: VocabIndex, scheme: SchemeKey, raw: string): VocabEntry | null {
  for (const key of lookupKeys(scheme, raw)) {
    const hit = index.byKey.get(`${scheme}:${key}`);
    if (hit) return hit;
  }
  return null;
}

/**
 * Resolve a code against the local vocabulary.
 * An exact row wins. A category with stored descendants (ICD-10 F32) is kept
 * with an empty description. Anything else is unknown.
 */
export function resolveCode(
  index: VocabIndex,
  scheme: SchemeKey,
  raw: string,
  note?: string
): ResolvedCode | null {
  const entry = findEntry(index, scheme, raw);
  const codeNote = cleanNote(note);
  if (entry) {
    const descendants = descendantItems(findDescendantEntries(index.entries, scheme, entry.code));
    return {
      kind: 'entry',
      item: {
        scheme,
        code: entry.code,
        description: entry.name_en,
        note: codeNote,
      },
      descendants,
    };
  }

  const category = canonicalCategoryCode(scheme, raw);
  if (!category) return null;
  const descendants = descendantItems(findDescendantEntries(index.entries, scheme, category));
  if (descendants.length === 0) return null;
  const item: GroupItem = {
    scheme,
    code: category,
    description: '',
    note: codeNote,
  };
  return { kind: 'category', item, descendants };
}

export function lookupKeys(scheme: SchemeKey, raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  switch (scheme) {
    case 'icd9': {
      const undotted = normalizeIcd9(trimmed) ?? trimmed.toUpperCase().replace(/[.\s]/g, '');
      return undotted ? [undotted] : [];
    }
    case 'icd10': {
      const dotted = normalizeIcd10(trimmed);
      const compact = trimmed.toUpperCase().replace(/\s+/g, '').replace(/\.+$/g, '');
      return unique([dotted, compact, compact.replace(/\./g, '')].filter((key): key is string => !!key));
    }
    case 'icd11': {
      const dotted = normalizeIcd11(trimmed);
      const compact = trimmed.toUpperCase().replace(/\s+/g, '').replace(/\.+$/g, '');
      return unique([dotted, compact, compact.replace(/\./g, '')].filter((key): key is string => !!key));
    }
    case 'atc1':
    case 'atc2':
    case 'atc3':
    case 'atc4':
    case 'atc5':
    case 'hcpcs':
      return [trimmed.toUpperCase()];
    case 'loinc':
    case 'cvx':
      return [trimmed];
    default: {
      const exhaustive: never = scheme;
      return exhaustive;
    }
  }
}

function unique(keys: string[]): string[] {
  return [...new Set(keys)];
}

export function hebrewFor(index: VocabIndex, scheme: SchemeKey, code: string): string | null {
  const entry = findEntry(index, scheme, code);
  const value = entry?.name_he?.trim();
  return value ? value : null;
}
