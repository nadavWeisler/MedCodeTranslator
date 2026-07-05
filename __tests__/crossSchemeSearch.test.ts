import { crossSchemeSearch, buildIndex, clearIndex } from '../app/services/fuzzySearch';
import type { SchemeKey } from '../db/database';

jest.mock('../db/database', () => ({
  getAllEntries: jest.fn(async (scheme: SchemeKey) => {
    if (scheme === 'loinc') {
      return [
        { code: '2345-7', name_en: 'Glucose [Mass/volume] in Serum or Plasma', name_he: null },
      ];
    }
    if (scheme === 'icd10') {
      return [
        { code: 'E11', name_en: 'Type 2 diabetes mellitus', name_he: null },
      ];
    }
    if (scheme === 'atc5') {
      return [
        { code: 'N02BA01', name_en: 'Acetylsalicylic acid', name_he: null },
      ];
    }
    return [];
  }),
}));

describe('crossSchemeSearch', () => {
  beforeEach(async () => {
    (['icd10', 'atc5', 'loinc', 'hcpcs', 'cvx'] as SchemeKey[]).forEach(scheme => clearIndex(scheme));
    await buildIndex('icd10');
    await buildIndex('atc5');
    await buildIndex('loinc');
  });

  it('returns tagged results from multiple schemes for a clinical term', () => {
    const results = crossSchemeSearch('glucose', 10);
    const schemes = new Set(results.map(result => result.scheme));
    expect(schemes.has('loinc')).toBe(true);
    expect(results[0].code).toBeTruthy();
    expect(results[0].score).toBeGreaterThan(0);
  });
});
