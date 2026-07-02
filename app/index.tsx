import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
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
import SchemeTabs, {
  SCHEMES,
  getSchemeGroup,
  isPrimaryScheme,
  collapseToPrimaryScheme,
} from './components/SchemeTabs';
import BrandMark from './components/BrandMark';
import TrustBar from './components/TrustBar';
import { isRTL as checkRTL } from './services/rtl';
import type { SchemeKey } from '../db/database';
import { buildIndex, search as layeredSearch, getSuggestions, getDidYouMean, isIndexReady } from './services/fuzzySearch';
import type { ScoredEntry } from '@medcode/core';
import { useSelectedCodeResult } from './services/useSelectedCodeResult';
import { useCodeConversions } from './services/useCodeConversions';
import i18n from '../i18n';
import { DATASET_METADATA_GENERATED_AT, DATASET_SOURCES, formatDateLabel, getCoverageI18n, isDemoCoverage, getSchemeSourceMetadata } from './services/sourceMetadata';
import { spacing } from './constants/spacing';
import { colors, radii, shadows, typography } from './constants/theme';
import { getSearchExamples } from './constants/searchExamples';

type Language = 'en' | 'he' | 'es' | 'fr' | 'de' | 'ar' | 'pt' | 'zh' | 'ru';
const LANGUAGES: { code: Language; label: string; name: string }[] = [
  { code: 'en', label: '🇺🇸', name: 'English' },
  { code: 'he', label: '🇮🇱', name: 'Hebrew' },
  { code: 'es', label: '🇪🇸', name: 'Spanish' },
  { code: 'fr', label: '🇫🇷', name: 'French' },
  { code: 'de', label: '🇩🇪', name: 'German' },
  { code: 'ar', label: '🇸🇦', name: 'Arabic' },
  { code: 'pt', label: '🇧🇷', name: 'Portuguese' },
  { code: 'zh', label: '🇨🇳', name: 'Chinese' },
  { code: 'ru', label: '🇷🇺', name: 'Russian' },
];
const DISCLAIMER_ACK_KEY = 'medcodetranslator:disclaimer-ack:v1';
const RECENT_SEARCHES_KEY = 'medcodetranslator:recent-searches:v1';
const MAX_RECENT_SEARCHES = 8;
const HEADER_Z_INDEX = 2;
const SHELL_Z_INDEX = 1;

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
  const initialLang: Language =
    initialLangParam && LANGUAGES.some(l => l.code === initialLangParam)
      ? (initialLangParam as Language)
      : 'en';

  const [showAllSchemes, setShowAllSchemes] = useState(() => !isPrimaryScheme(initialScheme));
  const [scheme, setScheme] = useState<SchemeKey>(initialScheme);
  const [query, setQuery] = useState(firstParam(params.q) ?? '');
  const [results, setResults] = useState<ScoredEntry[]>([]);
  const [didYouMean, setDidYouMean] = useState<ScoredEntry[]>([]);
  const [ghostText, setGhostText] = useState<string | undefined>();
  const [lang, setLang] = useState<Language>(initialLang);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSchemeLoading, setIsSchemeLoading] = useState(() => !isIndexReady(initialScheme));
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isMobile = !isTablet;
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeScheme = SCHEMES.find(s => s.key === scheme)!;
  const activeSchemeGroup = getSchemeGroup(scheme);
  const selectedLanguage = LANGUAGES.find(l => l.code === lang)!;
  const { selectedCode, metadataRows, selectEntry } = useSelectedCodeResult(results);
  const { groups: conversionGroups, loading: conversionsLoading } = useCodeConversions(
    scheme,
    selectedCode,
    { primaryOnly: !showAllSchemes }
  );
  const isRTL = checkRTL(lang);

  useEffect(() => {
    if (!showAllSchemes && !isPrimaryScheme(scheme)) {
      setShowAllSchemes(true);
    }
  }, [scheme, showAllSchemes]);

  useEffect(() => {
    i18n.changeLanguage(lang);
  }, [lang]);

  useEffect(() => {
    AsyncStorage.getItem(DISCLAIMER_ACK_KEY)
      .then(value => { if (!value) setShowDisclaimer(true); })
      .catch(() => setShowDisclaimer(true));

    AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      .then(raw => { if (raw) setRecentSearches(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const previousBodyBackground = document.body.style.backgroundColor;
    const previousBodyFontFamily = document.body.style.fontFamily;
    const previousHtmlBackground = document.documentElement.style.backgroundColor;

    document.documentElement.style.backgroundColor = colors.pageBg;
    document.documentElement.style.height = '100%';
    document.body.style.backgroundColor = colors.pageBg;
    document.body.style.height = '100%';
    document.body.style.overflow = 'hidden';

    const fontId = 'clinical-fonts';
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@500;600&display=swap';
      document.head.appendChild(link);
    }

    document.body.style.fontFamily = typography.fontFamily ?? 'system-ui, sans-serif';

    return () => {
      document.documentElement.style.backgroundColor = previousHtmlBackground;
      document.documentElement.style.height = '';
      document.body.style.backgroundColor = previousBodyBackground;
      document.body.style.height = '';
      document.body.style.overflow = '';
      document.body.style.fontFamily = previousBodyFontFamily;
    };
  }, []);

  // Build fuse index when scheme changes; track loading for UX indicator
  useEffect(() => {
    if (isIndexReady(scheme)) {
      setIsSchemeLoading(false);
      return;
    }
    setIsSchemeLoading(true);
    buildIndex(scheme)
      .catch(console.error)
      .finally(() => setIsSchemeLoading(false));
  }, [scheme]);

  // Run search + autocomplete on query change
  const runSearch = useCallback(
    async (q: string, s: SchemeKey, l: Language) => {
      // Ensure index is ready (no-op if already built)
      await buildIndex(s).catch(console.error);

      // Autocomplete suggestions (for ghost text hint)
      const suggestions_ = getSuggestions(q, s, 5);

      // Ghost text: top suggestion that starts with current query
      const ghost = suggestions_.find(e => {
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

      // Layered retrieval: exact → prefix → substring → fuzzy
      const data = layeredSearch(q, s, 20);
      setResults(data);

      // "Did you mean" only when layered search returns nothing
      if (data.length === 0) {
        setDidYouMean(getDidYouMean(q, s, 3));
      } else {
        setDidYouMean([]);
        // Persist non-empty query to recent searches
        if (q.trim().length >= 2) {
          setRecentSearches(prev => {
            const next = [q.trim(), ...prev.filter(r => r !== q.trim())].slice(0, MAX_RECENT_SEARCHES);
            AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(() => {});
            return next;
          });
        }
      }
    },
    []
  );

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(query, scheme, lang), 200);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, scheme, lang, runSearch]);

  const openConversion = (targetScheme: SchemeKey, targetCode: string) => {
    if (!isPrimaryScheme(targetScheme)) {
      setShowAllSchemes(true);
    }
    setScheme(targetScheme);
    setQuery(targetCode);
    setDidYouMean([]);
    setGhostText(undefined);
  };

  const toggleShowAllSchemes = () => {
    setShowAllSchemes(prev => {
      const next = !prev;
      if (!next && !isPrimaryScheme(scheme)) {
        setScheme(collapseToPrimaryScheme(scheme));
        setQuery('');
        setResults([]);
        setDidYouMean([]);
        setGhostText(undefined);
      }
      return next;
    });
  };

  const switchScheme = (s: SchemeKey) => {
    setScheme(s);
    setQuery('');
    setResults([]);
    setDidYouMean([]);
    setGhostText(undefined);
  };

  const handleSuggestionSelect = (item: ScoredEntry) => {
    const name = lang === 'he' && item.name_he ? item.name_he : item.name_en;
    setQuery(name);
    selectEntry(item);
  };

  const handleQuickSearch = (q: string) => {
    setQuery(q);
  };

  const handleLanguageChange = (l: Language) => {
    setLang(l);
    setShowLanguageDropdown(false);
  };

  const acknowledgeDisclaimer = async () => {
    try {
      await AsyncStorage.setItem(DISCLAIMER_ACK_KEY, 'accepted');
    } catch (error) {
      console.warn('Failed to persist disclaimer acknowledgement', error);
    } finally {
      setShowDisclaimer(false);
    }
  };

  const schemeColor = activeScheme.color;
  const directionalText = isRTL ? styles.textRight : styles.textLeft;
  const schemeCoverage = getCoverageI18n(scheme);
  const schemeSourceMeta = getSchemeSourceMetadata(scheme);
  const isDemoScheme = isDemoCoverage(schemeSourceMeta);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        style={[
          styles.page,
          {
            paddingHorizontal: isTablet ? spacing.xl : spacing.lg,
            paddingTop: Platform.OS === 'web' ? (isTablet ? 28 : 18) : spacing.md,
          },
        ]}
      >
        <View style={[styles.header, isMobile && styles.headerMobile]}>
          <View style={styles.headerCopy}>
            <BrandMark
              compact={isMobile}
              subtitle={t('hero_subtitle')}
              align={isRTL ? 'right' : 'left'}
            />
            <TrustBar
              items={[
                t('trust_verified_sources'),
                t('trust_offline'),
                t('trust_no_phi'),
              ]}
            />
          </View>

          <View style={[styles.langPickerWrap, isMobile && styles.langPickerWrapMobile]}>
            <TouchableOpacity
              style={[
                styles.langPicker,
                isMobile && styles.langPickerMobile,
                showLanguageDropdown && { borderColor: colors.teal },
              ]}
              onPress={() => setShowLanguageDropdown(prev => !prev)}
              accessibilityLabel={`Select language, ${selectedLanguage.name}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: showLanguageDropdown }}
            >
              <Text style={styles.langPickerValue}>
                <Text importantForAccessibility="no">{selectedLanguage.label} </Text>
                <Text>{selectedLanguage.name}</Text>
              </Text>
              <Text
                importantForAccessibility="no"
                style={[styles.langPickerChevron, showLanguageDropdown && { color: colors.teal }]}
              >
                ▾
              </Text>
            </TouchableOpacity>

            {showLanguageDropdown ? (
              <View
                style={[
                  styles.langDropdown,
                  isMobile && styles.langDropdownMobile,
                  { borderColor: colors.borderLight },
                ]}
              >
                {LANGUAGES.map(l => (
                  <TouchableOpacity
                    key={l.code}
                    style={[
                      styles.langOption,
                      lang === l.code && { backgroundColor: colors.tealLight },
                    ]}
                    onPress={() => handleLanguageChange(l.code)}
                    accessibilityLabel={l.name}
                    accessibilityRole="button"
                    accessibilityState={{ selected: lang === l.code }}
                  >
                    <Text
                      style={[
                        styles.langOptionText,
                        lang === l.code && { color: colors.teal },
                      ]}
                    >
                      <Text importantForAccessibility="no">{l.label} </Text>
                      <Text>{l.name}</Text>
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
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
                showAll={showAllSchemes}
                onToggleShowAll={toggleShowAllSchemes}
                showAllLabel={t('schemes_show_all')}
                showPrimaryLabel={t('schemes_show_primary')}
              />

              <SearchBar
                value={query}
                onChangeText={setQuery}
                placeholder={t('search_placeholder_generic', { schemeLabel: activeScheme.shortLabel })}
                ghostText={ghostText}
                schemeColor={schemeColor}
                lang={lang}
              />

              <View style={styles.contextRow}>
                <View style={[styles.contextPill, { backgroundColor: `${schemeColor}10`, borderColor: `${schemeColor}30` }]}>
                  <Text style={[styles.contextPillText, { color: schemeColor }]}>{activeScheme.shortLabel}</Text>
                </View>
                <View style={styles.contextPillMuted}>
                  <Text style={styles.contextPillMutedText}>{activeSchemeGroup.label}</Text>
                </View>
                {(scheme === 'icd9' || scheme === 'icd10') ? (
                  <View style={styles.contextPillMuted}>
                    <Text style={styles.contextPillMutedText}>{t('conversions_title')}</Text>
                  </View>
                ) : null}
                {schemeCoverage ? (
                  <View
                    style={[
                      styles.contextPill,
                      isDemoScheme
                        ? { backgroundColor: colors.demoBg, borderColor: colors.demoBorder }
                        : { backgroundColor: colors.successBg, borderColor: colors.successBorder },
                    ]}
                  >
                    <Text
                      style={[
                        styles.contextPillText,
                        { color: isDemoScheme ? colors.demo : colors.success },
                      ]}
                    >
                      {t(schemeCoverage.key, {
                        count: schemeCoverage.count,
                        countFormatted: schemeCoverage.count.toLocaleString('en-US'),
                      })}
                    </Text>
                  </View>
                ) : null}
                {schemeCoverage?.updated ? (
                  <View style={styles.contextPillMuted}>
                    <Text style={styles.contextPillMutedText}>
                      {t('coverage_updated', { date: schemeCoverage.updated })}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.resultsCol}>
              <View style={styles.resultsTitleWrap}>
                <Text style={styles.resultsTitleMinimal}>
                  {t(query.trim() ? 'results_title_active' : 'results_title_idle')}
                </Text>
              </View>
              {isSchemeLoading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color={schemeColor} />
                  <Text style={[styles.loadingText, { color: schemeColor }]}>
                    Loading {activeScheme.label}…
                  </Text>
                </View>
              ) : (
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
                  conversionGroups={conversionGroups}
                  conversionsLoading={conversionsLoading}
                  onOpenConversion={openConversion}
                  recentSearches={recentSearches}
                  exampleSearches={getSearchExamples(scheme)}
                  onQuickSearch={handleQuickSearch}
                />
              )}
            </View>
          </View>
        </View>

        {isMobile ? (
          <View style={styles.complianceFooterCompact}>
            <Text style={styles.complianceFooterCompactLabel} numberOfLines={1}>{t('footer_info_title')}</Text>
            <View style={styles.complianceActionsCompact}>
              <TouchableOpacity onPress={() => router.push('/about')}>
                <Text style={styles.linkBtnTextCompact}>{t('footer_about')}</Text>
              </TouchableOpacity>
              <Text style={styles.complianceSep}>·</Text>
              <TouchableOpacity onPress={() => router.push('/legal/terms')}>
                <Text style={styles.linkBtnTextCompact}>{t('footer_terms')}</Text>
              </TouchableOpacity>
              <Text style={styles.complianceSep}>·</Text>
              <TouchableOpacity onPress={() => router.push('/legal/privacy')}>
                <Text style={styles.linkBtnTextCompact}>{t('footer_privacy')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.complianceFooter}>
            <Text style={[styles.complianceTitle, directionalText]}>{t('footer_info_title')}</Text>
            <Text style={[styles.complianceBody, directionalText]}>
              {t('footer_info_body')}
            </Text>
            <Text style={[styles.noPhiBody, directionalText]}>
              {t('footer_phi_warning')}
            </Text>
            <Text style={[styles.complianceBody, directionalText]}>
              {t('footer_updated', { date: formatDateLabel(DATASET_METADATA_GENERATED_AT) })}
            </Text>
            <View style={styles.complianceActions}>
              <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/about')}>
                <Text style={styles.linkBtnText}>{t('footer_about')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/legal/terms')}>
                <Text style={styles.linkBtnText}>{t('footer_terms')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/legal/privacy')}>
                <Text style={styles.linkBtnText}>{t('footer_privacy')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <Modal
        visible={showDisclaimer}
        transparent
        animationType="fade"
        onRequestClose={acknowledgeDisclaimer}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('modal_safety_title')}</Text>
            <Text style={styles.modalBody}>{t('modal_safety_body_1')}</Text>
            <Text style={styles.modalBody}>{t('modal_safety_body_2')}</Text>
            <Text style={styles.modalBody}>{t('modal_safety_body_3')}</Text>
            <Text style={styles.modalWarn}>{t('modal_safety_phi')}</Text>
            <Text style={styles.modalBody}>
              {t('modal_safety_sources', { count: DATASET_SOURCES.length })}
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={acknowledgeDisclaimer}>
              <Text style={styles.modalButtonText}>{t('modal_safety_ack')}</Text>
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
    backgroundColor: colors.pageBg,
  },
  page: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
    paddingBottom: 18,
    gap: 14,
  },
  header: {
    position: 'relative',
    zIndex: HEADER_Z_INDEX,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 12,
  },
  langPickerWrap: {
    position: 'relative',
  },
  langPickerWrapMobile: {
    alignSelf: 'stretch',
  },
  langPicker: {
    minWidth: 148,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...shadows.card,
  },
  langPickerMobile: {
    alignSelf: 'flex-start',
  },
  langPickerValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  langPickerChevron: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '700',
  },
  langDropdown: {
    position: 'absolute',
    top: 46,
    right: 0,
    marginTop: 6,
    minWidth: 180,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    padding: spacing.xs,
    ...shadows.dropdown,
    zIndex: 30,
  },
  langDropdownMobile: {
    left: 0,
    right: 0,
    minWidth: 0,
    padding: spacing.sm,
  },
  langOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  langOptionText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  shell: {
    flex: 1,
    minHeight: 0,
    zIndex: SHELL_Z_INDEX,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadows.card,
  },
  shellInner: {
    flex: 1,
    minHeight: 0,
    padding: spacing.lg,
    gap: 14,
  },
  controlsCol: {
    flexShrink: 0,
    gap: 12,
    zIndex: 20,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  contextPill: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  contextPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  contextPillMuted: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  contextPillMutedText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  resultsCol: {
    flex: 1,
    minHeight: 0,
    gap: 10,
  },
  resultsTitleWrap: {
    backgroundColor: colors.surface,
    zIndex: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: 8,
  },
  resultsTitleMinimal: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
  complianceFooterCompact: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...shadows.card,
  },
  complianceFooterCompactLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    flexShrink: 1,
  },
  complianceActionsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  complianceSep: {
    fontSize: 11,
    color: colors.textMuted,
  },
  linkBtnTextCompact: {
    fontSize: 11,
    color: colors.teal,
    fontWeight: '700',
  },
  complianceFooter: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: 8,
    ...shadows.card,
  },
  complianceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  complianceBody: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  noPhiBody: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.danger,
    fontWeight: '600',
  },
  complianceActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  linkBtn: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.tealMuted,
    backgroundColor: colors.tealLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  linkBtnText: {
    fontSize: 12,
    color: colors.tealDark,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    gap: 10,
    ...shadows.dropdown,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: -0.2,
  },
  modalBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  modalWarn: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.danger,
    fontWeight: '600',
  },
  modalButton: {
    marginTop: 6,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignSelf: 'flex-start',
  },
  modalButtonText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
});
