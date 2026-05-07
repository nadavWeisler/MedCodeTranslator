import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import SearchBar from './components/SearchBar';
import CodeList from './components/CodeList';
import SchemeTabs, { SCHEMES } from './components/SchemeTabs';
import { searchByScheme, type CodeEntry } from '../db/queries';
import type { SchemeKey } from '../db/database';
import { buildIndex, getSuggestions, getDidYouMean } from './services/fuzzySearch';
import i18n from '../i18n';

type Language = 'en' | 'he';
const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'he', label: 'עב' },
];

export default function HomeScreen() {
  const { t } = useTranslation();
  const [scheme, setScheme] = useState<SchemeKey>('atc5');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CodeEntry[]>([]);
  const [suggestions, setSuggestions] = useState<CodeEntry[]>([]);
  const [didYouMean, setDidYouMean] = useState<CodeEntry[]>([]);
  const [ghostText, setGhostText] = useState<string | undefined>();
  const [lang, setLang] = useState<Language>('en');
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeScheme = SCHEMES.find(s => s.key === scheme)!;

  // Build fuse index when scheme changes
  useEffect(() => {
    buildIndex(scheme).catch(console.error);
  }, [scheme]);

  // Run search + autocomplete on query change
  const runSearch = useCallback(
    async (q: string, s: SchemeKey, l: Language) => {
      // Autocomplete suggestions (fuse, immediate)
      const fuzzySuggestions = getSuggestions(q, s, 5);
      setSuggestions(fuzzySuggestions);

      // Ghost text: top suggestion that starts with current query
      const ghost = fuzzySuggestions.find(e => {
        const name = l === 'he' && e.name_he ? e.name_he : e.name_en;
        return name.toLowerCase().startsWith(q.toLowerCase()) && name !== q;
      });
      setGhostText(
        ghost
          ? (l === 'he' && ghost.name_he ? ghost.name_he : ghost.name_en)
          : undefined
      );

      if (!q.trim()) {
        setResults([]);
        setDidYouMean([]);
        return;
      }

      // Exact SQL search
      try {
        const data = await searchByScheme(s, q, l);
        setResults(data);
        // Only show "did you mean" when exact results are empty
        if (data.length === 0) {
          setDidYouMean(getDidYouMean(q, s, 3));
        } else {
          setDidYouMean([]);
        }
      } catch (e) {
        console.error('Search error:', e);
        setResults([]);
      }
    },
    []
  );

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(query, scheme, lang), 200);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, scheme, lang, runSearch]);

  const switchScheme = (s: SchemeKey) => {
    setScheme(s);
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setDidYouMean([]);
    setGhostText(undefined);
  };

  const handleSuggestionSelect = (item: CodeEntry) => {
    const name = lang === 'he' && item.name_he ? item.name_he : item.name_en;
    setQuery(name);
    setSuggestions([]);
  };

  const handleLanguageChange = (l: Language) => {
    setLang(l);
    i18n.changeLanguage(l);
  };

  const schemeColor = activeScheme.color;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, isWide && styles.containerWide]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('app_title')}</Text>
          <View style={styles.langPicker}>
            {LANGUAGES.map(l => (
              <TouchableOpacity
                key={l.code}
                style={[styles.langBtn, lang === l.code && { backgroundColor: schemeColor }]}
                onPress={() => handleLanguageChange(l.code)}
              >
                <Text style={[styles.langBtnText, lang === l.code && styles.langBtnTextActive]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Scheme selector */}
        <SchemeTabs active={scheme} onChange={switchScheme} />

        {/* Search bar with autocomplete */}
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${activeScheme.shortLabel} code or name…`}
          suggestions={suggestions}
          ghostText={ghostText}
          onSuggestionSelect={handleSuggestionSelect}
          schemeColor={schemeColor}
          lang={lang}
        />

        {/* Results */}
        <CodeList
          entries={results}
          query={query}
          lang={lang}
          t={t}
          fuzzyMatches={didYouMean}
          onFuzzySelect={handleSuggestionSelect}
          schemeColor={schemeColor}
          resultCount={results.length}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 8,
  },
  containerWide: {
    maxWidth: 860,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1e3a5f',
  },
  langPicker: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    padding: 2,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  langBtnText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  langBtnTextActive: {
    color: '#fff',
  },
});
