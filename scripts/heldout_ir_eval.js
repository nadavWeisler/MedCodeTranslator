#!/usr/bin/env node
/**
 * Held-out known-item IR evaluation for MedCodeTranslator.
 *
 * Query strings are generated from official labels / codes of vocabulary
 * rows that do not appear in marketing examples or the fixture regression
 * gate. Relevance is the originating code (plus exact-name duplicates).
 *
 * Usage:
 *   node scripts/heldout_ir_eval.js --generate
 *   node scripts/heldout_ir_eval.js
 */

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const { aggregateMetrics, roundMetrics, scoreRanking } = require('./lib/ir_metrics');
const { buildFuseIndex, layeredSearch } = require('./lib/layered_search');

const ROOT = path.resolve(__dirname, '..');
const VOCAB_DIR = path.join(ROOT, 'data', 'vocabularies');
const BENCHMARK_DIR = path.join(ROOT, 'data', 'benchmarks');
const EVAL_DIR = path.join(ROOT, 'data', 'eval');
const QUERIES_PATH = path.join(EVAL_DIR, 'heldout-queries.json');
const REPORT_PATH = path.join(EVAL_DIR, 'heldout-report.json');
const BUILD_REPORT_PATH = path.join(ROOT, 'build', 'eval', 'heldout-report.json');
const EXAMPLES_PATH = path.join(ROOT, 'app', 'constants', 'searchExamples.ts');
const METADATA_PATH = path.join(VOCAB_DIR, 'source-metadata.json');

const PROTOCOL_VERSION = 1;
const SEED = 20260906;
const LIMIT = 10;
const K_VALUES = [1, 5, 10];
const QUERY_TYPES = ['official_label', 'label_typo', 'exact_code'];

const SCHEME_QUOTA = {
  icd10: 48,
  icd9: 36,
  atc5: 36,
  hcpcs: 36,
  loinc: 24,
  cvx: 18,
};

const GENERIC_NAME = /\b(other specified|not elsewhere classified|not otherwise specified|unspecified|combinations|nos|nec)\b/i;

// Keep in lockstep with app/constants/searchExamples.ts — the Jest suite checks both.
const DEMO_QUERIES = [
  'diabetes',
  'hypertension',
  'E11.9',
  'HIV',
  'typhoid',
  'asthma',
  'alimentary',
  'cardiovascular',
  'antiinfectives',
  'antibacterials',
  'analgesics',
  'antidiabetics',
  'insulin',
  'beta blocking',
  'antidepressants',
  'penicillins',
  'statins',
  'proton pump',
  'metformin',
  'aspirin',
  'amoxicillin',
  'influenza',
  'COVID',
  'MMR',
  'glucose',
  'hemoglobin',
  'potassium',
  'wheelchair',
  'ambulance',
  'splint',
];

function parseArgs(argv) {
  const args = {
    generate: argv.includes('--generate'),
    queries: QUERIES_PATH,
    out: REPORT_PATH,
    limit: LIMIT,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--queries') args.queries = path.resolve(argv[++i]);
    else if (argv[i] === '--out') args.out = path.resolve(argv[++i]);
    else if (argv[i] === '--limit') args.limit = parseInt(argv[++i], 10);
  }
  return args;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, rand) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

function normalizeIcd9Code(code) {
  return normalizeCode(code).replace(/\./g, '');
}

function codesEquivalent(scheme, left, right) {
  const a = normalizeCode(left);
  const b = normalizeCode(right);
  if (!a || !b) return false;
  if (a === b) return true;
  if (scheme === 'icd9') return normalizeIcd9Code(a) === normalizeIcd9Code(b);
  if (scheme === 'icd10') {
    const aBare = a.replace(/\./g, '');
    const bBare = b.replace(/\./g, '');
    return aBare === bBare;
  }
  return false;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function loadVocab(scheme) {
  return loadJson(path.join(VOCAB_DIR, `${scheme}.json`));
}

function loadSourceMetadata() {
  const metadata = loadJson(METADATA_PATH);
  return {
    generated_at_utc: metadata.generated_at_utc,
    sources: metadata.sources
      .filter((source) => SCHEME_QUOTA[source.dataset])
      .map((source) => ({
        dataset: source.dataset,
        dataset_version: source.dataset_version,
        source_revision: source.source_revision,
        record_count: source.record_count,
        retrieved_at_utc: source.retrieved_at_utc,
        coverage: source.coverage || null,
      })),
  };
}

function collectFixtureExclusions() {
  const queries = new Set();
  const codes = new Set();
  const files = fs.readdirSync(BENCHMARK_DIR).filter((name) => name.endsWith('.json') && name !== 'baseline.json');
  for (const file of files) {
    const fixtures = loadJson(path.join(BENCHMARK_DIR, file));
    if (!Array.isArray(fixtures)) continue;
    for (const fixture of fixtures) {
      if (fixture.query) queries.add(normalizeText(fixture.query));
      for (const code of fixture.expected_codes || []) {
        codes.add(normalizeCode(code));
        codes.add(normalizeIcd9Code(code));
      }
    }
  }
  return { queries, codes };
}

function collectDemoQueries() {
  const fromFile = new Set();
  const source = fs.readFileSync(EXAMPLES_PATH, 'utf-8');
  for (const match of source.matchAll(/'([^']+)'/g)) {
    if (match[1].includes('/') || match[1].includes('.')) {
      // keep code-like examples such as E11.9; drop type-only strings elsewhere
    }
    fromFile.add(normalizeText(match[1]));
  }
  const listed = new Set(DEMO_QUERIES.map(normalizeText));
  return { fromFile, listed };
}

