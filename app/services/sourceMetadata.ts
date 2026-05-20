import sourceMetadata from '../../assets/data/source-metadata.json';

export type SourceMetadataEntry = {
  dataset: string;
  provider: string;
  url: string;
  dataset_version?: string;
  source_revision?: string;
  last_updated_utc?: string;
  retrieved_at_utc?: string;
  record_count?: number;
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
