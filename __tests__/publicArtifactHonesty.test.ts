import { SCHEME_KEYS } from '@medcode/core';
import { SCHEMES } from '../app/components/SchemeTabs';
import sourceMetadata from '../data/vocabularies/source-metadata.json';
import packageJson from '../package.json';

describe('public artifact honesty', () => {
  it('declares MIT in package metadata', () => {
    expect(packageJson.license).toBe('MIT');
  });

  it('does not expose a CPT scheme', () => {
    expect(SCHEME_KEYS).not.toContain('cpt');
    expect(SCHEMES.map(scheme => scheme.key)).not.toContain('cpt');
    expect(sourceMetadata.sources.map(source => source.dataset)).not.toContain('cpt');
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
