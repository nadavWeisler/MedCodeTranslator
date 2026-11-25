import type { SchemeKey } from '@medcode/core';
import * as XLSXImport from 'xlsx/dist/xlsx.full.min.js';
import { roleExportLabel, schemeExportLabel } from './schemes';
import type { CodeGroup, CodeListProject, GroupItem } from './types';

export const COMBINED_SHEET_NAME = 'All codes';
export const HEBREW_COLUMN = 'Hebrew description';

const ILLEGAL_SHEET_CHARS = /[:\\/?*[\]]/g;

export type ExportSheet = {
  name: string;
  rows: string[][];
};

export type HebrewLookup = (scheme: SchemeKey, code: string) => string | null | undefined;

type XlsxModule = typeof import('xlsx');

function xlsx(): XlsxModule {
  const mod = XLSXImport as XlsxModule & { default?: XlsxModule };
  return mod.utils ? mod : (mod.default as XlsxModule);
}

export function exportHeaders(includeHebrew: boolean): string[] {
  const headers = ['Group', 'Inclusion/Exclusion', 'Scheme', 'Code', 'Description'];
  if (includeHebrew) headers.push(HEBREW_COLUMN);
  headers.push('Note', 'Group note');
  return headers;
}

export function buildExportSheets(
  project: CodeListProject,
  options: { includeHebrew: boolean; hebrew?: HebrewLookup }
): ExportSheet[] {
  const includeHebrew = options.includeHebrew;
  const headers = exportHeaders(includeHebrew);
  const used = new Set<string>();
  const combinedName = sanitizeSheetName(COMBINED_SHEET_NAME, used);
  const combinedRows = [headers];

  const groupSheets: ExportSheet[] = project.groups.map(group => {
    const rows = [headers];
    for (const item of group.items) {
      const row = itemRow(group, item, includeHebrew, options.hebrew);
      rows.push(row);
      combinedRows.push(row);
    }
    return {
      name: sanitizeSheetName(group.name, used),
      rows,
    };
  });

  return [{ name: combinedName, rows: combinedRows }, ...groupSheets];
}

export function sheetsToWorkbook(sheets: readonly ExportSheet[]): Uint8Array {
  const book = xlsx().utils.book_new();
  for (const sheet of sheets) {
    const worksheet = xlsx().utils.aoa_to_sheet(sheet.rows);
    xlsx().utils.book_append_sheet(book, worksheet, sheet.name);
  }
  const written = xlsx().write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Uint8Array(written);
}

/**
 * Excel sheet names: 31 characters, no : \ / ? * [ ], and unique ignoring case.
 */
export function sanitizeSheetName(raw: string, used: Set<string>): string {
  const cleaned = raw
    .replace(ILLEGAL_SHEET_CHARS, ' ')
    .replace(/['’]/g, ' ')
    .replace(/[\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const base = (cleaned || 'List').slice(0, 31);
  const unique = uniquify(base, used);
  used.add(unique.toLowerCase());
  return unique;
}

function uniquify(base: string, used: Set<string>): string {
  if (!used.has(base.toLowerCase())) return base;
  for (let index = 2; index < 10000; index += 1) {
    const suffix = ` (${index})`;
    const candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
  return base.slice(0, 31);
}

function itemRow(
  group: CodeGroup,
  item: GroupItem,
  includeHebrew: boolean,
  hebrew: HebrewLookup | undefined
): string[] {
  const row = [
    group.name,
    roleExportLabel(group.role),
    schemeExportLabel(item.scheme),
    item.code,
    item.description,
  ];
  if (includeHebrew) {
    const value = hebrew?.(item.scheme, item.code);
    row.push(value?.trim() ? value.trim() : '');
  }
  row.push(item.note ?? '', group.note ?? '');
  return row;
}
