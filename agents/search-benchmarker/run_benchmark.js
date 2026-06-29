#!/usr/bin/env node
/**
 * Search quality benchmark for MedCodeTranslator.
 *
 * Runs a curated set of clinically representative queries against each coding
 * scheme using the same layered retrieval pipeline as the app (exact → prefix
 * → substring → fuzzy → alias) and a SQLite LIKE equivalent.
 * Measures precision@1 and precision@5 per scheme.
 *
 * Usage:
 *   node agents/search-benchmarker/run_benchmark.js
 *
 * Environment variables:
 *   BENCHMARK_P1_THRESHOLD  Minimum precision@1 (default: 0.70)
 *   BENCHMARK_P5_THRESHOLD  Minimum precision@5 (default: 0.85)
 *
 * Exit codes:
 *   0  All schemes meet thresholds
 *   1  One or more schemes are below threshold
 */

'use strict';

const Fuse = require('fuse.js');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const ASSETS_DIR = path.join(ROOT, 'data', 'vocabularies');
const BENCHMARK_DIR = path.join(ROOT, 'data', 'benchmarks');
const RESULTS_DIR = path.join(ROOT, 'build', 'search-quality');
const ALIAS_PATH = path.join(ROOT, 'data', 'aliases', 'common.json');

// Mirror the exact Fuse.js config from packages/search/src/fuzzy.ts
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

/** @type {Map<string, Fuse>} */
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
        e.name_en.toLowerCase().startsWith(q)
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

/**
 * Layered retrieval — mirrors packages/search/src/layered.ts.
 */
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

/**
 * Simulate the SQL LIKE query from db/queries.ts:
 *   WHERE code LIKE ? OR name_en LIKE ? OR (name_he IS NOT NULL AND name_he LIKE ?)
 *   ORDER BY CASE WHEN code LIKE ? THEN 0 ELSE 1 END, code
 *   LIMIT 100
 */
function sqliteLikeSearch(dataset, query) {
  const q = query.trim().toLowerCase();
  const matches = dataset.filter(
    (entry) =>
      (entry.code && entry.code.toLowerCase().includes(q)) ||
      (entry.name_en && entry.name_en.toLowerCase().includes(q)) ||
      (entry.name_he && entry.name_he.toLowerCase().includes(q))
  );
  matches.sort((a, b) => {
    const aCode = a.code && a.code.toLowerCase().includes(q) ? 0 : 1;
    const bCode = b.code && b.code.toLowerCase().includes(q) ? 0 : 1;
    if (aCode !== bCode) return aCode - bCode;
    return a.code.localeCompare(b.code);
  });
  return matches.slice(0, 100);
}

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

function normalizeIcd9Code(code) {
  return normalizeCode(code).replace(/\./g, '');
}

function codeMatchesExpected(schemeName, code, expectedCode) {
  const actual = normalizeCode(code);
  const expected = normalizeCode(expectedCode);
  if (!actual || !expected) return false;
  if (actual === expected) return true;

  if (schemeName === 'icd9') {
    return normalizeIcd9Code(actual) === normalizeIcd9Code(expected);
  }

  if (schemeName === 'icd10') {
    const actualHasDecimal = actual.includes('.');
    const expectedHasDecimal = expected.includes('.');

    if (!expectedHasDecimal && actual.startsWith(`${expected}.`)) return true;
    if (!actualHasDecimal && expected.startsWith(`${actual}.`)) return true;
    if (
      !expectedHasDecimal &&
      actual.startsWith(expected) &&
      (actual.length === expected.length || actual[expected.length] === '.')
    ) {
      return true;
    }
  }

  return false;
}

