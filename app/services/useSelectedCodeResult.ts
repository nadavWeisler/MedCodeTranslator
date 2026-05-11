import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CodeEntry, CodeMetadataValue } from '../../db/queries';

export type MetadataRow = {
  label: string;
  value: string;
};

function humanizeLabel(keyPath: string): string {
  const raw = keyPath.split('.').pop() ?? keyPath;
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, c => c.toUpperCase());
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

function flattenMetadata(value: CodeMetadataValue, path = '', rows: MetadataRow[] = []): MetadataRow[] {
  if (value === null) return rows;

  if (Array.isArray(value)) {
    const primitiveParts: string[] = [];
    for (const item of value) {
      if (item !== null && typeof item === 'object') {
        flattenMetadata(item, path, rows);
        continue;
      }
      const str = stringifyValue(item).trim();
      if (str) primitiveParts.push(str);
    }

    if (primitiveParts.length > 0 && path) {
      rows.push({ label: humanizeLabel(path), value: primitiveParts.join(', ') });
    }
    return rows;
  }

  if (typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      const nextPath = path ? `${path}.${key}` : key;
      flattenMetadata(nested, nextPath, rows);
    }
    return rows;
  }

  const stringValue = stringifyValue(value);
  if (stringValue && path) {
    rows.push({ label: humanizeLabel(path), value: stringValue });
  }
  return rows;
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
    () => (selectedEntry?.metadata ? flattenMetadata(selectedEntry.metadata) : []),
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
