/**
 * App-level search service.
 *
 * Bridges the @medcode/search package with the Expo SQLite database.
 * Loads all entries once per scheme and runs the full layered retrieval
 * pipeline (exact → prefix → substring → fuzzy) in memory.
 */
import { getAllEntries } from '../../db/database';
import type { SchemeKey } from '../../db/database';
import type { CodeEntry, CrossSchemeScoredEntry, ScoredEntry } from '@medcode/core';
import { CROSS_SCHEME_KEYS } from '@medcode/core';
import {
  buildAliasMap,
  buildFuseIndex,
  clearFuseIndex,
  layeredSearch,
  didYouMean as _didYouMean,
  type AliasMap,
} from '@medcode/search';
import commonAliases from '../../data/aliases/common.json';

// Per-scheme entry cache (populated on first buildIndex call)
const entryCache: Map<string, CodeEntry[]> = new Map();

const ALIAS_MAP: AliasMap = buildAliasMap(
  (commonAliases as { aliases: Record<string, string> }).aliases
);

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
  return layeredSearch(entries, query, scheme, { limit, aliases: ALIAS_MAP });
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

export function isIndexReady(scheme: SchemeKey): boolean {
  return entryCache.has(scheme);
}

export function getCrossSchemeKeys(): readonly SchemeKey[] {
  return CROSS_SCHEME_KEYS;
}

/** Build in-memory indexes for all cross-scheme search targets. */
export async function buildCrossSchemeIndexes(): Promise<void> {
  await Promise.all(CROSS_SCHEME_KEYS.map(scheme => buildIndex(scheme)));
}

export function isCrossSchemeReady(): boolean {
  return CROSS_SCHEME_KEYS.every(scheme => entryCache.has(scheme));
}

/**
 * Search across representative schemes and merge with round-robin fairness.
 * Each scheme contributes up to perSchemeLimit hits before interleaving.
 */
export function crossSchemeSearch(query: string, limit = 30): CrossSchemeScoredEntry[] {
  const perSchemeLimit = Math.max(3, Math.ceil(limit / CROSS_SCHEME_KEYS.length));
  const buckets = CROSS_SCHEME_KEYS.map(scheme =>
    search(query, scheme, perSchemeLimit).map(result => ({ ...result, scheme }))
  );

  const merged: CrossSchemeScoredEntry[] = [];
  const indices = new Array(buckets.length).fill(0);

  while (merged.length < limit) {
    let added = false;
    for (let i = 0; i < buckets.length; i += 1) {
      const next = buckets[i][indices[i]];
      if (!next) continue;
      merged.push(next);
      indices[i] += 1;
      added = true;
      if (merged.length >= limit) break;
    }
    if (!added) break;
  }

  return merged;
}