function runScheme(schemeName) {
  const dataPath = path.join(ASSETS_DIR, `${schemeName}.json`);
  if (!fs.existsSync(dataPath)) {
    return { scheme: schemeName, skipped: true, reason: `Dataset not found: ${dataPath}` };
  }

  const benchmarkPath = path.join(BENCHMARK_DIR, `${schemeName}.json`);
  if (!fs.existsSync(benchmarkPath)) {
    return { scheme: schemeName, skipped: true, reason: `Benchmarks not found: ${benchmarkPath}` };
  }

  const dataset = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const benchmarks = JSON.parse(fs.readFileSync(benchmarkPath, 'utf-8'));
  buildFuseIndex(schemeName, dataset);

  let layeredHits1 = 0;
  let layeredHits5 = 0;
  let sqliteHits1 = 0;
  let sqliteHits5 = 0;
  const details = [];

  for (const fixture of benchmarks) {
    const { query, expected_codes, category } = fixture;
    const expected = Array.isArray(expected_codes) ? expected_codes : [expected_codes];

    const layeredResults = layeredSearch(dataset, query, schemeName, 20);
    const layeredCodes = layeredResults.map((r) => r.code);
    const layeredHit1 = expected.some((c) =>
      codeMatchesExpected(schemeName, layeredCodes[0], c)
    );
    const layeredHit5 = expected.some((c) =>
      layeredCodes
        .slice(0, 5)
        .some((resultCode) => codeMatchesExpected(schemeName, resultCode, c))
    );
    if (layeredHit1) layeredHits1++;
    if (layeredHit5) layeredHits5++;

    const sqliteResults = sqliteLikeSearch(dataset, query);
    const sqliteCodes = sqliteResults.map((r) => r.code);
    const sqliteHit1 = expected.some((c) =>
      codeMatchesExpected(schemeName, sqliteCodes[0], c)
    );
    const sqliteHit5 = expected.some((c) =>
      sqliteCodes
        .slice(0, 5)
        .some((resultCode) => codeMatchesExpected(schemeName, resultCode, c))
    );
    if (sqliteHit1) sqliteHits1++;
    if (sqliteHit5) sqliteHits5++;

    details.push({
      query,
      expected_codes: expected,
      category: category || 'unknown',
      layered: {
        hit_at_1: layeredHit1,
        hit_at_5: layeredHit5,
        top_5: layeredCodes.slice(0, 5),
      },
      sqlite: {
        hit_at_1: sqliteHit1,
        hit_at_5: sqliteHit5,
        top_5: sqliteCodes.slice(0, 5),
      },
    });
  }

  const n = benchmarks.length;
  return {
    scheme: schemeName,
    skipped: false,
    fixture_count: n,
    layered: {
      precision_at_1: n ? layeredHits1 / n : 0,
      precision_at_5: n ? layeredHits5 / n : 0,
    },
    sqlite: {
      precision_at_1: n ? sqliteHits1 / n : 0,
      precision_at_5: n ? sqliteHits5 / n : 0,
    },
    details,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const SCHEMES = ['atc5', 'icd10', 'icd9', 'icd11', 'loinc', 'cpt', 'hcpcs', 'cvx'];
const P1_THRESHOLD = parseFloat(process.env.BENCHMARK_P1_THRESHOLD || '0.70');
const P5_THRESHOLD = parseFloat(process.env.BENCHMARK_P5_THRESHOLD || '0.85');

const results = [];
let anyFailure = false;

console.log('Running search quality benchmarks...\n');
console.log(
  `  Thresholds: precision@1 ≥ ${(P1_THRESHOLD * 100).toFixed(0)}%  precision@5 ≥ ${(P5_THRESHOLD * 100).toFixed(0)}%\n`
);

for (const scheme of SCHEMES) {
  const result = runScheme(scheme);
  results.push(result);

  if (result.skipped) {
    console.log(`  [SKIP] ${scheme.toUpperCase()}: ${result.reason}`);
    continue;
  }

  const { layered, sqlite, fixture_count } = result;
  const p1Pass = layered.precision_at_1 >= P1_THRESHOLD;
  const p5Pass = layered.precision_at_5 >= P5_THRESHOLD;
  const icon = p1Pass && p5Pass ? '✓' : '✗';

  console.log(`  [${icon}] ${scheme.toUpperCase()} (${fixture_count} fixtures)`);
  console.log(
    `       Layered: P@1 = ${(layered.precision_at_1 * 100).toFixed(0)}%  P@5 = ${(layered.precision_at_5 * 100).toFixed(0)}%`
  );
  console.log(
    `       SQLite:  P@1 = ${(sqlite.precision_at_1 * 100).toFixed(0)}%  P@5 = ${(sqlite.precision_at_5 * 100).toFixed(0)}%`
  );

  if (!p1Pass) {
    console.log(
      `       ⚠ Layered P@1 ${(layered.precision_at_1 * 100).toFixed(0)}% is below threshold ${(P1_THRESHOLD * 100).toFixed(0)}%`
    );
  }
  if (!p5Pass) {
    console.log(
      `       ⚠ Layered P@5 ${(layered.precision_at_5 * 100).toFixed(0)}% is below threshold ${(P5_THRESHOLD * 100).toFixed(0)}%`
    );
  }

  if (!p1Pass || !p5Pass) anyFailure = true;
}

// ── Write report ──────────────────────────────────────────────────────────────

fs.mkdirSync(RESULTS_DIR, { recursive: true });
const reportPath = path.join(RESULTS_DIR, 'benchmark-report.json');
const report = {
  generated_at: new Date().toISOString(),
  thresholds: { precision_at_1: P1_THRESHOLD, precision_at_5: P5_THRESHOLD },
  summary: results.map((r) => ({
    scheme: r.scheme,
    skipped: r.skipped || false,
    fixture_count: r.fixture_count,
    layered_p1: r.layered ? r.layered.precision_at_1 : null,
    layered_p5: r.layered ? r.layered.precision_at_5 : null,
    sqlite_p1: r.sqlite ? r.sqlite.precision_at_1 : null,
    sqlite_p5: r.sqlite ? r.sqlite.precision_at_5 : null,
    pass: r.skipped
      ? null
      : r.layered.precision_at_1 >= P1_THRESHOLD &&
        r.layered.precision_at_5 >= P5_THRESHOLD,
  })),
  details: results,
};
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(`\nReport written to ${reportPath}`);

// ── GitHub step summary ───────────────────────────────────────────────────────

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  const rows = [
    '## Search quality benchmark',
    '',
    `| Scheme | Fixtures | Layered P@1 | Layered P@5 | SQLite P@1 | SQLite P@5 | Pass |`,
    `|---|---|---|---|---|---|---|`,
  ];
  for (const r of results) {
    if (r.skipped) {
      rows.push(`| ${r.scheme} | — | — | — | — | — | ⚠ skip |`);
    } else {
      const pass =
        r.layered.precision_at_1 >= P1_THRESHOLD &&
        r.layered.precision_at_5 >= P5_THRESHOLD
          ? '✓'
          : '✗';
      rows.push(
        `| ${r.scheme} | ${r.fixture_count} | ${(r.layered.precision_at_1 * 100).toFixed(0)}% | ${(r.layered.precision_at_5 * 100).toFixed(0)}% | ${(r.sqlite.precision_at_1 * 100).toFixed(0)}% | ${(r.sqlite.precision_at_5 * 100).toFixed(0)}% | ${pass} |`
      );
    }
  }
  fs.appendFileSync(summaryPath, rows.join('\n') + '\n');
}

// ── Exit code ─────────────────────────────────────────────────────────────────

if (anyFailure) {
  process.stderr.write('\nOne or more schemes are below the precision threshold.\n');
  process.exit(1);
}
console.log('\nAll benchmarks passed. ✓');
