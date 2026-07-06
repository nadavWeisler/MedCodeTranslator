import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import type { CrossSchemeScoredEntry, SchemeKey } from '@medcode/core';
import { SCHEMES } from './SchemeTabs';
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
  entry: CrossSchemeScoredEntry;
  lang: string;
  schemeColor: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  isSelected?: boolean;
  onPress?: (entry: CrossSchemeScoredEntry) => void;
  metadataRows?: MetadataRow[];
  onCopyLink?: () => void;
  onCopyCode?: () => void;
  shareNotice?: string | null;
};

export default function CodeCard({
  entry,
  lang,
  schemeColor,
  t,
  isSelected = false,
  onPress,
  metadataRows = [],
  onCopyLink,
  onCopyCode,
  shareNotice = null,
}: Props) {
  const rtl = isRTL(lang);
  const textAlign = rtl ? 'right' : 'left';
  const showHebrewPrimary = lang === 'he' && !!entry.name_he;
  const primaryName = showHebrewPrimary ? entry.name_he! : entry.name_en;
  const primaryHighlights = !showHebrewPrimary ? entry.highlights : undefined;
  const secondaryName = showHebrewPrimary ? entry.name_en : null;
  const showEnglishOnlyChip = lang !== 'en' && !entry.name_he;
  const showMetadata = isSelected && metadataRows.length > 0;
  const showShareActions = isSelected && (onCopyLink || onCopyCode);
  const schemeLabel = entry.scheme
    ? SCHEMES.find(item => item.key === entry.scheme)?.shortLabel ?? entry.scheme.toUpperCase()
    : null;
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
          {schemeLabel ? (
            <Text style={[styles.schemeBadgeText, { color: schemeColor }]}>{schemeLabel}</Text>
          ) : null}
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
      {showShareActions && (
        <View style={styles.shareRow}>
          {onCopyLink ? (
            <TouchableOpacity
              style={[styles.shareBtn, { borderColor: `${schemeColor}35` }]}
              onPress={onCopyLink}
              accessibilityRole="button"
              accessibilityLabel={t('share_copy_link_a11y')}
            >
              <Text style={[styles.shareBtnText, { color: schemeColor }]}>{t('share_copy_link')}</Text>
            </TouchableOpacity>
          ) : null}
          {onCopyCode ? (
            <TouchableOpacity
              style={[styles.shareBtn, { borderColor: `${schemeColor}35` }]}
              onPress={onCopyCode}
              accessibilityRole="button"
              accessibilityLabel={t('share_copy_code_a11y')}
            >
              <Text style={[styles.shareBtnText, { color: schemeColor }]}>{t('share_copy_code')}</Text>
            </TouchableOpacity>
          ) : null}
          {shareNotice ? <Text style={styles.shareNotice}>{shareNotice}</Text> : null}
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
  schemeBadgeText: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
  shareRow: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  shareBtn: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surfaceRaised,
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shareNotice: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
