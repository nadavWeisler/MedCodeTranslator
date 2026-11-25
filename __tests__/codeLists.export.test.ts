import * as XLSXImport from 'xlsx/dist/xlsx.full.min.js';
import {
  COMBINED_SHEET_NAME,
  buildExportSheets,
  exportHeaders,
  sanitizeSheetName,
  sheetsToWorkbook,
} from '../app/services/codeLists/exportWorkbook';
import { emptyProject, PROJECT_KIND, PROJECT_SCHEMA_VERSION, type CodeListProject } from '../app/services/codeLists/types';

type XlsxModule = typeof import('xlsx');

function xlsx(): XlsxModule {
  const mod = XLSXImport as XlsxModule & { default?: XlsxModule };
  return mod.utils ? mod : (mod.default as XlsxModule);
}

const project: CodeListProject = {
  schemaVersion: PROJECT_SCHEMA_VERSION,
  kind: PROJECT_KIND,
  groups: [
    {
      id: 'in',
      name: 'Depression: cohort?',
      role: 'inclusion',
      note: 'adults',
      items: [
        { scheme: 'icd10', code: 'F32', description: '', note: 'category' },
        { scheme: 'icd10', code: 'F32.0', description: 'Mild depressive episode', note: 'leaf' },
      ],
    },
    {
      id: 'ex',
      name: 'depression: cohort?',
      role: 'exclusion',
      items: [
        { scheme: 'atc5', code: 'A10BA02', description: 'metformin' },
      ],
    },
  ],
};

function readBook(bytes: Uint8Array) {
  const book = xlsx().read(bytes, { type: 'array' });
  return book.SheetNames.map(name => ({
    name,
    rows: xlsx().utils.sheet_to_json<(string | number)[]>(book.Sheets[name], { header: 1, defval: '' }),
  }));
}

describe('excel export', () => {
  it('sanitizes sheet names for length, illegal characters, and uniqueness', () => {
    const used = new Set<string>();
    const long = sanitizeSheetName('Bad:name/with?chars*and[brackets] plus extra length beyond thirty one', used);
    const reserved = sanitizeSheetName(COMBINED_SHEET_NAME, used);
    const collision = sanitizeSheetName('all codes', used);
    for (const name of [long, reserved, collision]) {
      expect(name.length).toBeLessThanOrEqual(31);
      expect(name).not.toMatch(/[:\\/?*[\]]/);
    }
    expect(new Set([long, reserved, collision].map(name => name.toLowerCase())).size).toBe(3);
  });

  it('writes one combined sheet and one sheet per group', () => {
    const sheets = buildExportSheets(project, { includeHebrew: false });
    expect(sheets.map(sheet => sheet.name)).toEqual([
      'All codes',
      'Depression cohort',
      'depression cohort (2)',
    ]);
    expect(sheets[0].rows[0]).toEqual(exportHeaders(false));
    expect(sheets[0].rows[0]).not.toContain('Hebrew description');
    expect(sheets[0].rows.slice(1)).toEqual([
      ['Depression: cohort?', 'Inclusion', 'ICD-10', 'F32', '', 'category', 'adults'],
      ['Depression: cohort?', 'Inclusion', 'ICD-10', 'F32.0', 'Mild depressive episode', 'leaf', 'adults'],
      ['depression: cohort?', 'Exclusion', 'ATC-5', 'A10BA02', 'metformin', '', ''],
    ]);
    expect(sheets[1].rows).toHaveLength(3);
    expect(sheets[2].rows).toHaveLength(2);
  });

  it('adds Hebrew only when requested and leaves missing translations blank', () => {
    const sheets = buildExportSheets(project, {
      includeHebrew: true,
      hebrew: (scheme, code) => (scheme === 'icd10' && code === 'F32.0' ? 'דיכאון קל' : null),
    });
    expect(sheets[0].rows[0]).toEqual(exportHeaders(true));
    expect(sheets[0].rows[1]).toEqual([
      'Depression: cohort?', 'Inclusion', 'ICD-10', 'F32', '', '', 'category', 'adults',
    ]);
    expect(sheets[0].rows[2][5]).toBe('דיכאון קל');
    expect(sheets[0].rows[3][5]).toBe('');

    const book = readBook(sheetsToWorkbook(sheets));
    expect(book.map(sheet => sheet.name)).toEqual(sheets.map(sheet => sheet.name));
    expect(book[0].rows[0]).toEqual(exportHeaders(true));
    expect(book[0].rows[2][5]).toBe('דיכאון קל');
    expect(book[0].rows).toHaveLength(4);
  });

  it('still emits the combined header when there are no lists', () => {
    const sheets = buildExportSheets(emptyProject(), { includeHebrew: false });
    expect(sheets).toEqual([{ name: 'All codes', rows: [exportHeaders(false)] }]);
  });
});