function excludedQuerySet() {
  const fixtures = collectFixtureExclusions();
  const demo = collectDemoQueries();
  const queries = new Set([...fixtures.queries, ...demo.listed, ...DEMO_QUERIES.map(normalizeText)]);
  return { queries, codes: fixtures.codes, demo };
}

function isGenericName(name) {
  const text = normalizeText(name);
  if (text.length < 8) return true;
  return GENERIC_NAME.test(text);
}

function oneCharDelete(text, salt) {
  const chars = [...text];
  const idxs = [];
  for (let i = 1; i < chars.length - 1; i++) {
    if (chars[i] !== ' ') idxs.push(i);
  }
  if (!idxs.length) return text;
  const idx = idxs[salt % idxs.length];
  return chars.slice(0, idx).join('') + chars.slice(idx + 1).join('');
}

function relevantForName(scheme, entries, name) {
  const target = normalizeText(name);
  return entries
    .filter((entry) => normalizeText(entry.name_en) === target)
    .map((entry) => entry.code);
}

function relevantForCode(scheme, entries, code) {
  return entries
    .filter((entry) => codesEquivalent(scheme, entry.code, code))
    .map((entry) => entry.code);
}

function eligibleEntries(scheme, entries, excluded) {
  const nameCounts = new Map();
  for (const entry of entries) {
    const key = normalizeText(entry.name_en);
    nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
  }

  return entries.filter((entry) => {
    const name = entry.name_en || '';
    const key = normalizeText(name);
    if (isGenericName(name)) return false;
    if ((nameCounts.get(key) || 0) > 5) return false;
    if (excluded.queries.has(key)) return false;
    if (excluded.codes.has(normalizeCode(entry.code))) return false;
    if (excluded.codes.has(normalizeIcd9Code(entry.code))) return false;
    return true;
  });
}

function generateHeldoutSet() {
  const excluded = excludedQuerySet();
  const vocabPin = loadSourceMetadata();
  const queries = [];

  for (const [scheme, quota] of Object.entries(SCHEME_QUOTA)) {
    const entries = loadVocab(scheme);
    const eligible = eligibleEntries(scheme, entries, excluded)
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code));
    const rand = mulberry32(SEED + scheme.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0));
    const sampled = shuffle(eligible, rand).slice(0, quota);

    sampled.forEach((entry, index) => {
      const queryType = QUERY_TYPES[index % QUERY_TYPES.length];
      let query;
      let relevant;
      if (queryType === 'official_label') {
        query = entry.name_en.trim();
        relevant = relevantForName(scheme, entries, entry.name_en);
      } else if (queryType === 'label_typo') {
        query = oneCharDelete(entry.name_en.trim(), index + SEED);
        relevant = relevantForName(scheme, entries, entry.name_en);
      } else if (queryType === 'exact_code') {
        query = entry.code;
        relevant = relevantForCode(scheme, entries, entry.code);
      } else {
        const exhaustive = queryType;
        throw new Error(`Unhandled query type: ${exhaustive}`);
      }

      if (!query || excluded.queries.has(normalizeText(query))) return;
      if (queryType === 'label_typo' && normalizeText(query) === normalizeText(entry.name_en)) return;

      queries.push({
        id: `${scheme}-${String(queries.filter((q) => q.scheme === scheme).length + 1).padStart(3, '0')}`,
        scheme,
        query,
        query_type: queryType,
        source_code: entry.code,
        relevant_codes: [...new Set(relevant)],
      });
    });
  }

  return {
    protocol_version: PROTOCOL_VERSION,
    task: 'known-item lexical retrieval',
    seed: SEED,
    k: K_VALUES,
    limit: LIMIT,
    generated_from: vocabPin,
    excluded_sources: [
      'data/benchmarks/*.json',
      'app/constants/searchExamples.ts',
    ],
    relevance: 'Binary. Official-label and typo queries: all codes whose name_en equals the source label. Code queries: the source code and dotted/undotted variants present in the pinned vocab. Not clinician-judged.',
    notes: [
      'Queries are generated from official labels/codes; they are not the marketing chips or fixture regression expected_codes.',
      'ICD-11 is omitted because the bundled file is a 64-row demo subset.',
    ],
    query_count: queries.length,
    queries,
  };
}

