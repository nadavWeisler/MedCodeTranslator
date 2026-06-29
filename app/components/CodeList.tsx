import React from 'react';
import { Platform, SectionList, Text, StyleSheet, View } from 'react-native';
import CodeCard from './CodeCard';
import SuggestionItem from './SuggestionItem';
import type { ScoredEntry } from '@medcode/core';
import type { MetadataRow } from '../services/useSelectedCodeResult';
import type { CrosswalkDisplayRow } from '../services/useCrosswalk';
import { isRTL as checkRTL } from '../services/rtl';
import { spacing, radius } from '../constants/spacing';

const MONOSPACE_FONT = Platform.OS === 'web' ? 'monospace' : undefined;

type Props = {
  entries: ScoredEntry[];
  query: string;
  lang: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  fuzzyMatches?: ScoredEntry[];
  onFuzzySelect?: (item: ScoredEntry) => void;
  schemeColor: string;
  resultCount: number;
  onEntrySelect?: (entry: ScoredEntry) => void;
  selectedCode?: string | null;
  selectedMetadataRows?: MetadataRow[];
  selectedCrosswalkRows?: CrosswalkDisplayRow[];
  crosswalkScheme?: 'icd9' | 'icd10';
};

type ResultSection = {
  title: string | null;
  data: ScoredEntry[];
};

function getCodeGroup(code: string): string {
  return code.split('.')[0] || code;
}

function groupEntries(entries: ScoredEntry[]): ResultSection[] {
  const grouped = new Map<string, ScoredEntry[]>();

  for (const entry of entries) {
    const group = getCodeGroup(entry.code);
    const groupEntries = grouped.get(group) ?? [];
    groupEntries.push(entry);
    grouped.set(group, groupEntries);
  }

  return [...grouped.entries()].map(([group, groupEntries]) => ({
    title: groupEntries.length > 1 ? group : null,
    data: groupEntries,
  }));
}

export default function CodeList({
  entries,
  query,
  lang,
  t,
  fuzzyMatches = [],
  onFuzzySelect,
  schemeColor,
  resultCount,
  onEntrySelect,
  selectedCode,
  selectedMetadataRows = [],
  selectedCrosswalkRows = [],
  crosswalkScheme,
}: Props) {
  const isRTL = checkRTL(lang);
  const sections = groupEntries(entries);

  if (!query.trim()) {
    return (
      <View style={styles.stateCard}>
        <Text style={styles.stateIcon}>🩺</Text>
        <Text style={[styles.stateTitle, isRTL ? styles.textRight : styles.textLeft]}>
          {t('empty_state_title')}
        </Text>
        <Text style={[styles.stateBody, isRTL ? styles.textRight : styles.textLeft]}>
          {t('empty_state_body')}
        </Text>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.stateCard}>
        <Text style={styles.stateIcon}>🔎</Text>
        <Text style={[styles.stateTitle, isRTL ? styles.textRight : styles.textLeft]}>{t('no_results')}</Text>
        {fuzzyMatches.length > 0 && (
          <View style={styles.didYouMean}>
            <Text style={[styles.didYouMeanTitle, isRTL ? styles.textRight : styles.textLeft]}>
              {t('did_you_mean')}
            </Text>
            {fuzzyMatches.map(item => (
              <SuggestionItem
                key={item.code}
                item={item}
                lang={lang}
                schemeColor={schemeColor}
                onPress={onFuzzySelect ?? (() => {})}
                t={t}
              />
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.resultsContainer}>
      <View style={[styles.countBadge, { backgroundColor: `${schemeColor}14`, borderColor: `${schemeColor}24` }]}>
        <Text style={[styles.countBadgeText, { color: schemeColor }]}>
          {t('results_count', { count: resultCount === 100 ? '100+' : resultCount })}
        </Text>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={item => item.code}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <View style={styles.groupHeader}>
              <Text style={[styles.groupTitle, { color: schemeColor, fontFamily: MONOSPACE_FONT }]}>
                {section.title}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <CodeCard
            entry={item}
            lang={lang}
            schemeColor={schemeColor}
            t={t}
            onPress={onEntrySelect}
            isSelected={item.code === selectedCode}
            metadataRows={item.code === selectedCode ? selectedMetadataRows : []}
            crosswalkRows={item.code === selectedCode ? selectedCrosswalkRows : []}
            crosswalkScheme={crosswalkScheme}
          />
        )}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        style={styles.listView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  resultsContainer: {
    flex: 1,
    minHeight: 0,
    gap: 12,
  },
  listView: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    paddingBottom: 10,
  },
  groupHeader: {
    paddingTop: 4,
    paddingBottom: 6,
    backgroundColor: '#ffffff',
  },
  groupTitle: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  countBadge: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  stateCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  stateIcon: {
    fontSize: 34,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#113349',
  },
  stateBody: {
    fontSize: 14,
    lineHeight: 21,
    color: '#66788a',
    textAlign: 'center',
    maxWidth: 320,
  },
  didYouMean: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  didYouMeanTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5f7488',
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
});
