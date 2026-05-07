import Fuse, { type IFuseOptions } from 'fuse.js';
import { getAllEntries, type SchemeKey } from '../../db/database';
import type { CodeEntry } from '../../db/queries';

// Fuse-compatible entry (name_he can be undefined)
type FuseEntry = { code: string; name_en: string; name_he?: string | null };

const indexCache: Partial<Record<SchemeKey, Fuse<FuseEntry>>> = {};

const FUSE_OPTIONS: IFuseOptions<FuseEntry> = {
  keys: [
    { name: 'name_en', weight: 0.6 },
    { name: 'name_he', weight: 0.3 },
    { name: 'code',    weight: 0.1 },
  ],
  threshold: 0.4,
  distance: 100,
  includeScore: true,
  minMatchCharLength: 2,
};

export async function buildIndex(scheme: SchemeKey): Promise<void> {
  if (indexCache[scheme]) return;
  const entries = await getAllEntries(scheme);
  indexCache[scheme] = new Fuse(entries as FuseEntry[], FUSE_OPTIONS);
}

function toCodeEntry(e: FuseEntry): CodeEntry {
  return { code: e.code, name_en: e.name_en, name_he: e.name_he ?? null };
}

export function getSuggestions(query: string, scheme: SchemeKey, limit = 5): CodeEntry[] {
  const index = indexCache[scheme];
  if (!index || query.trim().length < 2) return [];
  return index.search(query, { limit }).map(r => toCodeEntry(r.item));
}

export function getDidYouMean(query: string, scheme: SchemeKey, limit = 3): CodeEntry[] {
  return getSuggestions(query, scheme, limit);
}

export function clearIndex(scheme: SchemeKey): void {
  delete indexCache[scheme];
}