function assertNoOverlap(querySet) {
  const excluded = excludedQuerySet();
  const overlaps = [];
  for (const item of querySet.queries) {
    if (excluded.queries.has(normalizeText(item.query))) {
      overlaps.push(item);
    }
    if (item.expected_codes) {
      throw new Error('Held-out queries must not carry hand-picked expected_codes');
    }
  }
  if (overlaps.length) {
    throw new Error(`Held-out set overlaps fixture/demo queries: ${overlaps.map((q) => q.query).join(', ')}`);
  }
}

function runLayered(querySet, limit) {
  const byScheme = new Map();
  for (const item of querySet.queries) {
    if (!byScheme.has(item.scheme)) byScheme.set(item.scheme, []);
    byScheme.get(item.scheme).push(item);
  }

  const rankings = {};
  for (const [scheme, items] of byScheme) {
    const started = Date.now();
    const entries = loadVocab(scheme);
    buildFuseIndex(scheme, entries);
    for (const item of items) {
      rankings[item.id] = layeredSearch(entries, item.query, scheme, limit).map((row) => row.code);
    }
    console.log(`  layered ${scheme}: ${items.length} queries in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  }
  return rankings;
}

function runFts5(queryPath, limit) {
  const result = spawnSync(
    process.env.PYTHON || 'python3',
    [path.join(ROOT, 'scripts', 'fts5_baseline.py'), '--queries', queryPath, '--limit', String(limit)],
    { encoding: 'utf-8', maxBuffer: 20 * 1024 * 1024 }
  );
  if (result.status !== 0) {
    throw new Error(`FTS5 baseline failed:\n${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout);
}

function scoreSystem(querySet, rankings, kValues) {
  const perQuery = querySet.queries.map((item) => {
    const ranked = rankings[item.id] || [];
    const metrics = scoreRanking(ranked, item.relevant_codes, kValues);
    return {
      id: item.id,
      scheme: item.scheme,
      query_type: item.query_type,
      query: item.query,
      source_code: item.source_code,
      relevant_codes: item.relevant_codes,
      top_k: ranked.slice(0, Math.max(...kValues)),
      ...metrics,
    };
  });

  const byScheme = {};
  const byType = {};
  for (const scheme of Object.keys(SCHEME_QUOTA)) {
    const rows = perQuery.filter((row) => row.scheme === scheme);
    if (rows.length) byScheme[scheme] = roundMetrics(aggregateMetrics(rows, kValues));
  }
  for (const queryType of QUERY_TYPES) {
    const rows = perQuery.filter((row) => row.query_type === queryType);
    if (rows.length) byType[queryType] = roundMetrics(aggregateMetrics(rows, kValues));
  }

  return {
    macro: roundMetrics(aggregateMetrics(perQuery, kValues)),
    by_scheme: byScheme,
    by_query_type: byType,
    details: perQuery,
  };
}

function formatPct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function printTable(report) {
  console.log('Held-out known-item IR evaluation\n');
  console.log(`  Queries: ${report.query_count}   Seed: ${report.protocol.seed}   Vocab pin: ${report.vocab_pin.generated_at_utc}\n`);
  console.log('  Macro-average (all queries)');
  console.log('            MRR    nDCG@5  nDCG@10   P@1     P@5   Success@5');
  for (const system of ['layered', 'fts5']) {
    const m = report.systems[system].macro;
    console.log(
      `  ${system.padEnd(8)}  ${m.mrr.toFixed(3)}   ${m.ndcg_at_5.toFixed(3)}   ${m.ndcg_at_10.toFixed(3)}   ${formatPct(m.p_at_1)}  ${formatPct(m.p_at_5)}   ${formatPct(m.success_at_5)}`
    );
  }
  console.log('\n  Per scheme (layered vs FTS5 MRR)');
  for (const scheme of Object.keys(SCHEME_QUOTA)) {
    const layered = report.systems.layered.by_scheme[scheme];
    const fts5 = report.systems.fts5.by_scheme[scheme];
    if (!layered || !fts5) continue;
    console.log(
      `  ${scheme.padEnd(8)}  n=${String(layered.query_count).padStart(2)}   layered MRR ${layered.mrr.toFixed(3)}   fts5 MRR ${fts5.mrr.toFixed(3)}`
    );
  }
}

function writeGithubSummary(report) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  const rows = [
    '## Held-out IR evaluation',
    '',
    `Queries: ${report.query_count}. Seed: ${report.protocol.seed}. Vocab pin: \`${report.vocab_pin.generated_at_utc}\`.`,
    '',
    '| System | MRR | nDCG@5 | nDCG@10 | P@1 | P@5 | Success@5 |',
    '|---|---:|---:|---:|---:|---:|---:|',
  ];
  for (const system of ['layered', 'fts5']) {
    const m = report.systems[system].macro;
    rows.push(
      `| ${system} | ${m.mrr.toFixed(3)} | ${m.ndcg_at_5.toFixed(3)} | ${m.ndcg_at_10.toFixed(3)} | ${formatPct(m.p_at_1)} | ${formatPct(m.p_at_5)} | ${formatPct(m.success_at_5)} |`
    );
  }
  fs.appendFileSync(summaryPath, rows.join('\n') + '\n');
}

function buildReport(querySet, layeredRankings, fts5Result) {
  const layered = scoreSystem(querySet, layeredRankings, querySet.k);
  const fts5 = scoreSystem(querySet, fts5Result.rankings, querySet.k);
  return {
    generated_at: new Date().toISOString(),
    protocol: {
      version: querySet.protocol_version,
      task: querySet.task,
      seed: querySet.seed,
      k: querySet.k,
      relevance: querySet.relevance,
    },
    vocab_pin: querySet.generated_from,
    query_count: querySet.query_count,
    systems: {
      layered: {
        description: 'In-repo layered lexical search (exact → prefix → substring → Fuse.js → alias). Same Node mirror as the fixture regression gate.',
        ...layered,
        details: undefined,
      },
      fts5: {
        description: 'SQLite FTS5 BM25 over the same pinned JSON vocabs (unicode61, no extra licenses).',
        tokenizer: fts5Result.tokenizer,
        sqlite_version: fts5Result.sqlite_version,
        ...fts5,
        details: undefined,
      },
    },
    details: {
      layered: layered.details,
      fts5: fts5.details,
    },
  };
}

function compactReport(report) {
  const { details, ...rest } = report;
  return rest;
}

function assertQueriesResolve(querySet) {
  const cache = new Map();
  for (const item of querySet.queries) {
    if (!cache.has(item.scheme)) {
      cache.set(item.scheme, new Set(loadVocab(item.scheme).map((entry) => entry.code)));
    }
    if (!cache.get(item.scheme).has(item.source_code)) {
      throw new Error(
        `Held-out source_code ${item.source_code} is missing from ${item.scheme}. Re-run npm run eval:heldout:generate`
      );
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(EVAL_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(BUILD_REPORT_PATH), { recursive: true });

  if (args.generate) {
    const querySet = generateHeldoutSet();
    assertNoOverlap(querySet);
    fs.writeFileSync(args.queries, JSON.stringify(querySet, null, 2) + '\n');
    console.log(`Wrote ${querySet.query_count} held-out queries to ${args.queries}`);
    return;
  }

  if (!fs.existsSync(args.queries)) {
    throw new Error(`Missing ${args.queries}. Run with --generate first.`);
  }

  const querySet = loadJson(args.queries);
  assertNoOverlap(querySet);
  assertQueriesResolve(querySet);

  console.log('Running layered retrieval on the held-out set...');
  const layeredRankings = runLayered(querySet, args.limit);
  console.log('Running SQLite FTS5 baseline...');
  const fts5Result = runFts5(args.queries, args.limit);

  const report = buildReport(querySet, layeredRankings, fts5Result);
  const compact = compactReport(report);
  fs.writeFileSync(args.out, JSON.stringify(compact, null, 2) + '\n');
  fs.writeFileSync(BUILD_REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
  printTable(compact);
  writeGithubSummary(compact);
  console.log(`\nCommitted snapshot: ${args.out}`);
  console.log(`Full per-query report: ${BUILD_REPORT_PATH}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  PROTOCOL_VERSION,
  SEED,
  SCHEME_QUOTA,
  DEMO_QUERIES,
  QUERY_TYPES,
  collectFixtureExclusions,
  collectDemoQueries,
  excludedQuerySet,
  generateHeldoutSet,
  assertNoOverlap,
  normalizeText,
  normalizeCode,
};
