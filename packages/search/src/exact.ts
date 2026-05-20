/**
 * Exact and prefix matching layer.
 *
 * Runs purely in-memory over an array of entries — no SQLite dependency.
 * This makes it testable in isolation and usable from Node/Python scripts.
 */

import type { CodeEntry, ScoredEntry } from '@medcode/core';

/** Case-insensitive exact match on code or name_en. Score = 1.0. */
export function exactMatch(entries: CodeEntry[], query: string): ScoredEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return entries
    .filter(
      e =>
        e.code.toLowerCase() === q ||
        e.name_en.toLowerCase() === q ||
        (e.name_he?.toLowerCase() === q)
    )
    .map(e => ({
      ...e,
      score: 1.0,
      matchMethod: 'exact' as const,
      highlights: buildHighlights(e.name_en, q),
    }));
}

/** Starts-with match on code or name_en. Score = 0.9. */
export function prefixMatch(
  entries: CodeEntry[],
  query: string,
  limit = 20
): ScoredEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  return entries
    .filter(
      e =>
        e.code.toLowerCase().startsWith(q) ||
        e.name_en.toLowerCase().startsWith(q)
    )
    .slice(0, limit)
    .map(e => ({
      ...e,
      score: 0.9,
      matchMethod: 'prefix' as const,
      highlights: buildHighlights(e.name_en, q),
    }));
}

/** Substring match (SQL LIKE equivalent). Score = 0.7. */
export function substringMatch(
  entries: CodeEntry[],
  query: string,
  limit = 50
): ScoredEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return entries
    .filter(
      e =>
        e.code.toLowerCase().includes(q) ||
        e.name_en.toLowerCase().includes(q) ||
        (e.name_he && e.name_he.toLowerCase().includes(q))
    )
    .slice(0, limit)
    .map(e => ({
      ...e,
      score: codeBoost(e.code, q, 0.7),
      matchMethod: 'substring' as const,
      highlights: buildHighlights(e.name_en, q),
    }));
}

/** Boost score slightly when the code itself matches (makes code lookups rank higher). */
function codeBoost(code: string, q: string, base: number): number {
  return code.toLowerCase().includes(q) ? Math.min(base + 0.05, 1.0) : base;
}

/**
 * Build highlight ranges for a given field value and query string.
 * Returns an array of [start, end] character index pairs (inclusive).
 */
export function buildHighlights(
  text: string,
  query: string
): [number, number][] {
  if (!text || !query) return [];
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  const ranges: [number, number][] = [];
  let idx = 0;
  while (idx < t.length) {
    const pos = t.indexOf(q, idx);
    if (pos === -1) break;
    ranges.push([pos, pos + q.length - 1]);
    idx = pos + 1;
  }
  return ranges;
}
