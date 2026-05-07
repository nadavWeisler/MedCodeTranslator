import React from 'react';
import { FlatList, Text, StyleSheet, View } from 'react-native';
import CodeCard from './CodeCard';
import SuggestionItem from './SuggestionItem';
import type { CodeEntry } from '../../db/queries';

type Props = {
  entries: CodeEntry[];
  query: string;
  lang: string;
  t: (key: string) => string;
  fuzzyMatches?: CodeEntry[];   // "did you mean" suggestions
  onFuzzySelect?: (item: CodeEntry) => void;
  schemeColor: string;
  resultCount: number;
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
}: Props) {
  if (!query.trim()) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>💊🩺🧪</Text>
        <Text style={styles.emptyHint}>Type a code or a name to search</Text>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.noResults}>
        <Text style={styles.noResultsText}>{t('no_results')}</Text>
        {fuzzyMatches.length > 0 && (
          <View style={styles.didYouMean}>
            <Text style={styles.didYouMeanTitle}>Did you mean…</Text>
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
    <>
      <Text style={[styles.countBadge, { color: schemeColor }]}>
        {resultCount}{resultCount === 100 ? '+' : ''} result{resultCount !== 1 ? 's' : ''}
      </Text>
      <FlatList
        data={entries}
        keyExtractor={item => item.code}
        renderItem={({ item }) => (
          <CodeCard entry={item} lang={lang} schemeColor={schemeColor} />
        )}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 24,
  },
  countBadge: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 44,
  },
  emptyHint: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 260,
  },
  noResults: {
    paddingTop: 32,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 20,
  },
  didYouMean: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  didYouMeanTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
});
