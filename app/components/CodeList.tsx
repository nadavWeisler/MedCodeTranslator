import React from 'react';
import { FlatList, Text, StyleSheet, View } from 'react-native';
import CodeCard from './CodeCard';
import SuggestionItem from './SuggestionItem';
import type { CodeEntry } from '../../db/queries';
import type { MetadataRow } from '../services/useSelectedCodeResult';

type Props = {
  entries: CodeEntry[];
  query: string;
  lang: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  fuzzyMatches?: CodeEntry[];   // "did you mean" suggestions
  onFuzzySelect?: (item: CodeEntry) => void;
  schemeColor: string;
  resultCount: number;
  onEntrySelect?: (entry: CodeEntry) => void;
  selectedCode?: string | null;
  selectedMetadataRows?: MetadataRow[];
};

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
}: Props) {
  const isRTL = lang === 'he' || lang === 'ar';

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
      <FlatList
        data={entries}
        keyExtractor={item => item.code}
        renderItem={({ item }) => (
          <CodeCard
            entry={item}
            lang={lang}
            schemeColor={schemeColor}
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
    gap: 12,
  },
  listView: {
    flex: 1,
  },
  list: {
    paddingBottom: 10,
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
    paddingHorizontal: 24,
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
    paddingVertical: 12,
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
