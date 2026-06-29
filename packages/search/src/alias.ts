/**
 * Alias / abbreviation expansion layer.
 *
 * Maps common clinical abbreviations (e.g. "DM", "HTN") to canonical search
 * terms before running the standard retrieval layers.
 */

import type { CodeEntry, ScoredEntry } from '@medcode/core';
import { exactMatch, prefixMatch, substringMatch } from './exact';
import { fuzzyMatch } from './fuzzy';

/** Case-insensitive alias lookup table: alias → canonical term. */
export type AliasMap = Record<string, string>;

/** Build a lowercase-keyed alias map from a raw aliases object. */
export function buildAliasMap(aliases: Record<string, string>): AliasMap {
  const map: AliasMap = {};
  for (const [key, value] of Object.entries(aliases)) {
    const canonical = value.trim();
    if (key.trim() && canonical) {
      map[key.trim().toLowerCase()] = canonical;
    }
  }
  return map;
}

/** Resolve a query to its canonical alias expansion, if any. */
export function resolveAlias(query: string, aliases?: AliasMap): string | null {
  if (!aliases) return null;
  const key = query.trim().toLowerCase();
  if (!key) return null;
  return aliases[key] ?? null;
}

/**
 * Run retrieval layers for an alias-expanded query.
 * Results inherit underlying scores but are tagged matchMethod: 'alias'.
 */
export function aliasMatch(
  entries: CodeEntry[],
  query: string,
  scheme: string,
  aliases: AliasMap | undefined,
  limit = 20,
  fuzzy = true
): ScoredEntry[] {
  const canonical = resolveAlias(query, aliases);
  if (!canonical || canonical.toLowerCase() === query.trim().toLowerCase()) {
    return [];
  }

  const layers: ScoredEntry[][] = [
    exactMatch(entries, canonical),
    prefixMatch(entries, canonical, limit),
    substringMatch(entries, canonical, limit * 3),
    ...(fuzzy ? [fuzzyMatch(canonical, scheme, limit)] : []),
  ];

  const seen = new Map<string, ScoredEntry>();
  for (const layer of layers) {
    for (const result of layer) {
      const tagged: ScoredEntry = { ...result, matchMethod: 'alias' };
      const existing = seen.get(result.code);
      if (!existing || tagged.score > existing.score) {
        seen.set(result.code, tagged);
      }
    }
  }

  return [...seen.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
