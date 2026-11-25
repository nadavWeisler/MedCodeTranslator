import type { SchemeKey } from '@medcode/core';
import * as XLSXImport from 'xlsx/dist/xlsx.full.min.js';
import { parseSchemeToken, schemesForExpansion } from './schemes';
import type { GroupItem, ResolvedCode, VocabEntry } from './types';
import { buildVocabIndex, resolveCode, type VocabIndex } from './vocabulary';

export type ParsedCodeRow = {
  code: string;
  scheme?: string;
  note?: string;
};

export type ImportIssue = {
  code: string;
  scheme: string;
  reason: 'unknown' | 'invalid_scheme';
};

export type ImportReview = {
  items: GroupItem[];
  categories: ResolvedCode[];
  unknown: ImportIssue[];
};

type XlsxModule = typeof import('xlsx');

function xlsx(): XlsxModule {
  const mod = XLSXImport as XlsxModule & { default?: XlsxModule };
  return mod.utils ? mod : (mod.default as XlsxModule);
}

export function parseImportText(text: string): ParsedCodeRow[] {
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed) return [];
  if (trimmed.includes(',') || trimmed.includes('\t')) {
    const rows = parseDelimited(trimmed);
    if (isCodeTableHeader(rows[0])) return rowsToCodes(rows);
  }
  return parseFreeCodes(trimmed);
}

export function parseImportFile(name: string, data: ArrayBuffer): ParsedCodeRow[] {
  const lower = name.trim().toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    return parseImportText(new TextDecoder('utf-8').decode(data));
  }
  return rowsToCodes(readSheetRows(data));
}

export function schemesToLoad(rows: readonly ParsedCodeRow[], defaultScheme: SchemeKey): SchemeKey[] {
  const needed = new Set<SchemeKey>();
  for (const row of rows) {
    const token = row.scheme?.trim();
    const scheme = token ? parseSchemeToken(token) : defaultScheme;
    if (!scheme) continue;
    for (const related of schemesForExpansion(scheme)) needed.add(related);
  }
  if (needed.size === 0) {
    for (const related of schemesForExpansion(defaultScheme)) needed.add(related);
  }
  return [...needed];
}

export function resolveImportRows(
  rows: readonly ParsedCodeRow[],
  defaultScheme: SchemeKey,
  index: VocabIndex
): ImportReview {
  const items: GroupItem[] = [];
  const categories: ResolvedCode[] = [];
  const unknown: ImportIssue[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const token = row.scheme?.trim();
    const scheme = token ? parseSchemeToken(token) : defaultScheme;
    if (!scheme) {
      unknown.push({
        code: row.code.trim(),
        scheme: token ?? '',
        reason: 'invalid_scheme',
      });
      continue;
    }

    const resolved = resolveCode(index, scheme, row.code, row.note);
    if (!resolved) {
      unknown.push({
        code: row.code.trim(),
        scheme,
        reason: 'unknown',
      });
      continue;
    }

    const key = `${resolved.item.scheme}:${resolved.item.code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(resolved.item);
    if (resolved.descendants.length > 0) categories.push(resolved);
  }

  return { items, categories, unknown };
}

export function indexEntries(entries: readonly VocabEntry[]): VocabIndex {
  return buildVocabIndex(entries);
}

export function parseFreeCodes(text: string): ParsedCodeRow[] {
  return text
    .split(/[\n,]+/)
    .map(stripToken)
    .filter(Boolean)
    .map(code => ({ code }));
}

function isCodeTableHeader(row: string[] | undefined): boolean {
  if (!row) return false;
  const cells = row.map(cell => cell.trim().toLowerCase().replace(/^\uFEFF/, ''));
  return cells.includes('code') || cells.includes('codes') || cells.includes('scheme');
}

function parseDelimited(text: string): string[][] {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const first = normalized.split('\n', 1)[0] ?? '';
  const delimiter = first.includes('\t') && !first.includes(',') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const ch = normalized[index];
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(cell.trim());
      cell = '';
      continue;
    }
    if (ch === '\n') {
      row.push(cell.trim());
      cell = '';
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }

  row.push(cell.trim());
  if (row.some(value => value !== '')) rows.push(row);
  return rows;
}

export function rowsToCodes(rows: readonly string[][]): ParsedCodeRow[] {
  if (rows.length === 0) return [];
  const header = rows[0].map(cell => cell.trim().toLowerCase());
  const codeIdx = header.findIndex(cell => cell === 'code' || cell === 'codes');
  const hasHeader = codeIdx >= 0;
  const schemeIdx = hasHeader
    ? header.findIndex(cell => cell === 'scheme' || cell === 'system' || cell === 'vocabulary')
    : -1;
  const noteIdx = hasHeader
    ? header.findIndex(cell => cell === 'note' || cell === 'notes' || cell === 'comment')
    : -1;
  const body = hasHeader ? rows.slice(1) : rows;
  const parsed: ParsedCodeRow[] = [];

  for (const row of body) {
    const code = stripToken(hasHeader ? (row[codeIdx] ?? '') : (row[0] ?? ''));
    if (!code) continue;
    const scheme = schemeIdx >= 0 ? row[schemeIdx]?.trim() : undefined;
    const note = noteIdx >= 0 ? row[noteIdx]?.trim() : undefined;
    parsed.push({
      code,
      scheme: scheme || undefined,
      note: note || undefined,
    });
  }
  return parsed;
}

function readSheetRows(data: ArrayBuffer): string[][] {
  const book = xlsx().read(data, { type: 'array' });
  const name = book.SheetNames[0];
  if (!name) return [];
  const sheet = book.Sheets[name];
  const table = xlsx().utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  return table.map(row => (Array.isArray(row) ? row : []).map(cell => String(cell ?? '').trim()));
}

function stripToken(token: string): string {
  return token.trim().replace(/^["']|["']$/g, '').trim();
}
