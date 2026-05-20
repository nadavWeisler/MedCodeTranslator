/**
 * App-level search service.
 *
 * Bridges the @medcode/search package with the Expo SQLite database.
 * Loads all entries once per scheme and runs the full layered retrieval
 * pipeline (exact → prefix → substring → fuzzy) in memory.
 */
import { getAllEntries } from '../../db/database';
import type { SchemeKey } from '../../db/database';
import type { CodeEntry, ScoredEntry } from '@medcode/core';
import { buildFuseIndex, clearFuseIndex, layeredSearch, didYouMean as _didYouMean } from '@medcode/search';

// Per-scheme entry cache (populated on first buildIndex call)
const entryCache: Map<string, CodeEntry[]> = new Map();

export async function buildIndex(scheme: SchemeKey): Promise<void> {
  if (entryCache.has(scheme)) return;
  const entries = await getAllEntries(scheme);
  const typed = entries as CodeEntry[];
  entryCache.set(scheme, typed);
  buildFuseIndex(scheme, typed);
}

/** Run layered retrieval (exact → prefix → substring → fuzzy). */
export function search(
  query: string,
  scheme: SchemeKey,
  limit = 20
): ScoredEntry[] {
  const entries = entryCache.get(scheme) ?? [];
  return layeredSearch(entries, query, scheme, { limit });
}

/** Autocomplete suggestions (fuzzy, top-5, fast). */
export function getSuggestions(
  query: string,
  scheme: SchemeKey,
  limit = 5
): ScoredEntry[] {
  return search(query, scheme, limit);
}

/** "Did you mean" fallback — only fires when layered search returns nothing. */
export function getDidYouMean(
  query: string,
  scheme: SchemeKey,
  limit = 3
): ScoredEntry[] {
  const entries = entryCache.get(scheme) ?? [];
  return _didYouMean(entries, query, scheme).slice(0, limit);
}

export function clearIndex(scheme: SchemeKey): void {
  entryCache.delete(scheme);
  clearFuseIndex(scheme);
}
