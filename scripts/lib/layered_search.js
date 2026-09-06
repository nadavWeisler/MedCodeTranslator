/**
 * Node mirror of packages/search layered retrieval.
 * Kept in sync with agents/search-benchmarker/run_benchmark.js and
 * packages/search/src/{exact,fuzzy,alias,layered}.ts.
 */

'use strict';

const Fuse = require('fuse.js');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const ALIAS_PATH = path.join(ROOT, 'data', 'aliases', 'common.json');

const FUSE_OPTIONS = {
  keys: [
    { name: 'name_en', weight: 0.6 },
    { name: 'name_he', weight: 0.3 },
    { name: 'code', weight: 0.1 },
  ],
  threshold: 0.4,
  distance: 100,
  includeScore: true,
  minMatchCharLength: 2,
};

/** @type {Map<string, import('fuse.js')>} */
const fuseIndexCache = new Map();

function loadAliasMap() {
  /** @type {Record<string, string>} */
  const map = {};
  if (!fs.existsSync(ALIAS_PATH)) return map;
  const raw = JSON.parse(fs.readFileSync(ALIAS_PATH, 'utf-8'));
  for (const [key, value] of Object.entries(raw.aliases || {})) {
    const canonical = String(value).trim();
    if (key.trim() && canonical) {
      map[key.trim().toLowerCase()] = canonical;
    }
  }
  return map;
}

const ALIAS_MAP = loadAliasMap();

function buildFuseIndex(scheme, entries) {
  if (!fuseIndexCache.has(scheme)) {
    fuseIndexCache.set(scheme, new Fuse(entries, FUSE_OPTIONS));
  }
}

function clearFuseIndex(scheme) {
  if (scheme) fuseIndexCache.delete(scheme);
  else fuseIndexCache.clear();
}

function exactMatch(entries, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return entries
    .filter(
      (e) =>
        e.code.toLowerCase() === q ||
        e.name_en.toLowerCase() === q ||
        (e.name_he && e.name_he.toLowerCase() === q)
    )
    .map((e) => ({ ...e, score: 1.0 }));
}

function prefixMatch(entries, query, limit = 20) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return entries
    .filter(
      (e) =>
        e.code.toLowerCase().startsWith(q) ||
        e.name_en.toLowerCase().startsWith(q) ||
        (e.name_he && e.name_he.toLowerCase().startsWith(q))
    )
    .slice(0, limit)
    .map((e) => ({ ...e, score: 0.9 }));
}

function substringMatch(entries, query, limit = 50) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return entries
    .filter(
      (e) =>
        e.code.toLowerCase().includes(q) ||
        e.name_en.toLowerCase().includes(q) ||
        (e.name_he && e.name_he.toLowerCase().includes(q))
    )
    .slice(0, limit)
    .map((e) => ({
      ...e,
      score: e.code.toLowerCase().includes(q) ? 0.75 : 0.7,
    }));
}

function fuzzyMatch(query, scheme, limit = 10) {
  const index = fuseIndexCache.get(scheme);
  if (!index || query.trim().length < 2) return [];
  return index.search(query.trim(), { limit }).map((r) => ({
    ...r.item,
    score: parseFloat((Math.max(0, 1 - (r.score ?? 0.5)) * 0.65).toFixed(3)),
  }));
}

function aliasMatch(entries, query, scheme, limit = 20) {
  const key = query.trim().toLowerCase();
  const canonical = ALIAS_MAP[key];
  if (!canonical || canonical.toLowerCase() === key) return [];

  const layers = [
    exactMatch(entries, canonical),
    prefixMatch(entries, canonical, limit),
    substringMatch(entries, canonical, limit * 3),
    fuzzyMatch(canonical, scheme, limit),
  ];

  const seen = new Map();
  for (const layer of layers) {
    for (const result of layer) {
      const existing = seen.get(result.code);
      if (!existing || result.score > existing.score) {
        seen.set(result.code, result);
      }
    }
  }
  return [...seen.values()];
}

function layeredSearch(entries, query, scheme, limit = 20) {
  const q = query.trim();
  if (!q) return [];

  const layers = [
    exactMatch(entries, q),
    prefixMatch(entries, q, limit),
    substringMatch(entries, q, limit * 3),
    fuzzyMatch(q, scheme, limit),
    aliasMatch(entries, q, scheme, limit),
  ];

  const seen = new Map();
  for (const layer of layers) {
    for (const result of layer) {
      const existing = seen.get(result.code);
      if (!existing || result.score > existing.score) {
        seen.set(result.code, result);
      }
    }
  }

  return [...seen.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = {
  FUSE_OPTIONS,
  ALIAS_MAP,
  buildFuseIndex,
  clearFuseIndex,
  exactMatch,
  prefixMatch,
  substringMatch,
  fuzzyMatch,
  layeredSearch,
};
