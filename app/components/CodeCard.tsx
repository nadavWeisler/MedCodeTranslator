import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { CodeEntry } from '../../db/queries';

type Props = {
  entry: CodeEntry;
  lang: string;
  schemeColor: string;
  summaryMode?: boolean;
};

const SUMMARY_MAX_LINES = 2;
const DETAIL_MAX_LINES = 4;

function normalizeList(values?: string[] | null): string[] {
  if (!values) return [];
  return values
    .map(value => value.trim())
    .filter(Boolean);
}

export default function CodeCard({ entry, lang, schemeColor, summaryMode = false }: Props) {
  const primaryName = lang === 'he' && entry.name_he ? entry.name_he : entry.name_en;
  const secondaryName = lang === 'he' && entry.name_he ? entry.name_en : null;
  const description = entry.metadata?.description ?? null;
  const sourceType = entry.metadata?.sourceType ?? null;
  const synonyms = normalizeList(entry.metadata?.synonyms);
  const applicableConditions = normalizeList(entry.metadata?.applicableConditions);

  const visibleConditions = summaryMode ? applicableConditions.slice(0, 3) : applicableConditions;
  const hiddenConditionCount = applicableConditions.length - visibleConditions.length;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.codeBadge, { backgroundColor: schemeColor + '18' }]}>
          <Text style={[styles.codeText, { color: schemeColor, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}>
            {entry.code}
          </Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.name} numberOfLines={SUMMARY_MAX_LINES}>{primaryName}</Text>
          {secondaryName && (
            <Text style={styles.altName} numberOfLines={1}>{secondaryName}</Text>
          )}
        </View>
      </View>

      {description && (
        <Text style={styles.description} numberOfLines={summaryMode ? SUMMARY_MAX_LINES : DETAIL_MAX_LINES}>
          {description}
        </Text>
      )}

      {(sourceType || visibleConditions.length > 0) && (
        <View style={styles.metaRow}>
          {sourceType && (
            <View style={[styles.chip, styles.sourceChip]}>
              <Text style={styles.chipLabel}>Source</Text>
              <Text style={styles.chipValue} numberOfLines={1}>{sourceType}</Text>
            </View>
          )}
          {visibleConditions.map((condition, index) => (
            <View key={`${entry.code}-condition-${index}`} style={[styles.chip, styles.conditionChip]}>
              <Text style={styles.chipLabel}>Condition</Text>
              <Text style={styles.chipValue} numberOfLines={1}>{condition}</Text>
            </View>
          ))}
          {hiddenConditionCount > 0 && (
            <View style={[styles.chip, styles.moreChip]}>
              <Text style={styles.moreText}>+{hiddenConditionCount} more</Text>
            </View>
          )}
        </View>
      )}

      {synonyms.length > 0 && (
        <View style={styles.synonymsWrap}>
          <Text style={styles.synonymsLabel}>Synonyms</Text>
          <Text style={styles.synonymsText} numberOfLines={summaryMode ? SUMMARY_MAX_LINES : DETAIL_MAX_LINES}>
            {synonyms.join(', ')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5edf6',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
  },
  codeBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '600',
  },
  altName: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    fontStyle: 'italic',
  },
  description: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  sourceChip: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  conditionChip: {
    backgroundColor: '#ecfeff',
    borderColor: '#a5f3fc',
  },
  moreChip: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  chipLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    color: '#64748b',
    fontWeight: '700',
  },
  chipValue: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '500',
    flexShrink: 1,
  },
  moreText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  synonymsWrap: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  synonymsLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  synonymsText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
});
