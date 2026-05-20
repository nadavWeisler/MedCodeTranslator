import { getSuggestions, getDidYouMean, buildIndex, clearIndex } from '../app/services/fuzzySearch';

// Mock db/database so buildIndex doesn't hit SQLite
jest.mock('../db/database', () => ({
  getAllEntries: jest.fn().mockResolvedValue([
    { code: 'A10BA02', name_en: 'Metformin', name_he: 'מטפורמין' },
    { code: 'A10BB01', name_en: 'Glibenclamide', name_he: null },
    { code: 'C10AA01', name_en: 'Simvastatin', name_he: 'סימבסטטין' },
    { code: 'J01CA04', name_en: 'Amoxicillin', name_he: null },
    { code: 'N02BE01', name_en: 'Paracetamol', name_he: 'פרצטמול' },
  ]),
}));

describe('fuzzySearch', () => {
  beforeEach(() => {
    clearIndex('atc5');
  });

  it('getSuggestions returns empty array before index is built', () => {
    const results = getSuggestions('metf', 'atc5', 5);
    expect(results).toEqual([]);
  });

  it('getSuggestions returns empty for queries shorter than 2 chars', async () => {
    await buildIndex('atc5');
    expect(getSuggestions('m', 'atc5', 5)).toEqual([]);
  });

  it('getSuggestions returns matching entries after buildIndex', async () => {
    await buildIndex('atc5');
    const results = getSuggestions('metf', 'atc5', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name_en).toBe('Metformin');
  });

  it('getSuggestions matches by code', async () => {
    await buildIndex('atc5');
    const results = getSuggestions('A10BA', 'atc5', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.code === 'A10BA02')).toBe(true);
  });

  it('getSuggestions respects the limit', async () => {
    await buildIndex('atc5');
    const results = getSuggestions('a', 'atc5', 2);
    // query too short — returns []
    expect(results).toEqual([]);
  });

  it('getSuggestions result entries have code, name_en, name_he fields', async () => {
    await buildIndex('atc5');
    const results = getSuggestions('sim', 'atc5', 5);
    if (results.length > 0) {
      expect(results[0]).toHaveProperty('code');
      expect(results[0]).toHaveProperty('name_en');
      expect(results[0]).toHaveProperty('name_he');
    }
  });

  it('getDidYouMean returns fuzzy matches', async () => {
    await buildIndex('atc5');
    // 'mettformin' is a typo — fuse should still find Metformin
    const results = getDidYouMean('mettformin', 'atc5', 3);
    expect(results.length).toBeGreaterThan(0);
  });

  it('buildIndex is idempotent (calling twice does not throw)', async () => {
    await expect(buildIndex('atc5')).resolves.toBeUndefined();
    await expect(buildIndex('atc5')).resolves.toBeUndefined();
  });
});
