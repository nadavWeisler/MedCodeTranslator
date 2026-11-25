import { useEffect, useState } from 'react';
import { getCrosswalkFromIcd9, getCrosswalkFromIcd10 } from '../../db/queries';
import type { CrosswalkRow } from '../../db/queries';
import type { SchemeKey } from '@medcode/core';

export type CrosswalkDisplayRow = {
  sourceScheme: 'icd9' | 'icd10';
  targetScheme: 'icd9' | 'icd10';
  sourceCode: string;
  targetCode: string;
  targetName: string | null;
  /** Mapping cardinality badge: "1:1", "1:many", "many:1", "many:many" */
  cardinality: string;
  sourceLabel: string;
  targetLabel: string;
  mappingSource: 'Agent-authored';
};

const SCHEME_VERSION_LABELS: Record<'icd9' | 'icd10', string> = {
  icd9: 'ICD-9-CM',
  icd10: 'ICD-10-CM',
};

function rowToDisplay(row: CrosswalkRow, sourceScheme: 'icd9' | 'icd10'): CrosswalkDisplayRow {
  const targetScheme = sourceScheme === 'icd9' ? 'icd10' : 'icd9';

  return {
    sourceScheme,
    targetScheme,
    sourceCode: sourceScheme === 'icd9' ? row.icd9_code : row.icd10_code,
    targetCode: sourceScheme === 'icd9' ? row.icd10_code : row.icd9_code,
    targetName: row.target_name,
    cardinality: row.cardinality,
    sourceLabel: SCHEME_VERSION_LABELS[sourceScheme],
    targetLabel: SCHEME_VERSION_LABELS[targetScheme],
    mappingSource: 'Agent-authored',
  };
}

/**
 * Fetches ICD-9 ↔ ICD-10 crosswalk rows for the selected code when the
 * active scheme is 'icd9' or 'icd10'.
 *
 * Returns an empty array for all other schemes.
 *
 * The bundled crosswalk is an agent-authored sample, not a verified full CMS GEM extract.
 */
export function useCrosswalk(scheme: SchemeKey, selectedCode: string | null): CrosswalkDisplayRow[] {
  const [rows, setRows] = useState<CrosswalkDisplayRow[]>([]);

  useEffect(() => {
    if (!selectedCode || (scheme !== 'icd9' && scheme !== 'icd10')) {
      setRows([]);
      return;
    }

    let cancelled = false;

    const fetch = async () => {
      try {
        const raw =
          scheme === 'icd9'
            ? await getCrosswalkFromIcd9(selectedCode)
            : await getCrosswalkFromIcd10(selectedCode);
        if (!cancelled) {
          setRows(raw.map(row => rowToDisplay(row, scheme)));
        }
      } catch {
        if (!cancelled) setRows([]);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [scheme, selectedCode]);

  return rows;
}
