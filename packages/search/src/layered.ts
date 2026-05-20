/**
 * Layered retrieval engine.
 *
 * Runs multiple search strategies in priority order and merges results,
 * deduplicating by code and preserving the highest-scoring hit per entry.
 *
 * Priority: exact → prefix → substring → fuzzy → alias
 *
 * All results include a `score` in [0,1] and a `matchMethod` label so
 * the UI can display transparent ranking.
 */

import type { CodeEntry, ScoredEntry } from '@medcode/core';
import { exactMatch, prefixMatch, substringMatch } from './exact';
import { fuzzyMatch } from './fuzzy';

export interface LayeredSearchOptions {
  /** Maximum number of results to return (default: 20). */
  limit?: number;
  /** Minimum score threshold to include a result (default: 0). */
  minScore?: number;
  /** Whether to include fuzzy results (default: true). */
  fuzzy?: boolean;
}

/**
 * Run all retrieval layers against an in-memory entry list and return
 * a merged, deduplicated, score-sorted result list.
 *
 * @param entries  All entries for the scheme (from DB or JSON).
 * @param query    User query string.
 * @param scheme   Scheme key — used to look up the Fuse.js index.
 * @param opts     Optional tuning parameters.
 */
export function layeredSearch(
  entries: CodeEntry[],
  query: string,
  scheme: string,
  opts: LayeredSearchOptions = {}
): ScoredEntry[] {
  const { limit = 20, minScore = 0, fuzzy = true } = opts;
  const q = query.trim();
  if (!q) return [];

  const layers: ScoredEntry[][] = [
    exactMatch(entries, q),
    prefixMatch(entries, q, limit),
    substringMatch(entries, q, limit * 3),
    ...(fuzzy ? [fuzzyMatch(q, scheme, limit)] : []),
  ];

  // Merge: keep the highest score per code across all layers
  const seen = new Map<string, ScoredEntry>();
  for (const layer of layers) {
    for (const result of layer) {
      const existing = seen.get(result.code);
      if (!existing || result.score > existing.score) {
        seen.set(result.code, result);
      }
    }
  }

  return [...seen.values()]
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * "Did you mean" suggestions — same as layered search but returns only
 * the top-3 fuzzy results when exact/prefix/substring return nothing.
 */
export function didYouMean(
  entries: CodeEntry[],
  query: string,
  scheme: string
): ScoredEntry[] {
  const exact = [
    ...exactMatch(entries, query),
    ...prefixMatch(entries, query, 5),
    ...substringMatch(entries, query, 5),
  ];
  if (exact.length > 0) return [];
  return fuzzyMatch(query, scheme, 3);
}
