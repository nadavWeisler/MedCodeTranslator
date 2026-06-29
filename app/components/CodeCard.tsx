import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import type { ScoredEntry } from '@medcode/core';
import type { MetadataRow } from '../services/useSelectedCodeResult';
import { isRTL } from '../services/rtl';
import { spacing } from '../constants/spacing';
import { colors, radii, typography } from '../constants/theme';
import HighlightedText from './HighlightedText';

const MONO = typography.monoFamily;

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
};

export default function CodeCard({
  entry,
  lang,
  schemeColor,
  t,
  isSelected = false,
  onPress,
  metadataRows = [],
}: Props) {
  const rtl = isRTL(lang);
  const textAlign = rtl ? 'right' : 'left';
  const showHebrewPrimary = lang === 'he' && !!entry.name_he;
  const primaryName = showHebrewPrimary ? entry.name_he! : entry.name_en;
  const primaryHighlights = !showHebrewPrimary ? entry.highlights : undefined;
  const secondaryName = showHebrewPrimary ? entry.name_en : null;
  const showEnglishOnlyChip = lang !== 'en' && !entry.name_he;
  const showMetadata = isSelected && metadataRows.length > 0;
  const matchKey = MATCH_METHOD_KEYS[entry.matchMethod] ?? 'match_substring';
  const matchLabel = t(matchKey);
  const scorePercent = Math.round(entry.score * 100);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && {
          borderColor: `${schemeColor}66`,
          backgroundColor: `${schemeColor}08`,
          borderLeftColor: schemeColor,
        },
      ]}
      onPress={onPress ? () => onPress(entry) : undefined}
      activeOpacity={0.85}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Select code ${entry.code}` : undefined}
      accessibilityState={onPress ? { selected: isSelected } : undefined}
    >
      <View style={styles.row}>
        <View style={[styles.codeBadge, { backgroundColor: `${schemeColor}14`, borderColor: `${schemeColor}28` }]}>
          <Text style={[styles.codeText, { color: schemeColor, fontFamily: MONO }]}>
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
          <Text style={[styles.methodBadge, { color: schemeColor, borderColor: `${schemeColor}35`, backgroundColor: `${schemeColor}0D` }]}>
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  codeBadge: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    minWidth: 76,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
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
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    textTransform: 'uppercase',
  },
  scoreText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  name: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  englishOnlyChip: {
    alignSelf: 'flex-start',
    fontSize: 9,
    fontWeight: '700',
    color: colors.demo,
    backgroundColor: colors.demoBg,
    borderColor: colors.demoBorder,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  englishOnlyChipRtl: {
    alignSelf: 'flex-end',
  },
  altName: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 10,
    fontWeight: '500',
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
    borderTopColor: colors.borderLight,
    paddingTop: 10,
    gap: 8,
  },
  metadataRow: {
    gap: 2,
  },
  metadataLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  metadataValue: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
