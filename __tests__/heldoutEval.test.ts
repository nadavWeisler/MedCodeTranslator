import { SEARCH_EXAMPLES } from '../app/constants/searchExamples';
import sourceMetadata from '../data/vocabularies/source-metadata.json';

const fs = require('fs') as { readFileSync(path: string, encoding: string): string };
const { spawnSync } = require('child_process') as {
  spawnSync: (
    cmd: string,
    args: string[],
    opts: { encoding: string }
  ) => { status: number | null; stdout: string };
};

const {
  DEMO_QUERIES,
  SCHEME_QUOTA,
  collectFixtureExclusions,
  excludedQuerySet,
  normalizeText,
} = require('../scripts/heldout_ir_eval');
const { layeredSearch, buildFuseIndex, clearFuseIndex } = require('../scripts/lib/layered_search');
const { layeredSearch: packageSearch, buildFuseIndex: packageBuildIndex } = require('@medcode/search');

const heldout = require('../data/eval/heldout-queries.json');
const report = require('../data/eval/heldout-report.json');

describe('held-out query set', () => {
  it('locks demo exclusions to the UI example chips', () => {
    const fromApp = Object.values(SEARCH_EXAMPLES).flat().map((query) => normalizeText(query));
    const fromEval = DEMO_QUERIES.map((query: string) => normalizeText(query));
    for (const query of fromApp) {
      expect(fromEval).toContain(query);
    }
  });

  it('does not reuse fixture or demo query strings', () => {
    const excluded = excludedQuerySet();
    for (const item of heldout.queries) {
      expect(item.expected_codes).toBeUndefined();
      expect(excluded.queries.has(normalizeText(item.query))).toBe(false);
    }
  });

  it('does not reuse fixture expected codes as source items', () => {
    const fixtures = collectFixtureExclusions();
    for (const item of heldout.queries) {
      expect(fixtures.codes.has(String(item.source_code).toUpperCase())).toBe(false);
    }
  });

  it('pins the vocabularies used to generate the set', () => {
    expect(heldout.protocol_version).toBe(1);
    expect(heldout.seed).toBe(20260906);
    expect(heldout.generated_from.generated_at_utc).toBe(sourceMetadata.generated_at_utc);
    expect(heldout.queries.length).toBe(heldout.query_count);
    expect(heldout.query_count).toBeGreaterThan(100);
    for (const scheme of Object.keys(SCHEME_QUOTA)) {
      expect(heldout.queries.some((item: { scheme: string }) => item.scheme === scheme)).toBe(true);
    }
    expect(heldout.queries.some((item: { scheme: string }) => item.scheme === 'icd11')).toBe(false);
  });

  it('uses protocol-derived relevant codes, not hand-picked expected_codes', () => {
    for (const item of heldout.queries) {
      expect(Array.isArray(item.relevant_codes)).toBe(true);
      expect(item.relevant_codes).toContain(item.source_code);
      expect(['official_label', 'label_typo', 'exact_code']).toContain(item.query_type);
    }
  });
});

describe('held-out report snapshot', () => {
  it('README quotes the committed harness macro numbers', () => {
    const readme = fs.readFileSync('README.md', 'utf-8');
    expect(readme).toContain('data/eval/heldout-report.json');
    expect(readme).toContain(String(report.systems.layered.macro.mrr));
    expect(readme).toContain(String(report.systems.fts5.macro.mrr));
    expect(readme).toContain(String(report.systems.layered.by_query_type.label_typo.mrr));
    expect(readme).toContain(String(report.systems.fts5.by_query_type.label_typo.mrr));
    expect(readme).toMatch(/fixture regression \(not the published eval\)/i);
  });

  it('reports layered and FTS5 with the same pinned vocab metadata', () => {
    expect(report.vocab_pin.generated_at_utc).toBe(heldout.generated_from.generated_at_utc);
    expect(report.query_count).toBe(heldout.query_count);
    expect(report.systems.layered.macro).toEqual(expect.objectContaining({
      mrr: expect.any(Number),
      ndcg_at_5: expect.any(Number),
      p_at_1: expect.any(Number),
      p_at_5: expect.any(Number),
    }));
    expect(report.systems.fts5.macro).toEqual(expect.objectContaining({
      mrr: expect.any(Number),
      ndcg_at_5: expect.any(Number),
    }));
    expect(report.systems.fts5.tokenizer).toMatch(/unicode61/);
  });
});

describe('FTS5 baseline', () => {
  it('passes the stdlib sqlite self-test', () => {
    const result = spawnSync('python3', ['scripts/fts5_baseline.py', '--self-test'], {
      encoding: 'utf-8',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/self-test passed/);
  });
});

describe('layered mirror', () => {
  const entries = [
    { code: 'E11.9', name_en: 'Type 2 diabetes mellitus without complications', name_he: null },
    { code: 'A10BA02', name_en: 'Metformin', name_he: null },
  ];

  afterEach(() => {
    clearFuseIndex();
  });

  it('matches @medcode/search ranking on a tiny set', () => {
    buildFuseIndex('icd10-eval-mirror', entries);
    packageBuildIndex('icd10-eval-mirror-pkg', entries);
    const query = 'Metformin';
    const mirrored = layeredSearch(entries, query, 'icd10-eval-mirror', 5).map((row: { code: string }) => row.code);
    const packaged = packageSearch(entries, query, 'icd10-eval-mirror-pkg', { limit: 5 }).map((row: { code: string }) => row.code);
    expect(mirrored[0]).toBe('A10BA02');
    expect(mirrored).toEqual(packaged);
  });
});
