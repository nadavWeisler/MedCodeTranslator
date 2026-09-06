import { SCHEME_KEYS } from '@medcode/core';
import { SCHEMES } from '../app/components/SchemeTabs';
import sourceMetadata from '../data/vocabularies/source-metadata.json';
import packageJson from '../package.json';

const fs = require('fs') as { readFileSync(path: string, encoding: string): string };

describe('public artifact honesty', () => {
  it('declares MIT in package metadata', () => {
    expect(packageJson.license).toBe('MIT');
  });

  it('does not expose a CPT scheme', () => {
    expect(SCHEME_KEYS).not.toContain('cpt');
    expect(SCHEMES.map(scheme => scheme.key)).not.toContain('cpt');
    expect(sourceMetadata.sources.map(source => source.dataset)).not.toContain('cpt');
  });

  it('points published IR numbers at the held-out harness, not fixture expected_codes', () => {
    const readme = fs.readFileSync('README.md', 'utf-8');
    expect(readme).toContain('data/eval/heldout-report.json');
    expect(readme).toMatch(/not the published (IR )?eval/i);
    expect(readme).toContain('SQLite FTS5');
  });

  it('documents ICD-11 and LOINC as exact subsets', () => {
    const icd11 = sourceMetadata.sources.find(source => source.dataset === 'icd11');
    const loinc = sourceMetadata.sources.find(source => source.dataset === 'loinc');

    expect(icd11?.record_count).toBe(64);
    expect(icd11?.coverage).toBe('demo');
    expect(loinc?.record_count).toBe(600);
    expect(loinc?.coverage).toBe('partial');
  });
});
