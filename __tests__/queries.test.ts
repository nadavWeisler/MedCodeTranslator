// queries.test.ts — tests for db/queries.ts with a mocked SQLite DB

// Mock the database module so no actual SQLite is used
const mockGetAllAsync = jest.fn();
jest.mock('../db/database', () => ({
  getDB: () => ({
    getAllAsync: mockGetAllAsync,
  }),
}));

import { searchByScheme, getCrosswalkFromIcd9, getCrosswalkFromIcd10 } from '../db/queries';

describe('searchByScheme', () => {
  beforeEach(() => {
    mockGetAllAsync.mockReset();
  });

  it('returns results from the DB', async () => {
    const fakeResults = [
      { code: 'A10BA02', name_en: 'Metformin', name_he: null },
    ];
    mockGetAllAsync.mockResolvedValue(fakeResults);

    const results = await searchByScheme('atc5', 'metf');
    expect(results).toEqual(fakeResults);
  });

  it('passes LIKE query with % wildcards', async () => {
    mockGetAllAsync.mockResolvedValue([]);
    await searchByScheme('icd10', 'E11');
    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('LIKE'),
      expect.arrayContaining(['%E11%'])
    );
  });

  it('queries the correct table for each scheme', async () => {
    mockGetAllAsync.mockResolvedValue([]);
    const schemes = ['atc5', 'icd10', 'icd9', 'icd11', 'loinc', 'hcpcs', 'cvx'] as const;
    for (const scheme of schemes) {
      await searchByScheme(scheme, 'test');
      const callArg = mockGetAllAsync.mock.calls.at(-1)?.[0] as string;
      expect(callArg).toContain(`FROM ${scheme}`);
    }
  });

  it('trims whitespace from query', async () => {
    mockGetAllAsync.mockResolvedValue([]);
    await searchByScheme('atc5', '  metformin  ');
    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['%metformin%'])
    );
  });

  it('returns empty array when DB returns no rows', async () => {
    mockGetAllAsync.mockResolvedValue([]);
    const results = await searchByScheme('atc5', 'zzznomatch');
    expect(results).toEqual([]);
  });
});

describe('getCrosswalkFromIcd9', () => {
  beforeEach(() => {
    mockGetAllAsync.mockReset();
  });

  it('queries icd9_to_icd10_gem table with ICD-9 lookup variants', async () => {
    const fakeRows = [
      { icd9_code: '250.00', icd10_code: 'E11.9', cardinality: '1:1',
        is_one_to_one: 1, is_one_to_many: 0, is_many_to_one: 0 },
    ];
    mockGetAllAsync.mockResolvedValue(fakeRows);

    const result = await getCrosswalkFromIcd9('25000');
    expect(result).toEqual(fakeRows);
    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('icd9_to_icd10_gem'),
      expect.arrayContaining(['25000', '250.00'])
    );
  });

  it('filters by icd9_code column with IN clause', async () => {
    mockGetAllAsync.mockResolvedValue([]);
    await getCrosswalkFromIcd9('401.9');
    const sql = mockGetAllAsync.mock.calls.at(-1)?.[0] as string;
    expect(sql).toContain('WHERE gem.icd9_code IN');
  });

  it('returns empty array when no mapping exists', async () => {
    mockGetAllAsync.mockResolvedValue([]);
    const result = await getCrosswalkFromIcd9('999.99');
    expect(result).toEqual([]);
  });
});

describe('getCrosswalkFromIcd10', () => {
  beforeEach(() => {
    mockGetAllAsync.mockReset();
  });

  it('queries icd9_to_icd10_gem table with the given ICD-10 code', async () => {
    const fakeRows = [
      { icd9_code: '250.00', icd10_code: 'E11.9', cardinality: '1:1',
        is_one_to_one: 1, is_one_to_many: 0, is_many_to_one: 0 },
    ];
    mockGetAllAsync.mockResolvedValue(fakeRows);

    const result = await getCrosswalkFromIcd10('E11.9');
    expect(result).toEqual(fakeRows);
    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('icd9_to_icd10_gem'),
      ['E11.9']
    );
  });

  it('filters by icd10_code column', async () => {
    mockGetAllAsync.mockResolvedValue([]);
    await getCrosswalkFromIcd10('I10');
    const sql = mockGetAllAsync.mock.calls.at(-1)?.[0] as string;
    expect(sql).toContain('WHERE icd10_code = ?');
  });

  it('returns empty array when no mapping exists', async () => {
    mockGetAllAsync.mockResolvedValue([]);
    const result = await getCrosswalkFromIcd10('Z99.999');
    expect(result).toEqual([]);
  });
});
