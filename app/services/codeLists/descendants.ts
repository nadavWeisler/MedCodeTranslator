import { SCHEME_KEYS, type SchemeKey } from '@medcode/core';
import { atcLevelIndex, isAtcScheme, matchesAtcLevel } from './schemes';
import type { GroupItem, VocabEntry } from './types';

/**
 * Category codes such as ICD-10 F32 are often absent as their own vocabulary
 * row. A descendant is a more specific code that is actually stored locally.
 */
export function findDescendantEntries(
  entries: readonly VocabEntry[],
  scheme: SchemeKey,
  code: string
): VocabEntry[] {
  const parent = canonicalCategoryCode(scheme, code);
  if (!parent) return [];

  const matches = entries.filter(entry => isDescendant(scheme, parent, entry));
  matches.sort((a, b) => compareEntries(a, b));
  return matches;
}

export function descendantItems(entries: readonly VocabEntry[]): GroupItem[] {
  return entries.map(entry => ({
    scheme: entry.scheme,
    code: entry.code,
    description: entry.name_en,
  }));
}

export function canonicalCategoryCode(scheme: SchemeKey, raw: string): string | null {
  switch (scheme) {
    case 'icd10':
      return normalizeIcd10(raw);
    case 'icd11':
      return normalizeIcd11(raw);
    case 'icd9': {
      const code = normalizeIcd9(raw);
      if (!code || !isIcd9ParentShape(code)) return null;
      return code;
    }
    case 'atc1':
    case 'atc2':
    case 'atc3':
    case 'atc4':
    case 'atc5': {
      const code = raw.trim().toUpperCase();
      return matchesAtcLevel(scheme, code) ? code : null;
    }
    case 'loinc':
    case 'hcpcs':
    case 'cvx':
      return null;
    default: {
      const exhaustive: never = scheme;
      return exhaustive;
    }
  }
}

function isDescendant(parentScheme: SchemeKey, parent: string, child: VocabEntry): boolean {
  if (child.scheme === parentScheme && child.code.toUpperCase() === parent.toUpperCase()) return false;

  switch (parentScheme) {
    case 'icd10':
      return child.scheme === 'icd10' && isDottedDescendant(parent, child.code);
    case 'icd11':
      return child.scheme === 'icd11' && isDottedDescendant(parent, child.code);
    case 'icd9':
      return child.scheme === 'icd9' && isIcd9Descendant(parent, child.code);
    case 'atc1':
    case 'atc2':
    case 'atc3':
    case 'atc4':
    case 'atc5':
      return isAtcDescendant(parentScheme, parent, child);
    case 'loinc':
    case 'hcpcs':
    case 'cvx':
      return false;
    default: {
      const exhaustive: never = parentScheme;
      return exhaustive;
    }
  }
}

/** ICD-10/11: F32 -> F32.0; F32.8 -> F32.81. A shorter stem must not swallow the next category. */
function isDottedDescendant(parent: string, childCode: string): boolean {
  const child = childCode.trim().toUpperCase();
  if (child === parent) return false;
  if (!parent.includes('.')) return child.startsWith(`${parent}.`);
  return child.startsWith(parent) && child.length > parent.length;
}

function isIcd9Descendant(parent: string, childCode: string): boolean {
  if (!isIcd9ParentShape(parent)) return false;
  const child = normalizeIcd9(childCode);
  if (!child) return false;
  return child.startsWith(parent) && child.length > parent.length;
}

function isAtcDescendant(parentScheme: SchemeKey, parent: string, child: VocabEntry): boolean {
  if (!isAtcScheme(parentScheme) || !isAtcScheme(child.scheme)) return false;
  const parentLevel = atcLevelIndex(parentScheme);
  const childLevel = atcLevelIndex(child.scheme);
  if (childLevel <= parentLevel) return false;
  const childCode = child.code.trim().toUpperCase();
  return childCode.startsWith(parent) && childCode.length > parent.length;
}

function compareEntries(a: VocabEntry, b: VocabEntry): number {
  const schemeDiff = SCHEME_KEYS.indexOf(a.scheme) - SCHEME_KEYS.indexOf(b.scheme);
  if (schemeDiff !== 0) return schemeDiff;
  if (a.code < b.code) return -1;
  if (a.code > b.code) return 1;
  return 0;
}

export function normalizeIcd10(raw: string): string | null {
  let code = raw.trim().toUpperCase().replace(/\s+/g, '').replace(/\.+$/g, '');
  if (!code) return null;
  if (!code.includes('.') && code.length > 3) {
    code = `${code.slice(0, 3)}.${code.slice(3)}`;
  }
  if (!/^[A-Z][0-9][0-9A-Z](\.[0-9A-Z]{1,4})?$/.test(code)) return null;
  return code;
}

export function normalizeIcd11(raw: string): string | null {
  const code = raw.trim().toUpperCase().replace(/\s+/g, '').replace(/\.+$/g, '');
  if (!/^[0-9A-Z]{3,}(\.[0-9A-Z]+)?$/.test(code)) return null;
  return code;
}

export function normalizeIcd9(raw: string): string | null {
  const code = raw.trim().toUpperCase().replace(/[.\s]/g, '');
  if (!code) return null;
  if (/^\d{3,5}$/.test(code) || /^V\d{2,4}$/.test(code) || /^E\d{3,4}$/.test(code)) return code;
  return null;
}

/** 3–4 digit categories, V codes, and E codes. Full billable leaves are longer. */
export function isIcd9ParentShape(code: string): boolean {
  return /^\d{3,4}$/.test(code) || /^V\d{2,3}$/.test(code) || /^E\d{3}$/.test(code);
}
