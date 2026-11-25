import sourceMetadata from '../data/vocabularies/source-metadata.json';
import { resolveChip, resolveTranslationChip, validateDatasetRecords, validateShippedRecordMap, SHIPPED_DATASETS } from '../scripts/lib/provenance';

const fs = require('fs') as { readFileSync(path: string, encoding: string): string };
const path = require('path') as { join(...parts: string[]): string };

const METHOD = 'Unofficial translation, not validated';

function loadShipped() {
  const recordMap: Record<string, unknown[]> = {};
  for (const [fileName, dataset] of SHIPPED_DATASETS) {
    recordMap[dataset] = JSON.parse(fs.readFileSync(path.join('data/vocabularies', fileName), 'utf8'));
  }
  return recordMap;
}

describe('provenance validation', () => {
  const shipped = loadShipped();

  it('fails a shipped record with no provenance', () => {
    const errors = validateDatasetRecords('icd10', [{ code: 'Z00', name_en: 'Example' }], {
      provenance_keys: {},
      sources: [],
    });
    expect(errors.some(error => error.includes('missing provenance'))).toBe(true);
  });

  it('fails a translated label that does not link to its English source', () => {
    const errors = validateDatasetRecords(
      'loinc',
      [{
        code: '2345-7',
        name_en: 'Glucose',
        name_he: 'גלוקוז',
        translation: { method: METHOD, reviewed: false },
      }],
      {
        ...sourceMetadata,
        sources: sourceMetadata.sources.map(source => (
          source.dataset === 'loinc' ? { ...source, hebrew_label_count: 1 } : source
        )),
      }
    );
    expect(errors.some(error => error.includes('does not link to its English source record'))).toBe(true);
  });

  it('accepts the shipped vocabularies', () => {
    expect(validateShippedRecordMap(shipped, sourceMetadata)).toEqual([]);
  });

  it('keeps the Hebrew label text and marks it as an unvalidated translation', () => {
    const icd10 = shipped.icd10 as Array<{ code: string; name_en: string; name_he?: string | null; translation?: { method: string; reviewed: boolean; english_source: string } }>;
    const cholera = icd10.find(row => row.code === 'A00.0');
    expect(cholera?.name_en).toBe('Cholera due to Vibrio cholerae 01, biovar cholerae');
    expect(cholera?.name_he).toBe('כולרה');
    expect(cholera?.translation).toEqual({
      method: METHOD,
      reviewed: false,
      english_source: 'cms-icd10cm-fy2025',
    });
    const labeled = icd10.filter(row => row.name_he && row.name_he.trim());
    expect(labeled).toHaveLength(2489);
    expect(labeled.every(row => row.translation?.method === METHOD && row.translation.reviewed === false)).toBe(true);

    const loinc = shipped.loinc as Array<{ code: string; name_he?: string | null; translation?: { method: string; english_source: string } }>;
    const hemoglobin = loinc.find(row => row.code === '718-7');
    expect(hemoglobin?.name_he).toBe('המוגלובין בדם');
    expect(hemoglobin?.translation?.english_source).toBe('ohdsi-loinc-subset');
    expect(loinc.filter(row => row.name_he && row.name_he.trim())).toHaveLength(45);
  });
});

describe('source links', () => {
  it('points each scheme at the page named in the provenance brief', () => {
    expect(resolveChip('icd10', 'E11.9', 'record')?.href).toBe('https://www.cms.gov/medicare/coding-billing/icd-10-codes');
    expect(resolveChip('icd9', '0010', 'record')?.href).toContain('cms.gov');
    expect(resolveChip('atc5', 'A10BA02', 'record')).toEqual(expect.objectContaining({
      labelKey: 'source_chip_chembl',
      href: 'https://atcddd.fhi.no/atc_ddd_index/?code=A10BA02',
    }));
    expect(resolveChip('loinc', '2345-7', 'record')?.href).toBe('https://loinc.org/2345-7');
    expect(resolveChip('icd11', '5A11', 'record')).toEqual(expect.objectContaining({
      labelKey: 'source_chip_hand_entered',
      href: 'https://icd.who.int/browse',
      authoritative: false,
    }));
    expect(resolveChip('hcpcs', 'A0425', 'record')?.href).toContain('cms.gov');
    expect(resolveChip('cvx', '141', 'record')?.href).toContain('cdc.gov');
    expect(resolveChip('icd9_to_icd10_gem', null, 'record')?.href).toBeNull();
    expect(resolveChip('common_scheme_mappings', null, 'record')?.href).toBeNull();
  });

  it('links a Hebrew label to the official English entry', () => {
    expect(resolveTranslationChip('icd10', 'E11.9')).toEqual(expect.objectContaining({
      labelKey: 'source_chip_unofficial_translation',
      href: 'https://www.cms.gov/medicare/coding-billing/icd-10-codes',
      translated: true,
      authoritative: false,
    }));
    expect(resolveTranslationChip('loinc', '2345-7')?.href).toBe('https://loinc.org/2345-7');
    expect(resolveTranslationChip('icd11', '5A11')).toBeNull();
  });
});
