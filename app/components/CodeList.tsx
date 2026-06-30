import React from 'react';
import { SectionList, Text, StyleSheet, View, ScrollView } from 'react-native';
import CodeCard from './CodeCard';
import SuggestionItem from './SuggestionItem';
import SearchChipRow from './SearchChipRow';
import CodeConversionsPanel from './CodeConversionsPanel';
import type { ScoredEntry } from '@medcode/core';
import type { SchemeKey } from '../../db/database';
import type { MetadataRow } from '../services/useSelectedCodeResult';
import type { ConversionGroup } from '../services/conversionConfig';
import { isRTL as checkRTL } from '../services/rtl';
import { spacing } from '../constants/spacing';
import { colors, radii, typography } from '../constants/theme';
import ClinicalIcon from './ClinicalIcon';

const MONO = typography.monoFamily;

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
  conversionGroups?: ConversionGroup[];
  conversionsLoading?: boolean;
  onOpenConversion?: (targetScheme: SchemeKey, targetCode: string) => void;
  recentSearches?: string[];
  exampleSearches?: string[];
  onQuickSearch?: (query: string) => void;
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
  conversionGroups = [],
  conversionsLoading = false,
  onOpenConversion,
  recentSearches = [],
  exampleSearches = [],
  onQuickSearch,
}: Props) {
  const isRTL = checkRTL(lang);
  const sections = groupEntries(entries);

  if (!query.trim()) {
    const hasQuickActions = recentSearches.length > 0 || exampleSearches.length > 0;

    return (
      <ScrollView
        style={styles.idleScroll}
        contentContainerStyle={styles.idleContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stateCard}>
          <ClinicalIcon name="codes" size={48} color={schemeColor} />
          <Text style={[styles.stateTitle, isRTL ? styles.textRight : styles.textLeft]}>
            {t('empty_state_title')}
          </Text>
          <Text style={[styles.stateBody, isRTL ? styles.textRight : styles.textLeft]}>
            {t('empty_state_body')}
          </Text>

          {hasQuickActions && onQuickSearch ? (
            <View style={styles.quickSearchArea}>
              <SearchChipRow
                title={t('recent_searches_title')}
                queries={recentSearches}
                schemeColor={schemeColor}
                isRTL={isRTL}
                onSelect={onQuickSearch}
                accessibilityLabelPrefix={t('recent_search_chip_a11y')}
              />
              <SearchChipRow
                title={t('example_searches_title')}
                queries={exampleSearches}
                schemeColor={schemeColor}
                isRTL={isRTL}
                onSelect={onQuickSearch}
                accessibilityLabelPrefix={t('example_search_chip_a11y')}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.stateCard}>
        <ClinicalIcon name="search" size={44} color={schemeColor} />
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
      {selectedCode && (conversionGroups.length > 0 || conversionsLoading) && onOpenConversion ? (
        <CodeConversionsPanel
          groups={conversionGroups}
          loading={conversionsLoading}
          schemeColor={schemeColor}
          sourceCode={selectedCode}
          t={t}
          onOpenConversion={onOpenConversion}
        />
      ) : null}
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
              <Text style={[styles.groupTitle, { color: schemeColor, fontFamily: MONO }]}>
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
    backgroundColor: colors.surface,
  },
  groupTitle: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  countBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  stateCard: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    gap: 14,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  idleScroll: {
    flex: 1,
    minHeight: 0,
  },
  idleContent: {
    flexGrow: 1,
  },
  quickSearchArea: {
    width: '100%',
    marginTop: 8,
    gap: 14,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  stateBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 360,
    fontWeight: '500',
  },
  didYouMean: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  didYouMeanTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
});
