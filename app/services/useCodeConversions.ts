import { useEffect, useState } from 'react';
import { getCodeConversions } from '../../db/queries';
import type { SchemeKey, CodeConversion } from '@medcode/core';
import { groupConversions, type ConversionGroup } from './conversionConfig';

export type { ConversionGroup } from './conversionConfig';

type UseCodeConversionsOptions = {
  /** When true, hide ATC parent-level hierarchy rows (ATC-4 … ATC-1). */
  primaryOnly?: boolean;
};

/**
 * Fetches cross-scheme code conversions for the selected code.
 * Returns grouped conversions with common rows separated for the panel UI.
 */
export function useCodeConversions(
  scheme: SchemeKey,
  selectedCode: string | null,
  options: UseCodeConversionsOptions = {}
): { groups: ConversionGroup[]; loading: boolean } {
  const { primaryOnly = false } = options;
  const [groups, setGroups] = useState<ConversionGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedCode) {
      setGroups([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetch = async () => {
      try {
        const conversions = await getCodeConversions(scheme, selectedCode);
        const visible = primaryOnly
          ? conversions.filter(conversion => conversion.relation !== 'hierarchy')
          : conversions;
        if (!cancelled) {
          setGroups(groupConversions(visible));
        }
      } catch {
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [scheme, selectedCode, primaryOnly]);

  return { groups, loading };
}

/** Re-export for tests and legacy crosswalk consumers. */
export type { CodeConversion };
