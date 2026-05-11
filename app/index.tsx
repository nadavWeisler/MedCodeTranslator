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
import { useLocalSearchParams } from 'expo-router';

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
  { code: 'he', label: 'עברית' },
];

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ q?: string | string[]; scheme?: string | string[]; lang?: string | string[] }>();

  const initialSchemeParam = firstParam(params.scheme);
  const initialScheme: SchemeKey =
    initialSchemeParam && SCHEMES.some(s => s.key === initialSchemeParam)
      ? (initialSchemeParam as SchemeKey)
      : 'atc5';

  const initialLangParam = firstParam(params.lang);
  const initialLang: Language = initialLangParam === 'he' ? 'he' : 'en';

  const [scheme, setScheme] = useState<SchemeKey>(initialScheme);
  const [query, setQuery] = useState(firstParam(params.q) ?? '');
  const [results, setResults] = useState<CodeEntry[]>([]);
  const [suggestions, setSuggestions] = useState<CodeEntry[]>([]);
  const [didYouMean, setDidYouMean] = useState<CodeEntry[]>([]);
  const [ghostText, setGhostText] = useState<string | undefined>();
  const [lang, setLang] = useState<Language>(initialLang);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1120;
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeScheme = SCHEMES.find(s => s.key === scheme)!;
  const activeLanguage = LANGUAGES.find(l => l.code === lang)!;
  const isHebrew = lang === 'he';

  useEffect(() => {
    i18n.changeLanguage(lang);
  }, [lang]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const previousBodyBackground = document.body.style.backgroundColor;
    const previousBodyFontFamily = document.body.style.fontFamily;
    const previousHtmlBackground = document.documentElement.style.backgroundColor;

    document.documentElement.style.backgroundColor = '#edf4f8';
    document.body.style.backgroundColor = '#edf4f8';
    document.body.style.fontFamily =
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    return () => {
      document.documentElement.style.backgroundColor = previousHtmlBackground;
      document.body.style.backgroundColor = previousBodyBackground;
      document.body.style.fontFamily = previousBodyFontFamily;
    };
  }, []);

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
  };

  const schemeColor = activeScheme.color;
  const directionalText = isHebrew ? styles.textRight : styles.textLeft;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        style={[
          styles.page,
          {
            paddingHorizontal: isTablet ? 24 : 16,
            paddingTop: Platform.OS === 'web' ? (isTablet ? 28 : 18) : 12,
          },
        ]}
      >
        <View style={[styles.heroCard, isDesktop && styles.heroCardDesktop]}>
          <View style={styles.heroCopy}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{t('hero_badge')}</Text>
            </View>

            <Text
              style={[
                styles.heroTitle,
                isTablet && styles.heroTitleTablet,
                isDesktop && styles.heroTitleDesktop,
                directionalText,
              ]}
            >
              {t('app_title')}
            </Text>
            <Text style={[styles.heroSubtitle, directionalText]}>{t('hero_subtitle')}</Text>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{SCHEMES.length}</Text>
                <Text style={styles.heroStatLabel}>{t('hero_stat_systems')}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>EN + עברית</Text>
                <Text style={styles.heroStatLabel}>{t('hero_stat_bilingual')}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>SQLite</Text>
                <Text style={styles.heroStatLabel}>{t('hero_stat_offline')}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.heroSide, isDesktop && styles.heroSideDesktop]}>
            <View style={styles.heroControlCard}>
              <Text style={styles.heroControlLabel}>{t('language')}</Text>
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

            <View style={styles.heroHighlightCard}>
              <Text style={styles.heroHighlightLabel}>{t('hero_highlight_label')}</Text>
              <Text style={styles.heroHighlightValue}>{activeScheme.label}</Text>
              <Text style={styles.heroHighlightHint}>{t('hero_highlight_body')}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.workspace, isDesktop && styles.workspaceDesktop]}>
          <View style={[styles.searchPanel, isDesktop && styles.searchPanelDesktop]}>
            <Text style={styles.sectionLabel}>{t('search_workspace_label')}</Text>
            <Text style={[styles.sectionTitle, directionalText]}>{t('search_workspace_title')}</Text>
            <Text style={[styles.sectionDescription, directionalText]}>{t('search_workspace_body')}</Text>

            <SchemeTabs active={scheme} onChange={switchScheme} hintLabel={t('search_by_code_or_name')} />

            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder={t('search_placeholder_generic', { schemeLabel: activeScheme.shortLabel })}
              suggestions={suggestions}
              ghostText={ghostText}
              onSuggestionSelect={handleSuggestionSelect}
              schemeColor={schemeColor}
              lang={lang}
            />

            <View style={styles.helperRow}>
              <View style={styles.helperChip}>
                <Text style={styles.helperChipLabel}>{t('scheme')}</Text>
                <Text style={styles.helperChipValue}>{activeScheme.shortLabel}</Text>
              </View>
              <View style={styles.helperChip}>
                <Text style={styles.helperChipLabel}>{t('language')}</Text>
                <Text style={styles.helperChipValue}>{activeLanguage.label}</Text>
              </View>
            </View>
          </View>

          <View style={styles.resultsPanel}>
            <View style={[styles.resultsHeader, !isDesktop && styles.resultsHeaderStacked]}>
              <View style={styles.resultsHeaderCopy}>
                <Text style={styles.sectionLabel}>{t('results_label')}</Text>
                <Text style={[styles.resultsTitle, directionalText]}>
                  {t(query.trim() ? 'results_title_active' : 'results_title_idle')}
                </Text>
              </View>

              <View style={[styles.resultsBadge, { backgroundColor: `${schemeColor}14`, borderColor: `${schemeColor}30` }]}>
                <Text style={[styles.resultsBadgeText, { color: schemeColor }]}>{activeScheme.shortLabel}</Text>
              </View>
            </View>

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
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#edf4f8',
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
    paddingBottom: 18,
    gap: 18,
  },
  heroCard: {
    backgroundColor: '#113349',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2e556c',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 8,
    gap: 20,
  },
  heroCardDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  heroCopy: {
    flex: 1,
    gap: 14,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  heroBadgeText: {
    color: '#dcecf5',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#f8fbfd',
    letterSpacing: -0.6,
  },
  heroTitleTablet: {
    fontSize: 34,
    lineHeight: 40,
  },
  heroTitleDesktop: {
    fontSize: 40,
    lineHeight: 46,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#d2e2ec',
    maxWidth: 720,
  },
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  heroStat: {
    minWidth: 120,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 4,
  },
  heroStatValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  heroStatLabel: {
    color: '#c4d7e3',
    fontSize: 12,
    fontWeight: '600',
  },
  heroSide: {
    width: '100%',
    gap: 14,
  },
  heroSideDesktop: {
    maxWidth: 288,
  },
  heroControlCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 12,
  },
  heroControlLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#dcecf5',
  },
  heroHighlightCard: {
    backgroundColor: '#f8fbfd',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#d7e4eb',
    gap: 6,
  },
  heroHighlightLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#5c7286',
  },
  heroHighlightValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#113349',
  },
  heroHighlightHint: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748b',
  },
  workspace: {
    flex: 1,
    gap: 18,
  },
  workspaceDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  searchPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#d8e4eb',
    shadowColor: '#12344d',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    gap: 16,
  },
  searchPanelDesktop: {
    width: 380,
    flexShrink: 0,
  },
  resultsPanel: {
    flex: 1,
    minHeight: 360,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#d8e4eb',
    shadowColor: '#12344d',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    gap: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: '#5d7588',
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: '#113349',
    letterSpacing: -0.4,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: '#66788a',
  },
  langPicker: {
    flexDirection: 'row',
    backgroundColor: 'rgba(235,245,251,0.16)',
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  langBtnText: {
    fontSize: 13,
    color: '#dcecf5',
    fontWeight: '700',
  },
  langBtnTextActive: {
    color: '#fff',
  },
  helperRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  helperChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#f3f8fb',
    borderWidth: 1,
    borderColor: '#dce6ed',
    gap: 2,
  },
  helperChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#6a7d8f',
    textTransform: 'uppercase',
  },
  helperChipValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#113349',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  resultsHeaderStacked: {
    flexDirection: 'column',
  },
  resultsHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  resultsTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: '#113349',
    letterSpacing: -0.4,
  },
  resultsBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resultsBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
});
