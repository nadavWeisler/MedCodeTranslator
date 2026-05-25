import { useEffect, useState } from 'react';
import { getCrosswalkFromIcd9, getCrosswalkFromIcd10 } from '../../db/queries';
import type { CrosswalkRow } from '../../db/queries';
import type { SchemeKey } from '@medcode/core';

export type CrosswalkDisplayRow = {
  /** ICD-9 code */
  icd9Code: string;
  /** ICD-10 code */
  icd10Code: string;
  /** Mapping cardinality badge: "1:1", "1:many", "many:1", "many:many" */
  cardinality: string;
};

function rowToDisplay(row: CrosswalkRow): CrosswalkDisplayRow {
  return {
    icd9Code: row.icd9_code,
    icd10Code: row.icd10_code,
    cardinality: row.cardinality,
  };
}

/**
 * Fetches ICD-9 ↔ ICD-10 crosswalk rows for the selected code when the
 * active scheme is 'icd9' or 'icd10'.
 *
 * Returns an empty array for all other schemes.
 *
 * Source: CMS General Equivalence Mappings (GEM),
 * https://www.cms.gov/Medicare/Coding/ICD10/2018-ICD-10-CM-and-GEMs
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
          setRows(raw.map(rowToDisplay));
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
