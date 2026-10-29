export type ProvenanceKind = 'retrieved' | 'third-party' | 'hand-entered' | 'agent-authored';

export type ProvenanceChip = {
  dataset: string;
  provenanceKey: string;
  kind: ProvenanceKind;
  labelKey: string;
  authoritative: boolean;
  href: string | null;
  translated: boolean;
};

export type ProvenanceRole = 'record' | 'hebrew';

export const PROVENANCE_KINDS: ProvenanceKind[];
export const SHIPPED_DATASETS: [string, string][];

export function validateDatasetRecords(
  dataset: string,
  records: unknown[],
  metadata?: unknown
): string[];

export function validateShippedRecordMap(
  recordMap: Record<string, unknown[]>,
  metadata?: unknown
): string[];

export function resolveChip(
  dataset: string,
  code: string | null,
  role: ProvenanceRole,
  metadata?: unknown
): ProvenanceChip | null;

export function resolveTranslationChip(
  dataset: string,
  code: string | null,
  metadata?: unknown
): ProvenanceChip | null;

export function chipForConversion(
  relation: 'crosswalk' | 'mapping' | 'hierarchy',
  targetScheme: string,
  targetCode: string,
  metadata?: unknown
): ProvenanceChip | null;
