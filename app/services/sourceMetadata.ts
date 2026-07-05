import sourceMetadata from '../../data/vocabularies/source-metadata.json';
import type { SchemeKey } from '@medcode/core';

export type SourceMetadataEntry = {
  dataset: string;
  provider: string;
  url: string;
  dataset_version?: string;
  source_revision?: string;
  last_updated_utc?: string;
  retrieved_at_utc?: string;
  record_count?: number;
  coverage?: 'full' | 'partial' | 'demo';
  license_text?: string;
  attribution_text?: string;
};

type SourceMetadataFile = {
  generated_at_utc?: string;
  imported_by?: string;
  sources?: SourceMetadataEntry[];
};

const parsedMetadata = sourceMetadata as SourceMetadataFile;

export const DATASET_SOURCES: SourceMetadataEntry[] = parsedMetadata.sources ?? [];
export const DATASET_METADATA_GENERATED_AT = parsedMetadata.generated_at_utc ?? null;

export function formatDateLabel(value: string | undefined | null): string {
  if (!value) return 'n/a';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toISOString().slice(0, 10);
}

export function formatRecordCount(count: number | undefined | null): string {
  if (count === undefined || count === null) return '—';
  return count.toLocaleString('en-US');
}

export function getSchemeSourceMetadata(scheme: SchemeKey): SourceMetadataEntry | undefined {
  return DATASET_SOURCES.find(source => source.dataset === scheme);
}

/** True when the bundled dataset is a curated demo/sample rather than a full distribution. */
export function isDemoCoverage(meta: SourceMetadataEntry | undefined): boolean {
  if (!meta) return false;
  if (meta.coverage === 'demo') return true;
  if (meta.coverage === 'partial' || meta.coverage === 'full') return false;
  const version = (meta.dataset_version ?? '').toLowerCase();
  const revision = (meta.source_revision ?? '').toLowerCase();
  return (
    version.includes('demo') ||
    version.includes('sample') ||
    revision.includes('curated') ||
    revision.includes('sample')
  );
}

export function isPartialCoverage(meta: SourceMetadataEntry | undefined): boolean {
  if (!meta) return false;
  if (meta.coverage === 'partial') return true;
  if (meta.coverage === 'demo' || meta.coverage === 'full') return false;
  const version = (meta.dataset_version ?? '').toLowerCase();
  const revision = (meta.source_revision ?? '').toLowerCase();
  return version.includes('partial') || revision.includes('subset') || revision.includes('panel');
}

export type CoverageI18n = {
  key: 'coverage_demo' | 'coverage_partial' | 'coverage_full';
  count: number;
  updated?: string;
};

export function getCoverageI18n(scheme: SchemeKey): CoverageI18n | null {
  const meta = getSchemeSourceMetadata(scheme);
  if (!meta?.record_count) return null;
  const key = isDemoCoverage(meta)
    ? 'coverage_demo'
    : isPartialCoverage(meta)
      ? 'coverage_partial'
      : 'coverage_full';
  return {
    key,
    count: meta.record_count,
    updated: formatDateLabel(meta.last_updated_utc ?? meta.retrieved_at_utc),
  };
}
