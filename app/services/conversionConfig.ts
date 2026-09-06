import type { SchemeKey, CodeConversion } from '@medcode/core';

/** Default number of common conversions shown per target scheme before expanding. */
export const COMMON_CONVERSION_LIMIT = 3;

export type ConversionGroup = {
  targetScheme: SchemeKey;
  targetLabel: string;
  conversions: CodeConversion[];
  commonConversions: CodeConversion[];
  hiddenCount: number;
};

const SCHEME_LABELS: Record<SchemeKey, string> = {
  atc1: 'ATC-1',
  atc2: 'ATC-2',
  atc3: 'ATC-3',
  atc4: 'ATC-4',
  atc5: 'ATC-5',
  icd10: 'ICD-10-CM',
  icd9: 'ICD-9-CM',
  icd11: 'ICD-11',
  loinc: 'LOINC',
  hcpcs: 'HCPCS',
  cvx: 'CVX',
};

export function getSchemeLabel(scheme: SchemeKey): string {
  return SCHEME_LABELS[scheme];
}

/** Group conversions by target scheme and split common vs additional rows. */
export function groupConversions(
  conversions: CodeConversion[],
  limit = COMMON_CONVERSION_LIMIT
): ConversionGroup[] {
  const byTarget = new Map<SchemeKey, CodeConversion[]>();

  for (const conversion of conversions) {
    const list = byTarget.get(conversion.targetScheme) ?? [];
    list.push(conversion);
    byTarget.set(conversion.targetScheme, list);
  }

  return [...byTarget.entries()].map(([targetScheme, rows]) => {
    const commonRows = rows.filter(row => row.isCommon);
    const preferred = commonRows.length > 0 ? commonRows : rows;
    const commonConversions = preferred.slice(0, limit);
    const hiddenCount = Math.max(0, rows.length - commonConversions.length);

    return {
      targetScheme,
      targetLabel: getSchemeLabel(targetScheme),
      conversions: rows,
      commonConversions,
      hiddenCount,
    };
  });
}
