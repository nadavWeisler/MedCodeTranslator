import * as XLSXImport from 'xlsx/dist/xlsx.full.min.js';
import { parseImportFile, parseImportText, resolveImportRows } from '../app/services/codeLists/importCodes';
import type { VocabEntry } from '../app/services/codeLists/types';
import { buildVocabIndex } from '../app/services/codeLists/vocabulary';

type XlsxModule = typeof import('xlsx');

function xlsx(): XlsxModule {
  const mod = XLSXImport as XlsxModule & { default?: XlsxModule };
  return mod.utils ? mod : (mod.default as XlsxModule);
}

const ENTRIES: VocabEntry[] = [
  { scheme: 'icd10', code: 'F32.0', name_en: 'Mild depressive episode', name_he: 'דיכאון קל' },
  { scheme: 'icd10', code: 'F32.1', name_en: 'Moderate depressive episode', name_he: null },
  { scheme: 'icd10', code: 'F32.9', name_en: 'Depressive episode, unspecified', name_he: null },
  { scheme: 'icd10', code: 'E11.9', name_en: 'Type 2 diabetes mellitus without complications', name_he: null },
  { scheme: 'atc5', code: 'A10BA02', name_en: 'metformin', name_he: null },
];

const index = buildVocabIndex(ENTRIES);

describe('code import parsing', () => {
  it('parses one code per line and comma-separated codes', () => {
    expect(parseImportText('F32.0\nE11.9\n').map(row => row.code)).toEqual(['F32.0', 'E11.9']);
    expect(parseImportText('F32.0, E11.9, F32.1').map(row => row.code)).toEqual(['F32.0', 'E11.9', 'F32.1']);
    expect(parseImportText('F32.0, E11.9\nA10BA02').map(row => row.code)).toEqual(['F32.0', 'E11.9', 'A10BA02']);
  });

  it('parses quoted csv headers before treating the text as free codes', () => {
    const rows = parseImportText('"Scheme","Code","Note"\n"atc5","A10BA02","primary"\n');
    expect(rows).toEqual([
      { code: 'A10BA02', scheme: 'atc5', note: 'primary' },
    ]);
    const review = resolveImportRows(rows, 'icd10', index);
    expect(review.items).toEqual([
      { scheme: 'atc5', code: 'A10BA02', description: 'metformin', note: 'primary' },
    ]);
    expect(review.unknown).toEqual([]);
  });

  it('parses a csv header into code, scheme, and note', () => {
    const rows = parseImportText('Code,Scheme,Note\nF32.0,icd10,"primary, episode"\nE11.9,ICD-10-CM,\n');
    expect(rows).toEqual([
      { code: 'F32.0', scheme: 'icd10', note: 'primary, episode' },
      { code: 'E11.9', scheme: 'ICD-10-CM', note: undefined },
    ]);
  });

  it('reads an xlsx sheet and reports unknown codes instead of dropping them', () => {
    const book = xlsx().utils.book_new();
    const sheet = xlsx().utils.aoa_to_sheet([
      ['Code', 'Scheme', 'Note'],
      ['F32', 'ICD-10', 'category'],
      ['F32.0', 'icd10', 'leaf'],
      ['NOTACODE', 'icd10', ''],
      ['A10BA02', 'nope', ''],
    ]);
    xlsx().utils.book_append_sheet(book, sheet, 'Codes');
    const bytes = xlsx().write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    const rows = parseImportFile('lists.xlsx', bytes);
    const review = resolveImportRows(rows, 'icd10', index);

    expect(review.items.map(item => item.code)).toEqual(['F32', 'F32.0']);
    expect(review.items[0]).toMatchObject({ description: '', note: 'category' });
    expect(review.items[1]).toMatchObject({ description: 'Mild depressive episode', note: 'leaf' });
    expect(review.categories.map(item => item.item.code)).toEqual(['F32']);
    expect(review.categories[0].descendants.map(item => item.code)).toEqual(['F32.0', 'F32.1', 'F32.9']);
    expect(review.unknown).toEqual([
      { code: 'NOTACODE', scheme: 'icd10', reason: 'unknown' },
      { code: 'A10BA02', scheme: 'nope', reason: 'invalid_scheme' },
    ]);
  });

  it('collapses duplicates and uses the selected scheme when the file has no scheme column', () => {
    const review = resolveImportRows(parseImportText('A10BA02, A10BA02\nZZZ'), 'atc5', index);
    expect(review.items).toEqual([
      { scheme: 'atc5', code: 'A10BA02', description: 'metformin' },
    ]);
    expect(review.unknown).toEqual([{ code: 'ZZZ', scheme: 'atc5', reason: 'unknown' }]);
  });
});
