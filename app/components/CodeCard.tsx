import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import type { ScoredEntry } from '@medcode/core';
import type { MetadataRow } from '../services/useSelectedCodeResult';
import type { CrosswalkDisplayRow } from '../services/useCrosswalk';
import { isRTL } from '../services/rtl';
import { spacing } from '../constants/spacing';
import HighlightedText from './HighlightedText';

const MONOSPACE_FONT = Platform.OS === 'web' ? 'monospace' : undefined;

const MATCH_METHOD_KEYS: Record<string, string> = {
  exact: 'match_exact',
  prefix: 'match_prefix',
  substring: 'match_substring',
  fuzzy: 'match_fuzzy',
  alias: 'match_alias',
};

type Props = {
  entry: ScoredEntry;
  lang: string;
  schemeColor: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  isSelected?: boolean;
  onPress?: (entry: ScoredEntry) => void;
  metadataRows?: MetadataRow[];
  crosswalkRows?: CrosswalkDisplayRow[];
  crosswalkScheme?: 'icd9' | 'icd10';
};

export default function CodeCard({
  entry,
  lang,
  schemeColor,
  t,
  isSelected = false,
  onPress,
  metadataRows = [],
  crosswalkRows = [],
  crosswalkScheme,
}: Props) {
  const rtl = isRTL(lang);
  const textAlign = rtl ? 'right' : 'left';
  const showHebrewPrimary = lang === 'he' && !!entry.name_he;
  const primaryName = showHebrewPrimary ? entry.name_he! : entry.name_en;
  const primaryHighlights = !showHebrewPrimary ? entry.highlights : undefined;
  const secondaryName = showHebrewPrimary ? entry.name_en : null;
  const showEnglishOnlyChip = lang !== 'en' && !entry.name_he;
  const showMetadata = isSelected && metadataRows.length > 0;
  const showCrosswalk = isSelected && crosswalkRows.length > 0;
  const matchKey = MATCH_METHOD_KEYS[entry.matchMethod] ?? 'match_substring';
  const matchLabel = t(matchKey);
  const scorePercent = Math.round(entry.score * 100);

  const crosswalkDirection = crosswalkRows[0]
    ? `${crosswalkRows[0].sourceLabel} -> ${crosswalkRows[0].targetLabel}`
    : crosswalkScheme === 'icd9'
    ? 'ICD-9-CM -> ICD-10-CM'
    : crosswalkScheme === 'icd10'
    ? 'ICD-10-CM -> ICD-9-CM'
    : 'Version translation';

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
          <Text style={[styles.codeText, { color: schemeColor, fontFamily: MONOSPACE_FONT }]}>
            {entry.code}
          </Text>
        </View>
        <View style={styles.nameCol}>
          <HighlightedText
            text={primaryName}
            highlights={primaryHighlights}
            style={styles.name}
            textAlign={textAlign}
            numberOfLines={2}
          />
          {showEnglishOnlyChip ? (
            <Text style={[styles.englishOnlyChip, rtl ? styles.englishOnlyChipRtl : null]}>
              {t('terminology_english_only')}
            </Text>
          ) : null}
        </View>
        <View style={styles.scoreMeta}>
          <Text style={[styles.methodBadge, { color: schemeColor, borderColor: schemeColor + '40', backgroundColor: schemeColor + '10' }]}>
            {matchLabel}
          </Text>
          <Text style={styles.scoreText}>{scorePercent}%</Text>
        </View>
      </View>
      {secondaryName ? (
        <HighlightedText
          text={secondaryName}
          highlights={entry.highlights}
          style={[styles.altName, rtl ? styles.altNameRtl : styles.altNameLtr]}
          textAlign={textAlign}
          numberOfLines={1}
        />
      ) : null}
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
          <View style={styles.crosswalkHeader}>
            <Text style={[styles.crosswalkTitle, { color: schemeColor }]}>ICD family translation</Text>
            <Text style={styles.crosswalkSubtitle}>{crosswalkDirection} · CMS GEM</Text>
          </View>
          {crosswalkRows.map(row => (
            <View key={`${row.sourceCode}:${row.targetCode}`} style={styles.crosswalkRow}>
              <View style={styles.crosswalkCodes}>
                <Text style={[styles.crosswalkCode, { color: schemeColor, fontFamily: MONOSPACE_FONT }]}>
                  {row.targetCode}
                </Text>
                {row.cardinality !== '1:1' && (
                  <Text style={[styles.crosswalkCardinality, { borderColor: schemeColor + '40', color: schemeColor }]}>
                    {row.cardinality}
                  </Text>
                )}
              </View>
              {row.targetName ? (
                <Text style={styles.crosswalkName} numberOfLines={2}>{row.targetName}</Text>
              ) : null}
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
  nameCol: {
    flex: 1,
    gap: 4,
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
    fontSize: 16,
    lineHeight: 23,
    color: '#102a3f',
    fontWeight: '700',
  },
  englishOnlyChip: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '700',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  englishOnlyChipRtl: {
    alignSelf: 'flex-end',
  },
  altName: {
    fontSize: 13,
    color: '#708495',
    marginTop: 10,
  },
  altNameLtr: {
    marginLeft: 4,
  },
  altNameRtl: {
    marginRight: 4,
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
    gap: 8,
  },
  crosswalkHeader: {
    gap: 2,
  },
  crosswalkTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  crosswalkSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  crosswalkRow: {
    gap: 4,
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
  crosswalkName: {
    fontSize: 12,
    lineHeight: 17,
    color: '#475569',
  },
});
