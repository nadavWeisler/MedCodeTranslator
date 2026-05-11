import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CodeEntry, CodeMetadataValue } from '../../db/queries';

export type MetadataRow = {
  key: string;
  label: string;
  value: string;
};

function humanizeLabel(keyPath: string): string {
  const raw = keyPath.split('.').pop() ?? keyPath;
  const normalized = raw
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function stringifyValue(value: CodeMetadataValue): string {
  if (value === null) return '';
  if (Array.isArray(value)) {
    const parts = value
      .map(item => stringifyValue(item))
      .map(part => part.trim())
      .filter(Boolean);
    return parts.join(', ');
  }
  if (typeof value === 'object') return '';
  return String(value);
}

function flattenMetadata(value: CodeMetadataValue, path = ''): MetadataRow[] {
  if (value === null) return [];

  if (Array.isArray(value)) {
    const primitiveParts: string[] = [];
    const nestedRows: MetadataRow[] = [];
    for (const item of value) {
      if (item !== null && typeof item === 'object') {
        nestedRows.push(...flattenMetadata(item, path));
        continue;
      }
      const str = stringifyValue(item).trim();
      if (str) primitiveParts.push(str);
    }

    const ownRows =
      primitiveParts.length > 0 && path
        ? [{ key: `${path}:${primitiveParts.join(', ')}`, label: humanizeLabel(path), value: primitiveParts.join(', ') }]
        : [];
    return [...nestedRows, ...ownRows];
  }

  if (typeof value === 'object') {
    const rows: MetadataRow[] = [];
    for (const [key, nested] of Object.entries(value)) {
      const nextPath = path ? `${path}.${key}` : key;
      rows.push(...flattenMetadata(nested, nextPath));
    }
    return rows;
  }

  const stringValue = stringifyValue(value);
  if (stringValue && path) {
    return [{ key: `${path}:${stringValue}`, label: humanizeLabel(path), value: stringValue }];
  }
  return [];
}

function dedupeRows(rows: MetadataRow[]): MetadataRow[] {
  const seen = new Set<string>();
  const unique: MetadataRow[] = [];
  for (const row of rows) {
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    unique.push(row);
  }
  return unique;
}

export function useSelectedCodeResult(results: CodeEntry[]) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  useEffect(() => {
    if (results.length === 0) {
      setSelectedCode(null);
      return;
    }

    if (!selectedCode || !results.some(item => item.code === selectedCode)) {
      setSelectedCode(results[0].code);
    }
  }, [results, selectedCode]);

  const selectedEntry = useMemo(
    () => results.find(item => item.code === selectedCode) ?? null,
    [results, selectedCode]
  );

  const metadataRows = useMemo(
    () => (selectedEntry?.metadata ? dedupeRows(flattenMetadata(selectedEntry.metadata)) : []),
    [selectedEntry]
  );

  const selectEntry = useCallback((entry: CodeEntry) => {
    setSelectedCode(entry.code);
  }, []);

  return {
    selectedCode,
    metadataRows,
    selectEntry,
  };
}
