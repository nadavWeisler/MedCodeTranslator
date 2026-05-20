/**
 * Fuzzy matching layer using Fuse.js.
 *
 * Wraps the existing Fuse.js index cache and exposes scored results.
 * Score from Fuse is in [0, 1] where 0 = perfect — we invert it so
 * higher score = better match (consistent with the rest of the pipeline).
 */

import Fuse, { type IFuseOptions } from 'fuse.js';
import type { CodeEntry, ScoredEntry } from '@medcode/core';

type FuseEntry = { code: string; name_en: string; name_he?: string | null };

const indexCache: Map<string, Fuse<FuseEntry>> = new Map();

export const FUSE_OPTIONS: IFuseOptions<FuseEntry> = {
  keys: [
    { name: 'name_en', weight: 0.6 },
    { name: 'name_he', weight: 0.3 },
    { name: 'code', weight: 0.1 },
  ],
  threshold: 0.4,
  distance: 100,
  includeScore: true,
  minMatchCharLength: 2,
  includeMatches: true,
};

export function buildFuseIndex(scheme: string, entries: CodeEntry[]): void {
  if (indexCache.has(scheme)) return;
  indexCache.set(scheme, new Fuse(entries as FuseEntry[], FUSE_OPTIONS));
}

export function clearFuseIndex(scheme: string): void {
  indexCache.delete(scheme);
}

export function fuzzyMatch(
  query: string,
  scheme: string,
  limit = 10
): ScoredEntry[] {
  const index = indexCache.get(scheme);
  if (!index || query.trim().length < 2) return [];

  return index
    .search(query.trim(), { limit })
    .map(r => {
      // Fuse score: 0 = perfect, 1 = no match. Invert to [0, 1] higher = better.
      const fuseScore = r.score ?? 0.5;
      const score = parseFloat((Math.max(0, 1 - fuseScore) * 0.65).toFixed(3));

      // Extract highlight ranges from Fuse match indices
      const highlights = extractFuseHighlights(r.matches ?? [], r.item.name_en);

      return {
        code: r.item.code,
        name_en: r.item.name_en,
        name_he: r.item.name_he ?? null,
        score,
        matchMethod: 'fuzzy' as const,
        highlights,
      };
    });
}

/** Convert Fuse match indices to our highlight format. */
function extractFuseHighlights(
  matches: readonly { key?: string; indices?: readonly [number, number][] }[],
  nameEn: string
): [number, number][] {
  const nameMatch = matches.find(m => m.key === 'name_en');
  if (!nameMatch?.indices) return [];
  return [...nameMatch.indices]
    .filter(([s, e]) => e >= s && s < nameEn.length)
    .map(([s, e]): [number, number] => [s, Math.min(e, nameEn.length - 1)]);
}
