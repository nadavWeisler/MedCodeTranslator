import { useEffect, useState } from 'react';
import { getCodeConversions } from '../../db/queries';
import type { SchemeKey, CodeConversion } from '@medcode/core';
import { groupConversions, type ConversionGroup } from './conversionConfig';

export type { ConversionGroup } from './conversionConfig';

/**
 * Fetches cross-scheme code conversions for the selected code.
 * Returns grouped conversions with common rows separated for the panel UI.
 */
export function useCodeConversions(
  scheme: SchemeKey,
  selectedCode: string | null
): { groups: ConversionGroup[]; loading: boolean } {
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
        if (!cancelled) {
          setGroups(groupConversions(conversions));
        }
      } catch {
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [scheme, selectedCode]);

  return { groups, loading };
}

/** Re-export for tests and legacy crosswalk consumers. */
export type { CodeConversion };
