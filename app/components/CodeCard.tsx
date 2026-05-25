import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import type { ScoredEntry } from '@medcode/core';
import type { MetadataRow } from '../services/useSelectedCodeResult';
import type { CrosswalkDisplayRow } from '../services/useCrosswalk';
import { isRTL } from '../services/rtl';
import { spacing, radius } from '../constants/spacing';

const METHOD_LABEL: Record<string, string> = {
  exact: 'exact',
  prefix: 'prefix',
  substring: 'match',
  fuzzy: 'fuzzy',
  alias: 'alias',
};

type Props = {
  entry: ScoredEntry;
  lang: string;
  schemeColor: string;
  isSelected?: boolean;
  onPress?: (entry: ScoredEntry) => void;
  metadataRows?: MetadataRow[];
  crosswalkRows?: CrosswalkDisplayRow[];
  /** 'icd9' or 'icd10' to label crosswalk direction; undefined = no crosswalk */
  crosswalkScheme?: 'icd9' | 'icd10';
};

export default function CodeCard({
  entry,
  lang,
  schemeColor,
  isSelected = false,
  onPress,
  metadataRows = [],
  crosswalkRows = [],
  crosswalkScheme,
}: Props) {
  const primaryName = lang === 'he' && entry.name_he ? entry.name_he : entry.name_en;
  const secondaryName = lang === 'he' && entry.name_he ? entry.name_en : null;
  const showMetadata = isSelected && metadataRows.length > 0;
  const showCrosswalk = isSelected && crosswalkRows.length > 0;
  const textAlign = isRTL(lang) ? 'right' : 'left';
  const matchLabel = METHOD_LABEL[entry.matchMethod] ?? entry.matchMethod;
  const scorePercent = Math.round(entry.score * 100);

  const crosswalkTitle =
    crosswalkScheme === 'icd9'
      ? '→ ICD-10 equivalents (CMS GEM)'
      : crosswalkScheme === 'icd10'
      ? '← ICD-9 equivalents (CMS GEM)'
      : 'Code conversions (CMS GEM)';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderLeftColor: schemeColor },
        isSelected && { borderColor: schemeColor + '55', backgroundColor: schemeColor + '05' },
      ]}
      onPress={onPress ? () => onPress(entry) : undefined}
      activeOpacity={0.85}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Select code ${entry.code}` : undefined}
      accessibilityState={onPress ? { selected: isSelected } : undefined}
    >
      <View style={styles.row}>
        <View style={[styles.codeBadge, { backgroundColor: schemeColor + '18' }]}>
          <Text style={[styles.codeText, { color: schemeColor, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}>
            {entry.code}
          </Text>
        </View>
        <Text style={[styles.name, { textAlign }]} numberOfLines={2}>{primaryName}</Text>
        <View style={styles.scoreMeta}>
          <Text style={[styles.methodBadge, { color: schemeColor, borderColor: schemeColor + '40', backgroundColor: schemeColor + '10' }]}>
            {matchLabel}
          </Text>
          <Text style={styles.scoreText}>{scorePercent}%</Text>
        </View>
      </View>
      {secondaryName && (
        <Text style={[styles.altName, { textAlign }]} numberOfLines={1}>{secondaryName}</Text>
      )}
      {showMetadata && (
        <View style={styles.metadata}>
          {metadataRows.map(item => (
            <View key={item.key} style={styles.metadataRow}>
              <Text style={[styles.metadataLabel, { color: schemeColor }]}>{item.label}</Text>
              <Text style={styles.metadataValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      )}
      {showCrosswalk && (
        <View style={styles.crosswalk}>
          <Text style={[styles.crosswalkTitle, { color: schemeColor }]}>{crosswalkTitle}</Text>
          {crosswalkRows.map(row => (
            <View key={`${row.icd9Code}:${row.icd10Code}`} style={styles.crosswalkRow}>
              <View style={styles.crosswalkCodes}>
                <Text style={[styles.crosswalkCode, { color: schemeColor, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}>
                  {crosswalkScheme === 'icd9' ? row.icd10Code : row.icd9Code}
                </Text>
                {row.cardinality !== '1:1' && (
                  <Text style={[styles.crosswalkCardinality, { borderColor: schemeColor + '40', color: schemeColor }]}>
                    {row.cardinality}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  codeBadge: {
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  scoreMeta: {
    alignItems: 'flex-end',
    gap: 3,
    marginLeft: 4,
  },
  methodBadge: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    textTransform: 'uppercase',
  },
  scoreText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  name: {
    flex: 1,
    fontSize: 16,
    lineHeight: 23,
    color: '#102a3f',
    fontWeight: '700',
  },
  altName: {
    fontSize: 13,
    color: '#708495',
    marginTop: 10,
    marginLeft: 4,
  },
  metadata: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    gap: 8,
  },
  metadataRow: {
    gap: 2,
  },
  metadataLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  metadataValue: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  crosswalk: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    gap: 6,
  },
  crosswalkTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  crosswalkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crosswalkCodes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crosswalkCode: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  crosswalkCardinality: {
    fontSize: 10,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
});
