// queries.test.ts — tests for db/queries.ts with a mocked SQLite DB

// Mock the database module so no actual SQLite is used
const mockGetAllAsync = jest.fn();
jest.mock('../db/database', () => ({
  getDB: () => ({
    getAllAsync: mockGetAllAsync,
  }),
}));

import { searchByScheme } from '../db/queries';

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
    const schemes = ['atc5', 'icd10', 'icd9', 'icd11', 'loinc', 'cpt', 'hcpcs', 'cvx'] as const;
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
