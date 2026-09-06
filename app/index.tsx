import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Head from 'expo-router/head';
import SiteChrome from './components/SiteChrome';
import TrustBar from './components/TrustBar';
import { colors, radii, shadows, typography } from './constants/theme';

const GITHUB_URL = 'https://github.com/nadavWeisler/MedCodeTranslator';

const FEATURES = [
  { titleKey: 'site_feature_explain_title', bodyKey: 'site_feature_explain_body' },
  { titleKey: 'site_feature_offline_title', bodyKey: 'site_feature_offline_body' },
  { titleKey: 'site_feature_multi_title', bodyKey: 'site_feature_multi_body' },
] as const;

const STATS = [
  { value: '11', labelKey: 'site_stat_schemes' },
  { value: '105k+', labelKey: 'site_stat_entries' },
  { value: '9', labelKey: 'site_stat_languages' },
] as const;

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function openGithub() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(GITHUB_URL, '_blank', 'noopener,noreferrer');
  }
}

export default function LandingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    q?: string | string[];
    scheme?: string | string[];
    lang?: string | string[];
    code?: string | string[];
    mode?: string | string[];
  }>();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  useEffect(() => {
    const hasDeepLink =
      firstParam(params.q) ||
      firstParam(params.scheme) ||
      firstParam(params.code) ||
      firstParam(params.mode);
    if (hasDeepLink) {
      router.replace({
        pathname: '/app',
        params: {
          q: firstParam(params.q),
          scheme: firstParam(params.scheme),
          lang: firstParam(params.lang),
          code: firstParam(params.code),
          mode: firstParam(params.mode),
        },
      });
    }
  }, [params, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Head>
        <title>MedCode Clinical — Open-Source Clinical Terminology Lookup</title>
        <meta
          name="description"
          content="MIT-licensed, offline multi-vocabulary search across ICD-10, ATC, LOINC (subset), HCPCS, and related coding systems — with a visible score and match method on every result."
        />
      </Head>
      <SiteChrome>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={[styles.heroGrid, isWide && styles.heroGridWide]}>
              <View style={styles.heroCopy}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t('site_hero_badge')}</Text>
                </View>
                <Text style={styles.heroTitle}>{t('site_hero_title')}</Text>
                <Text style={styles.heroSubtitle}>{t('site_hero_subtitle')}</Text>
                <TrustBar
                  items={[
                    t('trust_verified_sources'),
                    t('trust_offline'),
                    t('trust_no_phi'),
                  ]}
                />
                <View style={styles.ctaRow}>
                  <TouchableOpacity style={styles.ctaPrimary} onPress={() => router.push('/app')}>
                    <Text style={styles.ctaPrimaryText}>{t('site_cta_launch')}</Text>
                  </TouchableOpacity>
                  {Platform.OS === 'web' ? (
                    <TouchableOpacity style={styles.ctaSecondary} onPress={openGithub}>
                      <Text style={styles.ctaSecondaryText}>{t('site_cta_github')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View style={styles.heroPanel}>
                <Text style={styles.panelLabel}>{t('site_panel_label')}</Text>
                <Text style={styles.panelTitle}>{t('site_panel_title')}</Text>
                <Text style={styles.panelBody}>{t('site_panel_body')}</Text>
                <View style={styles.statGrid}>
                  {STATS.map(stat => (
                    <View key={stat.labelKey} style={styles.statCard}>
                      <Text style={styles.statValue}>{stat.value}</Text>
                      <Text style={styles.statLabel}>{t(stat.labelKey)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('site_features_title')}</Text>
            <View style={[styles.featureGrid, isWide && styles.featureGridWide]}>
              {FEATURES.map(feature => (
                <View key={feature.titleKey} style={styles.featureCard}>
                  <Text style={styles.featureTitle}>{t(feature.titleKey)}</Text>
                  <Text style={styles.featureBody}>{t(feature.bodyKey)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.ossTeaser}>
              <Text style={styles.ossTitle}>{t('site_oss_teaser_title')}</Text>
              <Text style={styles.ossBody}>{t('site_oss_teaser_body')}</Text>
              <View style={styles.ctaRow}>
                {Platform.OS === 'web' ? (
                  <TouchableOpacity style={styles.ctaSecondaryOnDark} onPress={openGithub}>
                    <Text style={styles.ctaSecondaryOnDarkText}>{t('site_cta_github')}</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.ctaGhost} onPress={() => router.push('/about')}>
                  <Text style={styles.ctaGhostText}>{t('site_cta_learn_more')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SiteChrome>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.pageBg },
  scroll: {
    paddingBottom: 40,
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  heroGrid: {
    gap: 24,
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
  },
  heroGridWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  heroCopy: {
    flex: 1,
    gap: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tealLight,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.tealMuted,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.tealDark,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    color: colors.navy,
    ...(typography.fontFamily ? { fontFamily: typography.fontFamily } : {}),
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.textSecondary,
    maxWidth: 560,
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  ctaPrimary: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingHorizontal: 20,
    paddingVertical: 14,
    ...shadows.card,
  },
  ctaPrimaryText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  ctaSecondary: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  ctaSecondaryText: {
    color: colors.tealDark,
    fontSize: 15,
    fontWeight: '700',
  },
  ctaSecondaryOnDark: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  ctaSecondaryOnDarkText: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '700',
  },
  ctaGhost: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  ctaGhostText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
  heroPanel: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 22,
    gap: 10,
    ...shadows.card,
  },
  panelLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.navy,
  },
  panelBody: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  statCard: {
    minWidth: '45%',
    flexGrow: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: 14,
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.navy,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 16,
  },
  featureGrid: {
    gap: 12,
  },
  featureGridWide: {
    flexDirection: 'row',
  },
  featureCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 18,
    gap: 8,
    ...shadows.card,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  },
  featureBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  ossTeaser: {
    backgroundColor: colors.navy,
    borderRadius: radii.xl,
    padding: 24,
    gap: 12,
  },
  ossTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textInverse,
  },
  ossBody: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.82)',
  },
});
