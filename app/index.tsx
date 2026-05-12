import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SearchBar from './components/SearchBar';
import CodeList from './components/CodeList';
import SchemeTabs, { SCHEMES } from './components/SchemeTabs';
import { searchByScheme, type CodeEntry } from '../db/queries';
import type { SchemeKey } from '../db/database';
import { buildIndex, getSuggestions, getDidYouMean } from './services/fuzzySearch';
import { useSelectedCodeResult } from './services/useSelectedCodeResult';
import i18n from '../i18n';
import { DATASET_METADATA_GENERATED_AT, DATASET_SOURCES, formatDateLabel } from './services/sourceMetadata';

type Language = 'en' | 'he';
const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'he', label: 'עברית' },
];
const DISCLAIMER_ACK_KEY = 'medcodetranslator:disclaimer-ack:v1';

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
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
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isMobile = !isTablet;
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeScheme = SCHEMES.find(s => s.key === scheme)!;
  const { selectedCode, metadataRows, selectEntry } = useSelectedCodeResult(results);
  const isHebrew = lang === 'he';

  useEffect(() => {
    i18n.changeLanguage(lang);
  }, [lang]);

  useEffect(() => {
    AsyncStorage.getItem(DISCLAIMER_ACK_KEY)
      .then(value => {
        if (!value) setShowDisclaimer(true);
      })
      .catch(() => setShowDisclaimer(true));
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const previousBodyBackground = document.body.style.backgroundColor;
    const previousBodyFontFamily = document.body.style.fontFamily;
    const previousHtmlBackground = document.documentElement.style.backgroundColor;

    document.documentElement.style.backgroundColor = '#f6f7f9';
    document.body.style.backgroundColor = '#f6f7f9';

    // Load DM Sans from Google Fonts for a professional look
    const linkId = 'dm-sans-font';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400&display=swap';
      document.head.appendChild(link);
    }

    document.body.style.fontFamily =
      '"DM Sans", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

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
    selectEntry(item);
  };

  const handleLanguageChange = (l: Language) => {
    setLang(l);
  };

  const acknowledgeDisclaimer = async () => {
    await AsyncStorage.setItem(DISCLAIMER_ACK_KEY, 'accepted');
    setShowDisclaimer(false);
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
        <View style={[styles.header, isMobile && styles.headerMobile]}>
          <View style={styles.headerCopy}>
            <Text style={[styles.appTitle, isTablet && styles.appTitleTablet, directionalText]}>
              {t('app_title')}
            </Text>
            <Text style={[styles.appSubtitle, directionalText]} numberOfLines={1}>
              {t('hero_subtitle')}
            </Text>
          </View>

          <View style={[styles.langPicker, isMobile && styles.langPickerMobile]}>
            {LANGUAGES.map(l => (
              <TouchableOpacity
                key={l.code}
                style={[
                  styles.langBtn,
                  lang === l.code && { backgroundColor: `${schemeColor}14`, borderColor: `${schemeColor}50` },
                ]}
                onPress={() => handleLanguageChange(l.code)}
              >
                <Text
                  style={[
                    styles.langBtnText,
                    lang === l.code && { color: schemeColor },
                  ]}
                >
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.shell}>
          <View style={styles.shellInner}>
            <View style={styles.controlsCol}>
              <SchemeTabs
                active={scheme}
                onChange={switchScheme}
                hintLabel={t('search_by_code_or_name')}
                compact
              />

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

              <View style={styles.contextRow}>
                <View style={[styles.contextPill, { backgroundColor: `${schemeColor}10`, borderColor: `${schemeColor}30` }]}>
                  <Text style={[styles.contextPillText, { color: schemeColor }]}>{activeScheme.shortLabel}</Text>
                </View>
              </View>
            </View>

            <View style={styles.resultsCol}>
              <Text style={styles.resultsTitleMinimal}>
                {t(query.trim() ? 'results_title_active' : 'results_title_idle')}
              </Text>
              <CodeList
                entries={results}
                query={query}
                lang={lang}
                t={t}
                fuzzyMatches={didYouMean}
                onFuzzySelect={handleSuggestionSelect}
                schemeColor={schemeColor}
                resultCount={results.length}
                onEntrySelect={selectEntry}
                selectedCode={selectedCode}
                selectedMetadataRows={metadataRows}
              />
            </View>
          </View>
        </View>

        <View style={styles.complianceFooter}>
          <Text style={[styles.complianceTitle, directionalText]}>Informational use only</Text>
          <Text style={[styles.complianceBody, directionalText]}>
            MedCodeTranslator is an informational reference tool only and is not intended for diagnosis, treatment decisions, prescribing, or medical advice.
          </Text>
          <Text style={[styles.noPhiBody, directionalText]}>
            Do not enter patient-identifiable or protected health information (PHI) into this application.
          </Text>
          <Text style={[styles.complianceBody, directionalText]}>
            Last updated: {formatDateLabel(DATASET_METADATA_GENERATED_AT)}
          </Text>
          <View style={styles.complianceActions}>
            <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/about')}>
              <Text style={styles.linkBtnText}>About & Data Sources</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/legal/terms')}>
              <Text style={styles.linkBtnText}>Terms</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/legal/privacy')}>
              <Text style={styles.linkBtnText}>Privacy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal visible={showDisclaimer} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Important safety notice</Text>
            <Text style={styles.modalBody}>
              MedCodeTranslator is an informational reference tool only and is not intended for diagnosis, treatment decisions, prescribing, or medical advice.
            </Text>
            <Text style={styles.modalBody}>
              Always verify medication information using official clinical systems, licensed medical databases, and institutional procedures.
            </Text>
            <Text style={styles.modalBody}>
              No warranty is provided regarding the accuracy, completeness, or timeliness of the information presented.
            </Text>
            <Text style={styles.modalWarn}>Do not enter patient-identifiable or protected health information (PHI).</Text>
            <Text style={styles.modalBody}>Current source entries: {DATASET_SOURCES.length}</Text>
            <TouchableOpacity style={styles.modalButton} onPress={acknowledgeDisclaimer}>
              <Text style={styles.modalButtonText}>I understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f7f9',
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingBottom: 18,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerMobile: {
    flexDirection: 'column',
    gap: 10,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  appTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  appTitleTablet: {
    fontSize: 26,
    lineHeight: 30,
  },
  appSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: '#64748b',
    maxWidth: 720,
  },
  langPicker: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    padding: 3,
    gap: 6,
  },
  langPickerMobile: {
    alignSelf: 'flex-start',
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  langBtnText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
  },
  shell: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  shellInner: {
    flex: 1,
    padding: 12,
    gap: 12,
  },
  controlsCol: {
    gap: 12,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  contextPill: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  contextPillText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  resultsCol: {
    flex: 1,
    minHeight: 0,
    gap: 10,
  },
  resultsTitleMinimal: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: '#0f172a',
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
  complianceFooter: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  complianceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  complianceBody: {
    fontSize: 12,
    lineHeight: 17,
    color: '#334155',
  },
  noPhiBody: {
    fontSize: 12,
    lineHeight: 17,
    color: '#b91c1c',
    fontWeight: '700',
  },
  complianceActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  linkBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  linkBtnText: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
  },
  modalWarn: {
    fontSize: 13,
    lineHeight: 19,
    color: '#b91c1c',
    fontWeight: '700',
  },
  modalButton: {
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
